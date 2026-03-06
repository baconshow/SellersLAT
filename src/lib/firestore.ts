import {
  collection, doc, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp,
  type Unsubscribe, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type { Project, ProjectPhase, WeeklyUpdate } from '@/types'
import { DEFAULT_PHASES } from '@/types'
import { differenceInDays, addDays } from 'date-fns'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function distributePhases(startDate: string, endDate: string): ProjectPhase[] {
  const total = differenceInDays(new Date(endDate), new Date(startDate)) || 1
  const perPhase = Math.floor(total / DEFAULT_PHASES.length)

  return DEFAULT_PHASES.map((p, i) => {
    const phaseStart = addDays(new Date(startDate), i * perPhase)
    const phaseEnd = i === DEFAULT_PHASES.length - 1
      ? new Date(endDate)
      : addDays(phaseStart, perPhase - 1)
    return {
      ...p,
      id: generateId(),
      startDate: phaseStart.toISOString(),
      endDate: phaseEnd.toISOString(),
      status: i === 0 ? 'in_progress' : 'pending',
    } as ProjectPhase
  })
}

export async function createProject(
  userId: string,
  data: {
    clientName: string
    clientColor: string
    clientColorSecondary: string
    clientColorRgb: string
    startDate: string
    endDate: string
    phases?: ProjectPhase[]
    clientLogo?: string
    mascotImageUrl?: string
  }
): Promise<string> {
  const phases = data.phases?.length ? data.phases : distributePhases(data.startDate, data.endDate)

  const payload = {
    userId,
    clientName: data.clientName,
    clientColor: data.clientColor,
    clientColorSecondary: data.clientColorSecondary,
    clientColorRgb: data.clientColorRgb,
    clientLogo: data.clientLogo ?? '',
    mascotImageUrl: data.mascotImageUrl ?? '',
    startDate: data.startDate,
    endDate: data.endDate,
    phases,
    weeklyUpdates: [],
    currentPhaseId: phases[0].id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const colRef = collection(db, 'projects')
  const promise = addDoc(colRef, payload)
  
  promise.catch(async (err) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: colRef.path,
      operation: 'create',
      requestResourceData: payload
    }))
  })

  const ref = await promise
  return ref.id
}

export function subscribeToProjects(
  userId: string,
  cb: (projects: Project[]) => void
): Unsubscribe {
  const colRef = collection(db, 'projects')
  const q = query(colRef, where('userId', '==', userId))
  
  return onSnapshot(q, 
    snap => {
      const projects = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
      projects.sort((a, b) => {
        const timeA = (a.createdAt as unknown as Timestamp)?.seconds || 0
        const timeB = (b.createdAt as unknown as Timestamp)?.seconds || 0
        return timeB - timeA
      })
      cb(projects)
    },
    async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: colRef.path,
        operation: 'list'
      }))
    }
  )
}

export function subscribeToProject(
  id: string,
  cb: (project: Project | null) => void
): Unsubscribe {
  const docRef = doc(db, 'projects', id)
  return onSnapshot(docRef, 
    snap => {
      cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Project) : null)
    },
    async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'get'
      }))
    }
  )
}

export async function getProject(id: string): Promise<Project | null> {
  const docRef = doc(db, 'projects', id)
  try {
    const snap = await getDoc(docRef)
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Project) : null
  } catch (err) {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'get'
    }))
    throw err
  }
}

export async function updateProject(
  id: string,
  data: Partial<Project>
): Promise<void> {
  const docRef = doc(db, 'projects', id)
  updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  }).catch(async (err) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: data
    }))
  })
}

export async function deleteProject(id: string): Promise<void> {
  const docRef = doc(db, 'projects', id)
  deleteDoc(docRef).catch(async (err) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete'
    }))
  })
}

export async function addWeeklyUpdate(
  projectId: string,
  update: {
    weekNumber: number
    date: string
    distributorsTotal: number
    distributorsIntegrated: number
    distributorsPending: number
    distributorsBlocked: number
    highlights: string[]
    blockers: string[]
    nextSteps: string[]
    aiSummary?: string
  }
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId)
  const snap = await getDoc(projectRef)
  
  if (!snap.exists()) throw new Error('Projeto não encontrado')
  
  const currentUpdates = snap.data().weeklyUpdates || []
  const newUpdate: WeeklyUpdate = {
    ...update,
    id: generateId()
  }

  const dataToUpdate = {
    weeklyUpdates: [...currentUpdates, newUpdate],
    updatedAt: serverTimestamp()
  }

  updateDoc(projectRef, dataToUpdate).catch(async (err) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: projectRef.path,
      operation: 'update',
      requestResourceData: dataToUpdate
    }))
  })
}

export async function updatePhases(
  projectId: string,
  phases: ProjectPhase[]
): Promise<void> {
  const docRef = doc(db, 'projects', projectId)
  const data = {
    phases,
    updatedAt: serverTimestamp()
  }
  updateDoc(docRef, data).catch(async (err) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: data
    }))
  })
}

import {
  collection, doc, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  type Unsubscribe, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type { Project, ProjectPhase, WeeklyUpdate } from '@/types'
import { DEFAULT_PHASES } from '@/types'
import { differenceInDays, addDays } from 'date-fns'

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
    clientLogo?: string
    mascotImageUrl?: string
  }
): Promise<string> {
  const phases = distributePhases(data.startDate, data.endDate)

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

  const ref = await addDoc(collection(db, 'projects'), payload)
  return ref.id
}

export function subscribeToProjects(
  userId: string,
  cb: (projects: Project[]) => void
): Unsubscribe {
  // Simplified query to avoid index requirement (orderBy + where requires composite index)
  const q = query(
    collection(db, 'projects'),
    where('userId', '==', userId)
  )
  return onSnapshot(q, snap => {
    const projects = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
    
    // Client-side sorting by createdAt
    projects.sort((a, b) => {
      const timeA = (a.createdAt as unknown as Timestamp)?.seconds || 0
      const timeB = (b.createdAt as unknown as Timestamp)?.seconds || 0
      return timeB - timeA
    })
    
    cb(projects)
  })
}

export function subscribeToProject(
  id: string,
  cb: (project: Project | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'projects', id), snap => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Project) : null)
  })
}

export async function getProject(id: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, 'projects', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Project) : null
}

export async function updateProject(
  id: string,
  data: Partial<Project>
): Promise<void> {
  await updateDoc(doc(db, 'projects', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteProject(id: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', id))
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

  await updateDoc(projectRef, {
    weeklyUpdates: [...currentUpdates, newUpdate],
    updatedAt: serverTimestamp()
  })
}

export async function updatePhases(
  projectId: string,
  phases: ProjectPhase[]
): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    phases,
    updatedAt: serverTimestamp()
  })
}

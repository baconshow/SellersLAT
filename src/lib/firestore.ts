import {
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
    query, where, orderBy, onSnapshot, serverTimestamp, Timestamp,
    type Unsubscribe
  } from 'firebase/firestore'
  import { db } from './firebase'
  import type { Project, ProjectPhase, WeeklyUpdate } from '@/types'
  import { DEFAULT_PHASES } from '@/types'
  import { addDays, differenceInDays } from 'date-fns'
  
  
  // ─── Projects ────────────────────────────────────────────────────────────────
  
  export async function createProject(
    userId: string,
    data: {
      clientName: string
      clientColor: string
      clientColorSecondary: string
      clientColorRgb: string
      clientLogo?: string
      mascotImageUrl?: string
      startDate: string
      endDate: string
    }
  ): Promise<string> {
    const totalDays = differenceInDays(new Date(data.endDate), new Date(data.startDate))
    const daysPerPhase = Math.floor(totalDays / DEFAULT_PHASES.length)
  
    const phases: ProjectPhase[] = DEFAULT_PHASES.map((p, i) => {
      const phaseStart = addDays(new Date(data.startDate), i * daysPerPhase)
      const phaseEnd = i === DEFAULT_PHASES.length - 1
        ? new Date(data.endDate)
        : addDays(phaseStart, daysPerPhase - 1)
      return {
        ...p,
        id: crypto.randomUUID(),
        startDate: phaseStart.toISOString(),
        endDate: phaseEnd.toISOString(),
        status: i === 0 ? 'in_progress' : 'pending',
      }
    })
  
    const ref = await addDoc(collection(db, 'projects'), {
      userId,
      ...data,
      phases,
      weeklyUpdates: [],
      currentPhaseId: phases[0].id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  
    return ref.id
  }
  
  export function subscribeToProjects(userId: string, cb: (p: Project[]) => void): Unsubscribe {
    const q = query(collection(db, 'projects'), where('userId', '==', userId), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)))
    })
  }
  
  export function subscribeToProject(id: string, cb: (p: Project | null) => void): Unsubscribe {
    return onSnapshot(doc(db, 'projects', id), snap => {
      cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Project) : null)
    })
  }
  
  export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
    await updateDoc(doc(db, 'projects', id), { ...data, updatedAt: serverTimestamp() })
  }
  
  export async function deleteProject(id: string): Promise<void> {
    await deleteDoc(doc(db, 'projects', id))
  }
  
  // ─── Weekly Updates ───────────────────────────────────────────────────────────
  
  export async function addWeeklyUpdate(projectId: string, update: Omit<WeeklyUpdate, 'id'>): Promise<void> {
    const ref = doc(db, 'projects', projectId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const project = snap.data() as Project
    const updates = project.weeklyUpdates || []
    await updateDoc(ref, {
      weeklyUpdates: [...updates, { ...update, id: crypto.randomUUID() }],
      updatedAt: serverTimestamp(),
    })
  }
  
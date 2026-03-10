import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, limit as firestoreLimit,
  arrayUnion, arrayRemove,
  type Unsubscribe, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type { Project, ProjectPhase, WeeklyUpdate, Distributor, DistributorSnapshot, DistributorHistoryEntry, DistributorComment, ProjectMessage } from '@/types'
import { DEFAULT_PHASES, generateDistributorId } from '@/types'
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
    phases?: ProjectPhase[]
    clientLogo?: string
    mascotImageUrl?: string
  },
  userEmail?: string
): Promise<string> {
  const phases = data.phases?.length ? data.phases : distributePhases(data.startDate, data.endDate)

  const payload = {
    userId,
    ownerId: userId,
    members: userEmail ? [userEmail] : [],
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
    distributors: [],
    currentPhaseId: phases[0].id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, 'projects'), payload)
  return ref.id
}

export function subscribeToProjects(
  userId: string,
  userEmail: string | null,
  cb: (projects: Project[]) => void
): Unsubscribe {
  const col = collection(db, 'projects')

  // Query 1: projetos onde sou owner (ownerId ou legado userId)
  const qOwner = query(col, where('userId', '==', userId))

  // Query 2: projetos onde sou membro (por email)
  const qMember = userEmail
    ? query(col, where('members', 'array-contains', userEmail))
    : null

  let ownerDocs: Project[] = []
  let memberDocs: Project[] = []

  const merge = () => {
    const map = new Map<string, Project>()
    for (const p of ownerDocs) map.set(p.id, p)
    for (const p of memberDocs) if (!map.has(p.id)) map.set(p.id, p)
    const projects = Array.from(map.values())
    projects.sort((a, b) => {
      const timeA = (a.createdAt as unknown as Timestamp)?.seconds || 0
      const timeB = (b.createdAt as unknown as Timestamp)?.seconds || 0
      return timeB - timeA
    })
    cb(projects)
  }

  const unsub1 = onSnapshot(qOwner, snap => {
    ownerDocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
    merge()
  })

  const unsub2 = qMember
    ? onSnapshot(qMember, snap => {
        memberDocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
        merge()
      })
    : () => {}

  return () => { unsub1(); unsub2() }
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function addProjectMember(projectId: string, email: string): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    members: arrayUnion(email),
    updatedAt: serverTimestamp(),
  })
}

export async function removeProjectMember(projectId: string, email: string): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    members: arrayRemove(email),
    updatedAt: serverTimestamp(),
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

  const data = snap.data()
  const currentUpdates = data.weeklyUpdates || []
  const distributors: Distributor[] = data.distributors || []

  // Snapshot do estado atual dos distribuidores
  const distributorSnapshots: DistributorSnapshot[] = distributors.map(d => ({
    id:                 d.id,
    name:               d.name,
    status:             d.status,
    notes:              d.notes,
    connectionType:     d.connectionType,
    responsible:        d.responsible,
    blockerDescription: d.blockerDescription,
  }))

  const newUpdate: WeeklyUpdate = {
    ...update,
    id: generateId(),
    distributorSnapshots,
  }

  await updateDoc(projectRef, {
    weeklyUpdates: [...currentUpdates, newUpdate],
    updatedAt: serverTimestamp(),
  })
}

export async function updatePhases(
  projectId: string,
  phases: ProjectPhase[]
): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    phases,
    updatedAt: serverTimestamp(),
  })
}

// ─── Distributors ─────────────────────────────────────────────────────────────

export async function addDistributor(
  projectId: string,
  data: Omit<Distributor, 'id'>
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId)
  const snap = await getDoc(projectRef)
  if (!snap.exists()) throw new Error('Projeto não encontrado')

  const current: Distributor[] = snap.data().distributors || []
  const newDistributor: Distributor = { ...data, id: generateId() }

  await updateDoc(projectRef, {
    distributors: [...current, newDistributor],
    updatedAt: serverTimestamp(),
  })
}

export async function updateDistributor(
  projectId: string,
  distributorId: string,
  data: Partial<Omit<Distributor, 'id'>>
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId)
  const snap = await getDoc(projectRef)
  if (!snap.exists()) throw new Error('Projeto não encontrado')

  const current: Distributor[] = snap.data().distributors || []
  const updated = current.map(d =>
    d.id === distributorId ? { ...d, ...data } : d
  )

  await updateDoc(projectRef, {
    distributors: updated,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDistributor(
  projectId: string,
  distributorId: string
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId)
  const snap = await getDoc(projectRef)
  if (!snap.exists()) throw new Error('Projeto não encontrado')

  const current: Distributor[] = snap.data().distributors || []
  const filtered = current.filter(d => d.id !== distributorId)

  await updateDoc(projectRef, {
    distributors: filtered,
    updatedAt: serverTimestamp(),
  })
}

export async function updateDistributors(
  projectId: string,
  distributors: Distributor[]
): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    distributors,
    updatedAt: serverTimestamp(),
  })
}
// ─── Distributor History ──────────────────────────────────────────────────────


export async function addDistributorHistory(
  projectId: string,
  entry: Omit<DistributorHistoryEntry, 'id' | 'timestamp'>
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId)
  const snap = await getDoc(projectRef)
  if (!snap.exists()) throw new Error('Projeto não encontrado')

  const current: DistributorHistoryEntry[] = snap.data().distributorHistory || []
  const newEntry: DistributorHistoryEntry = {
    ...entry,
    id:        generateId(),
    timestamp: new Date().toISOString(),
  }

  await updateDoc(projectRef, {
    distributorHistory: [...current, newEntry],
    updatedAt: serverTimestamp(),
  })
}

export async function restoreDistributorsFromHistory(
  projectId: string,
  entryId: string
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId)
  const snap = await getDoc(projectRef)
  if (!snap.exists()) throw new Error('Projeto não encontrado')

  const history: DistributorHistoryEntry[] = snap.data().distributorHistory || []
  const entry = history.find(e => e.id === entryId)
  if (!entry) throw new Error('Entrada de histórico não encontrada')

  // Salva backup do estado atual antes de restaurar
  const current: Distributor[] = snap.data().distributors || []
  const backupEntry: DistributorHistoryEntry = {
    id:          generateId(),
    type:        'manual_edit',
    timestamp:   new Date().toISOString(),
    source:      'pre_restore_backup',
    distributors: current,
    note:        `Backup automático antes de restaurar entrada ${entryId}`,
  }

  await updateDoc(projectRef, {
    distributors:       entry.distributors,
    distributorHistory: [...history, backupEntry],
    updatedAt:          serverTimestamp(),
  })
}

// ─── Share / Compartilhamento ────────────────────────────────────────────────

export async function generateShareToken(projectId: string): Promise<string> {
  const projectRef = doc(db, 'projects', projectId)
  const snap = await getDoc(projectRef)
  if (!snap.exists()) throw new Error('Projeto não encontrado')

  const data = snap.data()
  const token = crypto.randomUUID()

  // Gera slug a partir do clientName se ainda não existir
  const slug = data.slug || data.clientName
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  await updateDoc(projectRef, {
    shareToken: token,
    shareEnabled: true,
    slug,
    updatedAt: serverTimestamp(),
  })
  return token
}

export async function toggleShare(projectId: string, enabled: boolean): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    shareEnabled: enabled,
    updatedAt: serverTimestamp(),
  })
}

export async function updateAuthorizedEmails(projectId: string, emails: string[]): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    authorizedEmails: emails,
    updatedAt: serverTimestamp(),
  })
}

export async function getProjectByShareToken(projectId: string, token: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, 'projects', projectId))
  if (!snap.exists()) return null

  const data = snap.data()
  if (data.shareEnabled !== true || data.shareToken !== token) return null

  return { id: snap.id, ...data } as Project
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const q = query(
    collection(db, 'projects'),
    where('slug', '==', slug),
    where('shareEnabled', '==', true),
    firestoreLimit(1),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Project
}

// ─── Distributors (subcoleção) ────────────────────────────────────────────────

export function subscribeToDistributorsCollection(
  projectId: string,
  cb: (distributors: Distributor[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'projects', projectId, 'distributors'),
    orderBy('name', 'asc'),
  )
  return onSnapshot(q, snap => {
    const distributors = snap.docs.map(d => ({ id: d.id, ...d.data() } as Distributor))
    cb(distributors)
  })
}

export async function upsertDistributorDoc(
  projectId: string,
  data: Omit<Distributor, 'id'>
): Promise<string> {
  const id = generateDistributorId(data.name, data.cnpj)
  const ref = doc(db, 'projects', projectId, 'distributors', id)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    // Atualiza campos mas PRESERVA comentários e hasUnreadComment
    const existing = snap.data()
    await updateDoc(ref, {
      ...data,
      hasUnreadComment: existing.hasUnreadComment ?? false,
      updatedAt: serverTimestamp(),
    })
  } else {
    // Cria novo com ID estável
    await setDoc(ref, {
      ...data,
      id,
      hasUnreadComment: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
  return id
}

/** @deprecated Use upsertDistributorDoc — mantida para compatibilidade */
export async function addDistributorDoc(
  projectId: string,
  data: Omit<Distributor, 'id'>
): Promise<string> {
  return upsertDistributorDoc(projectId, data)
}

export async function updateDistributorDoc(
  projectId: string,
  distributorId: string,
  data: Partial<Omit<Distributor, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId, 'distributors', distributorId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDistributorDoc(
  projectId: string,
  distributorId: string
): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId, 'distributors', distributorId))
}

// ─── Comments (subcoleção de distributor) ────────────────────────────────────

export async function getDistributorComments(
  projectId: string,
  distributorId: string
): Promise<DistributorComment[]> {
  const q = query(
    collection(db, 'projects', projectId, 'distributors', distributorId, 'comments'),
    orderBy('timestamp', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DistributorComment))
}

export async function addDistributorCommentDoc(
  projectId: string,
  distributorId: string,
  comment: { name: string; email: string; text: string }
): Promise<void> {
  // Adiciona o comentário na subcoleção
  await addDoc(
    collection(db, 'projects', projectId, 'distributors', distributorId, 'comments'),
    {
      email: comment.email,
      name: comment.name,
      text: comment.text,
      timestamp: new Date().toISOString(),
    }
  )

  // Marca hasUnreadComment no doc do distribuidor
  await updateDoc(
    doc(db, 'projects', projectId, 'distributors', distributorId),
    { hasUnreadComment: true }
  )
}

export async function markCommentsAsReadCollection(projectId: string): Promise<void> {
  const snap = await getDocs(collection(db, 'projects', projectId, 'distributors'))
  const updates = snap.docs
    .filter(d => d.data().hasUnreadComment === true)
    .map(d => updateDoc(d.ref, { hasUnreadComment: false }))
  await Promise.all(updates)
}

// ─── Comentários de Gestores (legado — array embutido) ──────────────────────

export async function addDistributorComment(
  projectId: string,
  distributorId: string,
  comment: { name: string; email: string; text: string }
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId)
  const snap = await getDoc(projectRef)
  if (!snap.exists()) throw new Error('Projeto não encontrado')

  const distributors: Distributor[] = snap.data().distributors || []
  const updated = distributors.map(d => {
    if (d.id !== distributorId) return d

    const newComment: DistributorComment = {
      id: crypto.randomUUID(),
      email: comment.email,
      name: comment.name,
      text: comment.text,
      timestamp: new Date().toISOString(),
    }

    return {
      ...d,
      comments: [...(d.comments || []), newComment],
      hasUnreadComment: true,
    }
  })

  await updateDoc(projectRef, {
    distributors: updated,
    updatedAt: serverTimestamp(),
  })
}

export async function markCommentsAsRead(projectId: string): Promise<void> {
  const projectRef = doc(db, 'projects', projectId)
  const snap = await getDoc(projectRef)
  if (!snap.exists()) throw new Error('Projeto não encontrado')

  const distributors: Distributor[] = snap.data().distributors || []
  const updated = distributors.map(d => ({
    ...d,
    hasUnreadComment: false,
  }))

  await updateDoc(projectRef, {
    distributors: updated,
    updatedAt: serverTimestamp(),
  })
}

// ─── Import CSV Semanal ──────────────────────────────────────────────────────

export async function importWeeklyCSV(
  projectId: string,
  distributors: Omit<Distributor, 'id'>[],
  weekNumber: number
): Promise<{
  added: number
  updated: number
  integrated: number
  pending: number
  blocked: number
  diff: {
    newIntegrations: string[]
    newBlockers: string[]
    resolved: string[]
  }
}> {
  // 1. Busca distribuidores atuais da subcoleção
  const currentSnap = await getDocs(
    collection(db, 'projects', projectId, 'distributors')
  )
  const currentDocs = currentSnap.docs.map(d => ({
    docId: d.id,
    ...(d.data() as Omit<Distributor, 'id'>),
  }))

  // Mapa por nome (lowercase) para lookup rápido
  const currentByName = new Map<string, typeof currentDocs[number]>(
    currentDocs.map(d => [d.name.toLowerCase(), d])
  )

  // 2. Processa cada distribuidor do CSV
  let added = 0
  let updated = 0
  const diff = {
    newIntegrations: [] as string[],
    newBlockers: [] as string[],
    resolved: [] as string[],
  }

  const operations: Promise<void>[] = []

  for (const csvDist of distributors) {
    const key = csvDist.name.toLowerCase()
    const existing = currentByName.get(key)

    if (existing) {
      // Calcula diff de status
      const oldStatus = existing.status
      const newStatus = csvDist.status

      if (oldStatus !== 'integrated' && newStatus === 'integrated') {
        diff.newIntegrations.push(csvDist.name)
      }
      if (oldStatus !== 'blocked' && newStatus === 'blocked') {
        diff.newBlockers.push(csvDist.name)
      }
      if (oldStatus === 'blocked' && newStatus !== 'blocked') {
        diff.resolved.push(csvDist.name)
      }

      // Update existente
      operations.push(
        updateDistributorDoc(projectId, existing.docId, {
          status: csvDist.status,
          connectionType: csvDist.connectionType,
          responsible: csvDist.responsible,
          notes: csvDist.notes,
          blockerDescription: csvDist.blockerDescription,
          solution: csvDist.solution,
          erp: csvDist.erp,
          cnpj: csvDist.cnpj,
          valuePerConnection: csvDist.valuePerConnection,
          palliative: csvDist.palliative,
          connectionCategory: csvDist.connectionCategory,
        })
      )
      updated++
    } else {
      // Novo distribuidor — todos os novos com status integrated contam como newIntegration
      if (csvDist.status === 'integrated') {
        diff.newIntegrations.push(csvDist.name)
      }
      if (csvDist.status === 'blocked') {
        diff.newBlockers.push(csvDist.name)
      }

      operations.push(
        upsertDistributorDoc(projectId, csvDist).then(() => {})
      )
      added++
    }
  }

  await Promise.all(operations)

  // 3. Recarrega subcoleção para counts finais
  const finalSnap = await getDocs(
    collection(db, 'projects', projectId, 'distributors')
  )
  const finalDists = finalSnap.docs.map(d => d.data() as Omit<Distributor, 'id'>)

  const integrated = finalDists.filter(d => d.status === 'integrated').length
  const pending = finalDists.filter(d => d.status === 'pending').length
  const blocked = finalDists.filter(d => d.status === 'blocked').length
  const total = finalDists.length

  // 4. Salva weekly update
  await addWeeklyUpdate(projectId, {
    weekNumber,
    date: new Date().toISOString(),
    distributorsTotal: total,
    distributorsIntegrated: integrated,
    distributorsPending: pending,
    distributorsBlocked: blocked,
    highlights: diff.newIntegrations.map(n => `${n} integrado com sucesso`),
    blockers: diff.newBlockers.map(n => `${n} entrou em bloqueio`),
    nextSteps: [],
    aiSummary: '',
  })

  // 5. Marca lastImportAt no projeto
  await updateDoc(doc(db, 'projects', projectId), {
    lastImportAt: serverTimestamp(),
  })

  return {
    added,
    updated,
    integrated,
    pending,
    blocked,
    diff,
  }
}

// ─── Messages (subcoleção projects/{id}/messages) ────────────────────────────
// Regra Firestore: members podem ler/escrever messages
// allow read, write: if request.auth != null &&
//   get(/databases/.../projects/$(projectId)).data.members
//   .hasAny([request.auth.token.email]);

export function subscribeToProjectMessages(
  projectId: string,
  callback: (messages: ProjectMessage[]) => void,
  limit = 20
): Unsubscribe {
  const q = query(
    collection(db, 'projects', projectId, 'messages'),
    orderBy('timestamp', 'desc'),
    firestoreLimit(limit)
  )
  return onSnapshot(q, snap => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectMessage))
    callback(msgs.reverse())
  })
}

export async function addProjectMessage(
  projectId: string,
  author: { email: string; name: string },
  text: string,
  type: 'user' | 'activity' = 'user'
): Promise<void> {
  await addDoc(collection(db, 'projects', projectId, 'messages'), {
    type,
    authorEmail: author.email,
    authorName: author.name,
    text,
    timestamp: serverTimestamp(),
    projectId,
  })
}

export async function logProjectActivity(
  projectId: string,
  text: string
): Promise<void> {
  await addProjectMessage(
    projectId,
    { email: 'system@sellers.lat', name: 'LAT' },
    text,
    'activity'
  )
}
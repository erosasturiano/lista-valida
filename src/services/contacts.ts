import pb from '@/lib/pocketbase/client'

export type RoleCategory =
  | 'C-Level'
  | 'Diretoria'
  | 'Gerência'
  | 'Coordenação'
  | 'Analista'
  | 'Assistente/Auxiliar'
  | 'Estagiário'
  | 'Consultor/Autônomo'
  | 'Outro'
export type RSVPStatus = 'Aguardando' | 'Confirmou' | 'Recusou'
export type ClassificationStatus = 'Pendente' | 'Classificado' | 'Revisado'
export type PriorityLevel = 'Alta' | 'Média' | 'Baixa'

export interface ContactRecord {
  id: string
  event: string
  name: string
  email: string
  phone?: string
  company?: string
  raw_role?: string
  cnpj?: string
  rsvp?: RSVPStatus
  has_degree?: 'Sim' | 'Não'
  classification_status?: ClassificationStatus
  role_category?: RoleCategory
  priority?: PriorityLevel
  interests?: string[]
  demands?: string[]
  profile_summary?: string
  suggested_message?: string
  notes?: string
  last_classified_at?: string
  created: string
  updated: string
  expand?: {
    event?: { name: string }
  }
}

export const getContacts = async (
  eventId?: string,
  filterStr?: string,
): Promise<ContactRecord[]> => {
  const filters: string[] = []
  if (eventId) filters.push(`event = "${eventId}"`)
  if (filterStr) filters.push(filterStr)
  return pb.collection('mailing_contacts').getFullList<ContactRecord>({
    sort: '-created',
    filter: filters.length > 0 ? filters.join(' && ') : undefined,
    expand: 'event',
  })
}

export const getContact = async (id: string): Promise<ContactRecord> => {
  return pb.collection('mailing_contacts').getOne<ContactRecord>(id, { expand: 'event' })
}

export const createContact = async (data: Partial<ContactRecord>): Promise<ContactRecord> => {
  const userId = pb.authStore.record?.id
  return pb.collection('mailing_contacts').create<ContactRecord>({ ...data, owner: userId })
}

export const updateContact = async (
  id: string,
  data: Partial<ContactRecord>,
): Promise<ContactRecord> => {
  return pb.collection('mailing_contacts').update<ContactRecord>(id, data)
}

export const deleteContact = async (id: string): Promise<boolean> => {
  return pb.collection('mailing_contacts').delete(id)
}

export const classifyContact = async (id: string): Promise<ContactRecord> => {
  return pb.send(`/backend/v1/classify-contact/${id}`, { method: 'POST' })
}

export interface ImportResult {
  imported: number
  skipped: number
  blocked: number
  errors: Array<{ row: number; reason: string }>
  imported_ids?: string[]
}

export const importContacts = async (
  eventId: string,
  contacts: Array<{
    name: string
    email: string
    phone?: string
    company?: string
    raw_role?: string
    cnpj?: string
    rsvp?: string
    has_degree?: string
    notes?: string
  }>,
  allowDuplicates?: boolean,
): Promise<ImportResult> => {
  return pb.send('/backend/v1/import-contacts', {
    method: 'POST',
    body: JSON.stringify({ event_id: eventId, contacts, allow_duplicates: allowDuplicates }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export interface SearchHit {
  id: string
  name: string
  email: string
  company?: string
  raw_role?: string
  role_category?: string
  _distance?: number
}

export const searchContacts = async (
  query: string,
  eventId?: string,
): Promise<{ items: SearchHit[] }> => {
  return pb.send('/backend/v1/search-contacts', {
    method: 'POST',
    body: JSON.stringify({ query, event_id: eventId }),
    headers: { 'Content-Type': 'application/json' },
  })
}

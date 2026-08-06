import supabase from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/supabase/current-user'

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
  const { data, error } = await supabase
    .from('mailing_contacts')
    .select(`${SELECT}, event:events(name)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return mapRow(data)
}

export const createContact = async (data: Partial<ContactRecord>): Promise<ContactRecord> => {
  const userId = pb.authStore.record?.id
  return pb.collection('mailing_contacts').create<ContactRecord>({ ...data, owner: userId })
}

export const updateContact = async (
  id: string,
  data: Partial<ContactRecord>,
): Promise<ContactRecord> => {
  const { data: row, error } = await supabase
    .from('mailing_contacts')
    .update(toPatch(data))
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return mapRow(row)
}

export const deleteContact = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('mailing_contacts').delete().eq('id', id)
  if (error) throw error
  return true
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
  const { data, error } = await supabase.functions.invoke<ImportResult>('import-contacts', {
    body: { event_id: eventId, contacts, allow_duplicates: allowDuplicates },
  })
  if (error) throw error
  return data as ImportResult
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
  if (error) throw error
  return data as { items: SearchHit[] }
}

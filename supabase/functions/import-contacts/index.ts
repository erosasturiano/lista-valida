// Fase 2: porta pocketbase/hooks/import_contacts.js. Mesma logica de
// deduplicacao (por e-mail dentro do lote e contra contatos existentes do
// mesmo evento), mas grava via supabase-js — RLS garante owner_id =
// auth.uid() (with check da policy de insert).

import { getUser } from '../_shared/auth.ts'

interface ImportRow {
  name?: string
  email?: string
  phone?: string
  company?: string
  raw_role?: string
  rsvp?: string
  has_degree?: string
}

interface ImportBody {
  event_id: string
  contacts: ImportRow[]
  allow_duplicates?: boolean
}

type Supabase = Awaited<ReturnType<typeof getUser>>['supabase']

Deno.serve(async (req: Request) => {
  try {
    const { supabase, user } = await getUser(req)
    const body = (await req.json()) as ImportBody
    const validationError = validateBody(body)
    if (validationError) return jsonResponse({ error: validationError }, 400)

    const result = await importAll(supabase, user.id, body)
    return jsonResponse(result)
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 401)
  }
})

async function importAll(supabase: Supabase, ownerId: string, body: ImportBody) {
  const imported: string[] = []
  const errors: Array<{ row: number; reason: string }> = []
  const seen = new Set<string>()
  let skipped = 0

  for (let i = 0; i < body.contacts.length; i++) {
    const row = normalizeRow(body.contacts[i])
    const rowError = validateRow(row)
    if (rowError) {
      errors.push({ row: i + 1, reason: rowError })
      continue
    }

    if (seen.has(row.email) && !body.allow_duplicates) {
      skipped++
      continue
    }
    seen.add(row.email)

    if (!body.allow_duplicates && (await existsContact(supabase, body.event_id, row.email))) {
      skipped++
      continue
    }

    const insertError = await insertContact(supabase, ownerId, body.event_id, row, imported)
    if (insertError) errors.push({ row: i + 1, reason: insertError })
  }

  return { imported: imported.length, skipped, errors, imported_ids: imported }
}

async function insertContact(
  supabase: Supabase,
  ownerId: string,
  eventId: string,
  row: ReturnType<typeof normalizeRow>,
  imported: string[],
): Promise<string | null> {
  const { data, error } = await supabase
    .from('mailing_contacts')
    .insert({
      owner_id: ownerId,
      event_id: eventId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      raw_role: row.raw_role,
      rsvp: row.rsvp,
      has_degree: row.has_degree || null,
      classification_status: 'Pendente',
      priority: 'Média',
    })
    .select('id')
    .single()

  if (error) return error.message
  imported.push(data.id)
  return null
}

function validateBody(body: ImportBody): string | null {
  if (!body?.event_id) return 'ID do evento é obrigatório'
  if (!Array.isArray(body.contacts) || body.contacts.length === 0) {
    return 'Nenhum contato enviado para importação'
  }
  return null
}

function normalizeRow(row: ImportRow) {
  const rsvpInput = (row.rsvp || '').trim().toLowerCase()
  const rsvp = rsvpInput.includes('confirm')
    ? 'Confirmou'
    : rsvpInput.includes('recus')
      ? 'Recusou'
      : 'Aguardando'

  const degreeInput = (row.has_degree || '').trim().toLowerCase()
  const hasDegree = degreeInput.startsWith('s') ? 'Sim' : degreeInput.startsWith('n') ? 'Não' : ''

  return {
    name: (row.name || '').trim(),
    email: (row.email || '').trim().toLowerCase(),
    phone: (row.phone || '').trim(),
    company: (row.company || '').trim(),
    raw_role: (row.raw_role || '').trim(),
    rsvp,
    has_degree: hasDegree,
  }
}

function validateRow(row: ReturnType<typeof normalizeRow>): string | null {
  if (!row.name) return 'Nome do participante ausente'
  if (!row.email || !row.email.includes('@')) return 'Endereço de e-mail inválido ou ausente'
  return null
}

async function existsContact(supabase: Supabase, eventId: string, email: string): Promise<boolean> {
  const { data } = await supabase
    .from('mailing_contacts')
    .select('id')
    .eq('event_id', eventId)
    .eq('email', email)
    .limit(1)
    .maybeSingle()
  return !!data
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

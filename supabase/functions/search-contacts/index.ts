// Fase 2: porta pocketbase/hooks/search_contacts.js sem a parte de IA
// ($vectors.search sobre embedding fica para a fase 2 de IA, fora de
// escopo aqui). Troca por ILIKE + pg_trgm (indices criados na migration
// 0001). RLS e a camada primaria de isolamento: admin ve tudo, usuario
// comum so os proprios contatos — sem filtro extra de owner_id aqui.

import { getUser } from '../_shared/auth.ts'

interface SearchBody {
  query: string
  event_id?: string
  k?: number
}

const MAX_RESULTS = 25

Deno.serve(async (req: Request) => {
  try {
    const { supabase } = await getUser(req)
    const body = (await req.json()) as SearchBody
    const query = (body.query || '').trim()
    if (!query) return jsonResponse({ error: 'Termo de busca é obrigatório' }, 400)

    const pattern = toIlikePattern(query)
    let request = supabase
      .from('mailing_contacts')
      .select('id, name, email, company, raw_role, role_category')
      .or(`email.ilike.${pattern},name.ilike.${pattern}`)
      .limit(Math.min(body.k || MAX_RESULTS, MAX_RESULTS))

    if (body.event_id) request = request.eq('event_id', body.event_id)

    const { data, error } = await request
    if (error) throw error

    return jsonResponse({ items: data ?? [] })
  } catch (_error) {
    return jsonResponse({ items: [] })
  }
})

// Escapa caracteres com significado especial no valor do filtro
// PostgREST (`,` e `()` delimitam a expressao do .or(), `%`/`_` sao
// coringas do ILIKE) antes de envolver em coringas de busca parcial.
function toIlikePattern(value: string): string {
  const escaped = value.replace(/[%_,()]/g, (char) => '\\' + char)
  return `%${escaped}%`
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

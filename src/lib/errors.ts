// Substitui src/lib/pocketbase/errors.ts (fase 7). O PocketBase devolvia
// um mapa de erros por campo pronto (`response.data.<campo>.message`); o
// Supabase nao tem equivalente - erros de Postgres vem como uma mensagem
// unica com codigo (PostgrestError) e os de auth como AuthError. Por
// isso extractFieldErrors passa a ser best-effort: so consegue apontar o
// campo em violacoes de unicidade/not-null, onde o nome da coluna aparece
// na mensagem do Postgres. Nos demais casos devolve {} e a tela cai no
// toast com getErrorMessage, que e o caminho principal em todas elas.

export type FieldErrors = Record<string, string>

interface SupabaseErrorShape {
  message?: unknown
  details?: unknown
  code?: unknown
}

function asSupabaseError(error: unknown): SupabaseErrorShape | null {
  if (!error || typeof error !== 'object') return null
  const e = error as SupabaseErrorShape
  return typeof e.message === 'string' ? e : null
}

// Colunas do schema que aparecem em mensagens de constraint do Postgres e
// tem um campo correspondente nos formularios. Ordem importa: as mais
// especificas vem primeiro, senao "email"/"name" casariam antes de
// "sender_email"/"sender_name" (sao substrings deles) e o erro seria
// atribuido ao campo errado no formulario.
const KNOWN_COLUMNS = ['sender_email', 'sender_name', 'email', 'name', 'subject', 'body', 'category']

// O Postgres nomeia a coluna de forma estruturada: `column "x"` em
// not-null e `Key (x)=` em unicidade. Ler dai e mais confiavel que varrer a
// mensagem inteira, porque o nome da tabela costuma conter o nome de outra
// coluna - "email_campaigns" contem "email", e a varredura atribuia o erro
// ao campo errado. Se a coluna estruturada nao tiver campo no formulario,
// devolve null e a tela cai no toast, que e o comportamento best-effort
// descrito no topo do arquivo.
function extractColumn(text: string): string | null {
  const estruturado = /column "([^"]+)"/.exec(text) ?? /key \(([^)]+)\)=/.exec(text)
  if (estruturado) {
    return KNOWN_COLUMNS.includes(estruturado[1]) ? estruturado[1] : null
  }
  return KNOWN_COLUMNS.find((c) => text.includes(c)) ?? null
}

export function extractFieldErrors(error: unknown): FieldErrors {
  const err = asSupabaseError(error)
  if (!err) return {}

  const text = `${err.message ?? ''} ${err.details ?? ''}`.toLowerCase()
  const column = extractColumn(text)
  if (!column) return {}

  // 23505 = unique_violation, 23502 = not_null_violation.
  if (err.code === '23505' || text.includes('duplicate key')) {
    return { [column]: 'Este valor já está cadastrado.' }
  }
  if (err.code === '23502') {
    return { [column]: 'Campo obrigatório.' }
  }
  return {}
}

export function getErrorMessage(error: unknown): string {
  const err = asSupabaseError(error)
  if (err?.message) return String(err.message)
  if (error instanceof Error) return error.message
  return 'Ocorreu um erro inesperado.'
}

// Fase 3: porta pocketbase/hooks/track_click.js. Publica (--no-verify-jwt).
// O id do email_logs vem via query string (?log=), nao via path param -
// mais robusto entre versoes do Edge Runtime do que depender de
// segmentos de path apos o nome da function.

import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const fallbackUrl = Deno.env.get('SITE_URL') || '/'

Deno.serve(async (req: Request) => {
  const params = new URL(req.url).searchParams
  const logId = params.get('log')
  const targetUrl = params.get('url') || fallbackUrl

  if (logId) {
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    await registerClick(supabase, logId)
  }

  return new Response(null, { status: 302, headers: { Location: targetUrl } })
})

async function registerClick(supabase: SupabaseClient, logId: string) {
  const { data: log } = await supabase
    .from('email_logs')
    .select('clicked_at, click_count')
    .eq('id', logId)
    .maybeSingle()
  if (!log) return

  await supabase
    .from('email_logs')
    .update({
      clicked_at: log.clicked_at ?? new Date().toISOString(),
      click_count: (log.click_count ?? 0) + 1,
    })
    .eq('id', logId)
}

import { createClient } from 'jsr:@supabase/supabase-js@2'

export async function getUser(req: Request) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
  )
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error('unauthorized')
  return { supabase, user: data.user }
}

export function isAdmin(user: { app_metadata?: Record<string, unknown> }): boolean {
  return user.app_metadata?.role === 'admin'
}

export function assertOwnerOrAdmin(
  user: { id: string; app_metadata?: Record<string, unknown> },
  ownerId: string,
): void {
  if (user.id !== ownerId && !isAdmin(user)) {
    throw new Error('forbidden')
  }
}

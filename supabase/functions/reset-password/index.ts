// POST /reset-password - passo 2 do "esqueci minha senha". Publica
// (--no-verify-jwt): a pessoa esta justamente sem conseguir entrar.
//
// Valida o token (existe, nao expirou, nao foi usado), troca a senha pela
// Admin API e consome o token. Ver forgot-password/index.ts para o motivo
// de o fluxo nao usar o recovery embutido do Supabase Auth.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Mesmo minimo do cadastro no frontend (src/services/auth.ts). Repetido
// aqui de proposito: validacao de cliente pode ser burlada.
const SENHA_MINIMA = 10

const MENSAGEM_TOKEN_INVALIDO =
  'Link inválido ou expirado. Solicite uma nova redefinição de senha.'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256(valor: string): Promise<string> {
  const dados = new TextEncoder().encode(valor)
  const hash = await crypto.subtle.digest('SHA-256', dados)
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

interface TokenRow {
  id: string
  uid: string
  expires_at: string
  used_at: string | null
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405)
  }

  try {
    const { token, password } = (await req.json()) as { token?: string; password?: string }

    if (!token) {
      return json({ error: MENSAGEM_TOKEN_INVALIDO }, 400)
    }
    if (!password || password.length < SENHA_MINIMA) {
      return json({ error: `A senha precisa ter no mínimo ${SENHA_MINIMA} caracteres.` }, 400)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const tokenHash = await sha256(token)

    const { data: linha } = await admin
      .from('password_reset_tokens')
      .select('id, uid, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle<TokenRow>()

    const valido = !!linha && linha.used_at === null && new Date(linha.expires_at) > new Date()
    if (!linha || !valido) {
      return json({ error: MENSAGEM_TOKEN_INVALIDO }, 400)
    }

    // O Supabase Auth guarda o hash da senha internamente. Em nenhum momento
    // ela e lida ou gravada em texto puro numa tabela nossa. updateUserById
    // tambem revoga as sessoes existentes do usuario.
    const { error: erroUpdate } = await admin.auth.admin.updateUserById(linha.uid, { password })
    if (erroUpdate) {
      console.error('reset-password: falha ao atualizar senha', erroUpdate.message)
      return json({ error: 'Não foi possível redefinir a senha. Tente novamente.' }, 500)
    }

    // Consome todos os tokens pendentes do usuario, nao so o usado: fecha a
    // janela de e-mails de redefinicao anteriores que ainda estivessem
    // validos depois da senha ja ter sido trocada.
    const { error: erroConsumo } = await admin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('uid', linha.uid)
      .is('used_at', null)

    if (erroConsumo) {
      console.error('reset-password: falha ao consumir token', erroConsumo.message)
    }

    return json({ message: 'Senha redefinida com sucesso.' })
  } catch (erro) {
    console.error('reset-password: erro inesperado', erro)
    return json({ error: 'Não foi possível redefinir a senha. Tente novamente.' }, 500)
  }
})

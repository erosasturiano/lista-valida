// POST /forgot-password - passo 1 do "esqueci minha senha". Publica
// (--no-verify-jwt): quem chama ainda nao tem sessao.
//
// Substitui supabase.auth.resetPasswordForEmail. O link do GoTrue passava
// pelo endpoint /auth/v1/verify, que so aceita redirect_to na lista de URLs
// permitidas (caindo em silencio na Site URL quando nao bate) e consome o
// token em qualquer GET - inclusive o de scanner de e-mail. Aqui o token
// viaja no fragmento (#token=), que nunca chega a servidor nenhum, e so e
// consumido no POST que troca a senha. Mesma estrutura do projeto Ritmo.
//
// A resposta e SEMPRE a mesma, exista ou nao o e-mail: quem responde
// diferente vira um oraculo para descobrir quem tem conta.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!
const siteUrl = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '')
const remetente = Deno.env.get('RESET_FROM') || 'Lista Válida <naoresponda@listavalida.com.br>'

const TOKEN_BYTES = 32
const EXPIRACAO_MINUTOS = 30
// Espera minima entre dois e-mails para o mesmo usuario: evita reenvio por
// duplo clique e spam na caixa de entrada sem precisar de infra dedicada.
const REENVIO_COOLDOWN_SEGUNDOS = 60
const JANELA_LIMITE_MINUTOS = 15
const MAX_TENTATIVAS = 5
const RETENCAO_LIMITE_HORAS = 24

const MENSAGEM_GENERICA =
  'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.'
const MENSAGEM_LIMITE = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function gerarToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256(valor: string): Promise<string> {
  const dados = new TextEncoder().encode(valor)
  const hash = await crypto.subtle.digest('SHA-256', dados)
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

// x-forwarded-for pode trazer varios IPs encadeados por proxy; o primeiro e
// o do cliente original.
function obterIp(req: Request): string {
  const encaminhado = req.headers.get('x-forwarded-for')
  if (encaminhado) return encaminhado.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'desconhecido'
}

function montarHtml(link: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1D1A33;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 16px;font-size:20px;color:#1D1A33;">Redefinir sua senha</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
      Recebemos um pedido para redefinir a senha da sua conta na Lista Válida.
      O link abaixo vale por ${EXPIRACAO_MINUTOS} minutos e só pode ser usado uma vez.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${link}" style="display:inline-block;background:#1800AD;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;font-size:14px;">Redefinir minha senha</a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#64748b;">
      Se o botão não funcionar, copie e cole este endereço no navegador:
    </p>
    <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#1800AD;">${link}</p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px;">
      Se você não pediu isso, ignore este e-mail. Sua senha continua a mesma.
    </p>
  </div>
</body></html>`
}

function montarTexto(link: string): string {
  return [
    'Redefinir sua senha na Lista Válida',
    '',
    `Este link vale por ${EXPIRACAO_MINUTOS} minutos e só pode ser usado uma vez:`,
    link,
    '',
    'Se você não pediu isso, ignore este e-mail. Sua senha continua a mesma.',
  ].join('\n')
}

async function enviarEmail(destino: string, link: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: remetente,
      to: destino,
      subject: 'Redefinir sua senha na Lista Válida',
      html: montarHtml(link),
      text: montarTexto(link),
    }),
  })
  if (!res.ok) {
    throw new Error(`Resend respondeu ${res.status}: ${await res.text()}`)
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405)
  }

  try {
    const { email } = (await req.json()) as { email?: string }
    // O formato do e-mail nao e segredo, entao pode ser recusado de verdade.
    // Ja a existencia da conta nunca aparece na resposta.
    if (!email || !FORMATO_EMAIL.test(email.trim())) {
      return json({ error: 'Informe um e-mail válido.' }, 400)
    }

    const normalizado = email.trim().toLowerCase()
    const admin = createClient(supabaseUrl, serviceRoleKey)
    const ip = obterIp(req)

    // Limpeza oportunista, sem cron dedicado.
    const corte = new Date(Date.now() - RETENCAO_LIMITE_HORAS * 3600 * 1000).toISOString()
    await admin.from('password_reset_rate_limits').delete().lt('created_at', corte)

    // O limite e checado antes de qualquer trabalho que dependa da conta
    // existir, para que um 429 tambem nao denuncie nada.
    const inicioJanela = new Date(Date.now() - JANELA_LIMITE_MINUTOS * 60 * 1000).toISOString()
    const { count } = await admin
      .from('password_reset_rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', inicioJanela)

    if ((count ?? 0) >= MAX_TENTATIVAS) {
      return json({ error: MENSAGEM_LIMITE }, 429)
    }

    await admin.from('password_reset_rate_limits').insert({ ip })

    const { data: uid } = await admin.rpc('find_user_id_by_email', { p_email: normalizado })

    if (uid) {
      const { data: recente } = await admin
        .from('password_reset_tokens')
        .select('created_at')
        .eq('uid', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const emCooldown =
        !!recente &&
        Date.now() - new Date(recente.created_at).getTime() < REENVIO_COOLDOWN_SEGUNDOS * 1000

      if (!emCooldown) {
        const tokenBruto = gerarToken()
        const tokenHash = await sha256(tokenBruto)
        const expiraEm = new Date(Date.now() + EXPIRACAO_MINUTOS * 60 * 1000).toISOString()

        const { error: erroInsert } = await admin
          .from('password_reset_tokens')
          .insert({ uid, token_hash: tokenHash, expires_at: expiraEm })

        if (erroInsert) {
          // Sem token gravado nao ha como validar depois, entao nao envia.
          // A resposta ao cliente segue igual mesmo assim.
          console.error('forgot-password: falha ao gravar token', erroInsert.message)
        } else {
          // Fragmento (#) e nao query (?): fragmento nao e enviado ao
          // servidor, entao o token nao aparece em log de acesso nem e
          // consumido por scanner de e-mail que apenas abre o link.
          const link = `${siteUrl}/redefinir-senha#token=${tokenBruto}`
          try {
            await enviarEmail(normalizado, link)
          } catch (erroEmail) {
            console.error('forgot-password: falha ao enviar e-mail', erroEmail)
          }
        }
      }
    }

    return json({ message: MENSAGEM_GENERICA })
  } catch (erro) {
    console.error('forgot-password: erro inesperado', erro)
    // Nem um erro interno pode variar a resposta de forma observavel.
    return json({ message: MENSAGEM_GENERICA })
  }
})

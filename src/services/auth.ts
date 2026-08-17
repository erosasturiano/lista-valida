import supabase from '@/lib/supabase/client'

export interface ForgotPasswordResponse {
  message: string
}

// Fonte unica do minimo de senha, usada no cadastro e na redefinicao. Os
// dois fluxos tinham o numero escrito separadamente e divergiram (10 no
// cadastro, 8 na redefinicao), o que permitia driblar a regra mais forte
// pedindo recuperacao logo apos criar a conta.
export const SENHA_MINIMA = 10

// Fase 5 (reconciliacao): substitui pocketbase/hooks/forgot_password.js
// (gerava senha aleatoria e mandava em texto puro por e-mail). O padrao
// do Supabase e por link - o e-mail leva para /redefinir-senha
// (src/pages/ResetPassword.tsx), onde a pessoa escolhe a propria senha.

// A origem do link vem do ambiente, nao de window.location.origin. O
// Supabase so aceita redirect_to que esteja na lista de URLs permitidas do
// projeto e, quando rejeita, troca em silencio pela Site URL - foi assim
// que links com localhost:3000 (o padrao de fabrica do Supabase) chegaram a
// usuarios reais. Para testar o fluxo apontando pro dev local, defina
// VITE_SITE_URL no .env.local, que nao e versionado.
function resolveSiteUrl(): string {
  const configurada = import.meta.env.VITE_SITE_URL
  if (configurada) return configurada.replace(/\/$/, '')
  return window.location.origin
}

export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${resolveSiteUrl()}/redefinir-senha`,
  })
  if (error) throw error

  return {
    message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.',
  }
}

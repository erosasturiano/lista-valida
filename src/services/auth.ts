import supabase from '@/lib/supabase/client'

export interface ForgotPasswordResponse {
  message: string
}

// Fonte unica do minimo de senha, usada no cadastro e na redefinicao. Os
// dois fluxos tinham o numero escrito separadamente e divergiram (10 no
// cadastro, 8 na redefinicao), o que permitia driblar a regra mais forte
// pedindo recuperacao logo apos criar a conta. A Edge Function
// reset-password repete a checagem, porque validacao de cliente e burlavel.
export const SENHA_MINIMA = 10

// A redefinicao NAO usa mais supabase.auth.resetPasswordForEmail. O link do
// GoTrue passa pelo endpoint /auth/v1/verify, que so aceita redirect_to
// presente na lista de URLs permitidas do projeto e, quando nao bate, cai em
// silencio na Site URL - foi assim que links apontando para localhost:3000
// chegaram a usuarios reais. O mesmo endpoint tambem consome o token de uso
// unico em qualquer GET, entao scanner de e-mail queimava o link antes da
// pessoa clicar (erro otp_expired).
//
// O fluxo atual e proprio (mesma estrutura do projeto Ritmo): as Edge
// Functions forgot-password e reset-password geram e validam o token, e o
// e-mail sai pelo Resend. O token viaja no fragmento da URL (#token=), que
// nunca chega a servidor nenhum, e so e consumido no POST que troca a senha.

export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
  const { data, error } = await supabase.functions.invoke<ForgotPasswordResponse>(
    'forgot-password',
    { body: { email } },
  )
  if (error) throw error

  return {
    message:
      data?.message ??
      'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.',
  }
}

export interface ResetPasswordResponse {
  message: string
}

export const resetPassword = async (
  token: string,
  password: string,
): Promise<ResetPasswordResponse> => {
  const { data, error } = await supabase.functions.invoke<ResetPasswordResponse>('reset-password', {
    body: { token, password },
  })
  if (error) throw error

  return { message: data?.message ?? 'Senha redefinida com sucesso.' }
}

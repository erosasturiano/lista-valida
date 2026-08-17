import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { BrandLogoStacked } from '@/components/ui/logo'
import { SENHA_MINIMA, resetPassword } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import supabase from '@/lib/supabase/client'

// O token chega no fragmento da URL (#token=), gravado la pela Edge Function
// forgot-password. Fragmento nao e enviado ao servidor: nao aparece em log de
// acesso e nao e consumido por scanner de e-mail que so abre o link.
//
// O caminho por sessao do Supabase continua aceito como reserva, para
// links de recovery do GoTrue que ainda estejam validos (por exemplo os
// disparados pelo painel do Supabase).
export default function ResetPassword() {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(null)
  const [temSessao, setTemSessao] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkErro, setLinkErro] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const ready = !!token || temSessao

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setTemSessao(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setTemSessao(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))

    const recebido = params.get('token')
    if (recebido) {
      setToken(recebido)
      // Tira o token da barra de enderecos para nao sobrar no historico do
      // navegador nem em captura de tela.
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    // Fluxo antigo do GoTrue devolvia o motivo da falha no proprio hash.
    const codigo = params.get('error_code')
    if (!codigo) return
    if (codigo === 'otp_expired') {
      setLinkErro('Este link expirou ou já foi usado. Solicite um novo em "Esqueci minha senha".')
      return
    }
    setLinkErro(params.get('error_description') || 'Não foi possível validar este link.')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // Mesmo minimo do cadastro (src/pages/Index.tsx). Com 8 aqui, dava para
    // driblar a regra de 10: cadastrar, pedir redefinicao e trocar por uma
    // senha mais curta.
    if (password.length < SENHA_MINIMA) {
      setError(`A senha precisa ter no mínimo ${SENHA_MINIMA} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setSubmitting(true)
    try {
      if (token) {
        await resetPassword(token, password)
      } else {
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
      }
      setDone(true)
    } catch {
      setError('Não foi possível redefinir sua senha. O link pode ter expirado — solicite um novo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 gap-6">
        <BrandLogoStacked className="h-20" />
        <Card className="max-w-md w-full border-slate-200 shadow-md">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">Senha redefinida</h1>
            <p className="text-sm text-slate-600">Sua senha foi atualizada com sucesso. Entre com a nova senha.</p>
            <Button
              onClick={() => navigate('/app')}
              className="w-full bg-brand-blue-600 hover:bg-brand-blue-700 text-white"
            >
              Ir para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 gap-6">
      <BrandLogoStacked className="h-20" />
      <Card className="max-w-md w-full border-slate-200 shadow-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Definir nova senha
          </CardTitle>
          <CardDescription>Escolha uma nova senha para acessar sua conta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkErro && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertDescription>{linkErro}</AlertDescription>
            </Alert>
          )}
          {!ready && !linkErro && (
            <Alert className="py-2 text-xs">
              <AlertDescription>
                Abra esta página a partir do link enviado por e-mail. Se você chegou aqui direto, o
                link pode ter expirado.
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Nova senha
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 text-sm"
                  minLength={SENHA_MINIMA}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                A senha deve ter no mínimo {SENHA_MINIMA} caracteres.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                Confirmar nova senha
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="text-sm"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-blue-600 hover:bg-brand-blue-700 text-white font-semibold"
            >
              {submitting ? 'Salvando...' : 'Redefinir senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { CheckCircle, Eye, EyeOff, Lock, Mail, User, ArrowRight, ArrowLeft } from 'lucide-react'
import { BrandLogoStacked } from '@/components/ui/logo'
import { SENHA_MINIMA } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getErrorMessage } from '@/lib/errors'

export default function Index() {
  const { isAuthenticated, signIn, signUp, loading } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(email, password)
        if (err) setError('Credenciais inválidas. Verifique seu e-mail e senha.')
        else navigate('/dashboard')
      } else {
        const { error: err } = await signUp(email, password, name)
        if (err) setError(getErrorMessage(err))
        else navigate('/dashboard')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50">
      {/* Left Panel - Branding (Desktop) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue-900/60 via-slate-900 to-brand-navy-950/70" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Variante branca: a marca colorida nao teria contraste sobre o
              slate-900 deste painel. */}
          <BrandLogoStacked variante="branco" className="h-16" />
        </div>

        <div className="relative z-10 max-w-lg my-auto py-12">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white mb-4">
            Automação de higienização de mailing para mailings (listas)
          </h1>{' '}
          <p className="text-slate-300 text-base leading-relaxed mb-8">
            Classifique cargos, identifique interesses reais e crie abordagens personalizadas com
            Inteligência Artificial para elevar a conversão dos seus eventos.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-brand-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-white">Classificação por IA</h4>
                <p className="text-xs text-slate-400">
                  Normalização automática de dados, interesses e demandas do perfil.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-brand-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-white">Perfis Personalizados</h4>
                <p className="text-xs text-slate-400">
                  Geração instantânea de mensagens customizadas para alcance direto.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-brand-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-white">Importação Simples em CSV</h4>
                <p className="text-xs text-slate-400">
                  Mapeamento dinâmico de colunas e validação inteligente de duplicados.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400 border-t border-slate-800 pt-6">
          © {new Date().getFullYear()} Lista Válida – Gestão Inteligente de Mailings (listas).
        </div>
      </div>

      {/* Right Panel - Auth Card */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:hidden">
            <BrandLogoStacked className="h-20 mx-auto mb-3" />
            <p className="text-xs text-slate-500">Higienização e Qualificação de Mailings</p>
          </div>

          <Card className="border-slate-200 shadow-md">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                {mode === 'signin' ? 'Acessar plataforma' : 'Criar nova conta'}
              </CardTitle>
              <CardDescription>
                {mode === 'signin'
                  ? 'Informe seu e-mail e senha para gerenciar seus mailings.'
                  : 'Preencha os dados abaixo para iniciar gratuitamente.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2 text-xs">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                      Nome completo
                    </Label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 text-sm"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    E-mail corporativo
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.email@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Senha
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
                  {mode === 'signup' && (
                    <p className="text-xs text-slate-500">
                      A senha deve ter no mínimo {SENHA_MINIMA} caracteres.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-brand-blue-600 to-brand-blue-700 hover:from-brand-blue-700 hover:to-brand-blue-800 text-white font-semibold shadow-sm text-sm h-10 gap-2"
                >
                  {submitting
                    ? 'Processando...'
                    : mode === 'signin'
                      ? 'Entrar'
                      : 'Criar minha conta'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
              <div className="space-y-3 pt-2 text-center">
                {mode === 'signin' && (
                  <Link
                    to="/esqueci-senha"
                    className="block text-xs text-slate-500 hover:text-brand-blue-600 font-medium transition-colors"
                  >
                    Esqueci minha senha
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin')
                    setError(null)
                  }}
                  className="text-xs text-slate-600 hover:text-brand-blue-600 font-medium underline"
                >
                  {mode === 'signin'
                    ? 'Não tem uma conta? Cadastre-se'
                    : 'Já possui conta? Faça login'}
                </button>
              </div>{' '}
            </CardContent>
          </Card>

          {/* pt no wrapper em vez de mt no botao: o container usa space-y-6,
              que ja aplica margin-top nos irmaos - um mt aqui competiria com
              ele. O padding soma sem conflito. */}
          <div className="pt-6">
            <Button
              asChild
              className="w-full bg-brand-blue-600 hover:bg-brand-blue-700 text-white font-semibold shadow-sm text-sm h-10"
            >
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para a página inicial
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

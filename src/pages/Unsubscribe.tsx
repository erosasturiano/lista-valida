import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2, MailX } from 'lucide-react'
import { BrandLogoStacked } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// unsubscribe-confirm e publica (--no-verify-jwt) e identifica o log via
// query string (?log=), nao path param - ver docs/migration-supabase.md
// secao 11.
async function confirmUnsubscribe(logId: string): Promise<void> {
  const url = `${FUNCTIONS_URL}/unsubscribe-confirm?log=${encodeURIComponent(logId)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  if (!res.ok) throw new Error('Falha na requisição de descadastro.')
}

export default function Unsubscribe() {
  const { logId } = useParams<{ logId: string }>()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!logId) return
    setStatus('loading')
    setError('')
    try {
      await confirmUnsubscribe(logId)
      setStatus('success')
    } catch {
      setStatus('error')
      setError('Não foi possível processar seu descadastro no momento. Tente novamente mais tarde.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 gap-6">
      <BrandLogoStacked className="h-20" />
      <Card className="max-w-md w-full border-slate-200 shadow-md">
        <CardContent className="p-8 text-center space-y-4">
          {status === 'success' ? (
            <>
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
              <h1 className="text-xl font-bold text-slate-900">Descadastro Confirmado</h1>
              <p className="text-sm text-slate-600">
                Você foi removido da nossa lista de contatos. Não enviaremos mais e-mails para você.
              </p>
            </>
          ) : status === 'error' ? (
            <>
              <AlertCircle className="w-14 h-14 text-red-500 mx-auto" />
              <h1 className="text-xl font-bold text-slate-900">Erro no Descadastro</h1>
              <p className="text-sm text-slate-600">{error}</p>
              <Button
                onClick={handleConfirm}
                className="mt-4 bg-brand-blue-600 hover:bg-brand-blue-700 text-white"
              >
                Tentar novamente
              </Button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-brand-blue-50 flex items-center justify-center mx-auto">
                <MailX className="w-7 h-7 text-brand-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Confirmar Descadastro</h1>
              <p className="text-sm text-slate-600">
                Tem certeza que deseja parar de receber nossos e-mails? Esta ação não pode ser
                desfeita.
              </p>
              <Button
                onClick={handleConfirm}
                disabled={status === 'loading'}
                className="mt-4 w-full bg-brand-blue-600 hover:bg-brand-blue-700 text-white font-semibold"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Sim, descadastrar'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

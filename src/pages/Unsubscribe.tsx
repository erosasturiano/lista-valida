import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2, MailX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'

export default function Unsubscribe() {
  const { logId } = useParams<{ logId: string }>()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!logId) return
    setStatus('loading')
    setError('')
    try {
      await pb.send(`/backend/v1/unsubscribe/${logId}`, { method: 'POST' })
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError('Não foi possível processar seu descadastro no momento. Tente novamente mais tarde.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
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
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Tentar novamente
              </Button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
                <MailX className="w-7 h-7 text-indigo-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Confirmar Descadastro</h1>
              <p className="text-sm text-slate-600">
                Tem certeza que deseja parar de receber nossos e-mails? Esta ação não pode ser
                desfeita.
              </p>
              <Button
                onClick={handleConfirm}
                disabled={status === 'loading'}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
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

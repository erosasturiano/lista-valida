import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import pb from '@/lib/pocketbase/client'

interface UnsubscribeInfo {
  email: string
  name: string
}

export default function Unsubscribe() {
  const { logId } = useParams<{ logId: string }>()
  const [info, setInfo] = useState<UnsubscribeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!logId) return
    pb.send(`/backend/v1/unsubscribe/${logId}`, { method: 'GET' })
      .then((data: UnsubscribeInfo) => setInfo(data))
      .catch(() => setError('Link de descadastro inválido ou expirado.'))
      .finally(() => setLoading(false))
  }, [logId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!logId) return
    setSubmitting(true)
    try {
      await pb.send(`/backend/v1/unsubscribe/${logId}`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() || undefined }),
        headers: { 'Content-Type': 'application/json' },
      })
      setDone(true)
    } catch {
      setError('Ocorreu um erro ao processar seu descadastro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Cancelamento confirmado</h1>
          <p className="text-sm text-slate-600">
            Seu e-mail foi removido da nossa lista de destinatários e você não receberá mais nossas
            comunicações.
          </p>
          <p className="text-xs text-slate-400 border-t border-slate-200 pt-4">
            De acordo com a Lei Geral de Proteção de Dados (LGPD), você pode cancelar o recebimento
            a qualquer momento, sem necessidade de justificativa. O cancelamento será aplicado
            imediatamente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg mx-auto mb-3">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Cancelamento de recebimento de e-mails
          </h1>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Você está recebendo este e-mail porque se cadastrou ou participou de um evento nosso.
            Caso não deseje mais receber nossas comunicações, você pode cancelar o recebimento a
            qualquer momento, de forma simples e gratuita.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Seu e-mail</Label>
              <Input value={info?.email || ''} disabled className="text-sm bg-slate-50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Motivo do cancelamento (opcional)
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Conte-nos o motivo (opcional)..."
                className="text-sm h-20"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm h-10"
            >
              {submitting ? 'Processando...' : 'Confirmar cancelamento'}
            </Button>
          </form>
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
            De acordo com a Lei Geral de Proteção de Dados (LGPD), você pode cancelar o recebimento
            a qualquer momento, sem necessidade de justificativa. O cancelamento será aplicado
            imediatamente.
          </p>
        </div>
      </div>
    </div>
  )
}

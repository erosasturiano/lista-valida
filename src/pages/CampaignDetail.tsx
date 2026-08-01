import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Send, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react'
import {
  getCampaign,
  getCampaignLogs,
  sendCampaign,
  deleteCampaign,
  CampaignRecord,
  EmailLogRecord,
} from '@/services/campaigns'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null)
  const [logs, setLogs] = useState<EmailLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      const [c, l] = await Promise.all([getCampaign(id), getCampaignLogs(id)])
      setCampaign(c)
      setLogs(l)
    } catch {
      toast({ title: 'Erro ao carregar campanha' })
      navigate('/campanhas')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtime('email_logs', () => {
    if (id) fetchData()
  })
  useRealtime('email_campaigns', () => {
    if (id) fetchData()
  })

  const handleSend = async () => {
    if (!id) return
    setSending(true)
    try {
      const result = await sendCampaign(id)
      toast({
        title: 'Disparo concluído!',
        description: `${result.sent} enviados, ${result.failed} falhas.`,
      })
      fetchData()
    } catch {
      toast({ title: 'Erro ao disparar campanha' })
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteCampaign(id)
      toast({ title: 'Campanha excluída.' })
      navigate('/campanhas')
    } catch {
      toast({ title: 'Erro ao excluir.' })
    }
  }

  if (loading || !campaign) {
    return <div className="p-8 text-center text-slate-500 text-xs">Carregando campanha...</div>
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link to="/campanhas">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {campaign.name}
            </h1>
            <p className="text-xs text-slate-500">
              {campaign.expand?.event?.name || 'Mailing (lista)'}
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => setConfirmDelete(true)}
          className="h-8 w-8"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Configuração do E-mail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-600">Assunto:</span>
                <p className="mt-1 p-2 bg-slate-50 rounded text-slate-800">{campaign.subject}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-600">Corpo:</span>
                <pre className="mt-1 p-2 bg-slate-50 rounded text-slate-800 whitespace-pre-wrap font-sans">
                  {campaign.body_template}
                </pre>
              </div>
              {campaign.sender_name && (
                <p>
                  <span className="font-semibold text-slate-600">Remetente:</span>{' '}
                  {campaign.sender_name} &lt;{campaign.sender_email}&gt;
                </p>
              )}
            </CardContent>
          </Card>

          {logs.length > 0 && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">
                  Histórico de Envios ({logs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Destinatário</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold">Enviado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <p className="text-xs font-medium text-slate-900">
                              {log.recipient_name || '—'}
                            </p>
                            <p className="text-[11px] text-slate-400">{log.recipient_email}</p>
                          </TableCell>
                          <TableCell>
                            {log.status === 'enviado' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Enviado
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 text-[10px]">
                                <XCircle className="w-3 h-3 mr-1" />
                                Falhou
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] text-slate-500">
                            {log.sent_at ? new Date(log.sent_at).toLocaleString('pt-BR') : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-indigo-900">Disparo</CardTitle>
              <CardDescription className="text-xs">
                Envie e-mails para os contatos filtrados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <p className="text-lg font-extrabold text-emerald-700">
                    {campaign.total_sent || 0}
                  </p>
                  <p className="text-[10px] text-emerald-600">Enviados</p>
                </div>
                <div className="p-2 rounded-lg bg-rose-50">
                  <p className="text-lg font-extrabold text-rose-700">
                    {campaign.total_failed || 0}
                  </p>
                  <p className="text-[10px] text-rose-600">Falhas</p>
                </div>
              </div>
              <div className="space-y-1 text-[11px] text-slate-600">
                <p>
                  Filtro RSVP: <strong>{campaign.filter_rsvp || 'todos'}</strong>
                </p>
                <p>
                  Prioridade: <strong>{campaign.filter_priority || 'todas'}</strong>
                </p>
                <p>
                  Categoria: <strong>{campaign.filter_category || 'todas'}</strong>
                </p>
              </div>
              <Button
                onClick={handleSend}
                disabled={sending || campaign.status === 'enviando'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-10 gap-2"
              >
                {sending ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Disparando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Disparar E-mails
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir campanha"
        description="Tem certeza? Todos os logs de envio também serão removidos."
        confirmText="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

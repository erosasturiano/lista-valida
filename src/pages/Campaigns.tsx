import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Plus, ChevronRight, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { useEventContext } from '@/contexts/event-context'
import { getCampaigns, CampaignRecord } from '@/services/campaigns'
import { useRealtime } from '@/hooks/use-realtime'
import { CampaignFormDialog } from '@/components/CampaignFormDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const statusConfig: Record<string, { label: string; class: string }> = {
  rascunho: { label: 'Rascunho', class: 'bg-slate-100 text-slate-600' },
  enviando: { label: 'Enviando', class: 'bg-blue-50 text-blue-700' },
  enviado: { label: 'Enviado', class: 'bg-emerald-50 text-emerald-700' },
  parcialmente_falhou: { label: 'Parcial', class: 'bg-amber-50 text-amber-700' },
}

export default function Campaigns() {
  const { selectedEvent } = useEventContext()
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadData = useCallback(async () => {
    if (!selectedEvent?.id) {
      setCampaigns([])
      setLoading(false)
      return
    }
    try {
      const data = await getCampaigns(selectedEvent.id)
      setCampaigns(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedEvent?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('email_campaigns', () => {
    loadData()
  })
  useRealtime('email_logs', () => {
    loadData()
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Campanhas de E-mail
          </h1>
          <p className="text-xs text-slate-500">
            {campaigns.length} campanhas no mailing (lista) atual
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 h-9">
            <Link to="/modelos">
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Modelos de E-mail</span>
            </Link>
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 self-start"
            disabled={!selectedEvent?.id}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Campanha</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="text-center p-12 border-dashed border-2 border-slate-200">
          <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Nenhuma campanha criada</p>
          <p className="text-xs text-slate-500 mt-1">
            Crie sua primeira campanha de e-mail para o evento.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const st = statusConfig[c.status || 'rascunho'] || statusConfig.rascunho
            return (
              <Card
                key={c.id}
                className="border-slate-200 shadow-xs hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/campanhas/${c.id}`}
                        className="font-bold text-xs text-slate-900 hover:text-indigo-600 block truncate"
                      >
                        {c.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={st.class + ' text-[10px]'}>
                          {st.label}
                        </Badge>
                        {(c.total_sent || 0) > 0 && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {c.total_sent} enviados
                          </span>
                        )}
                        {(c.total_failed || 0) > 0 && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            {c.total_failed} falhas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Link to={`/campanhas/${c.id}`}>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selectedEvent?.id && (
        <CampaignFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          eventId={selectedEvent.id}
          onCreated={loadData}
        />
      )}
    </div>
  )
}

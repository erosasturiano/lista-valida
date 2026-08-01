import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart3,
  MailOpen,
  MousePointerClick,
  Send,
  CheckCircle2,
  TrendingUp,
  Download,
  FileSpreadsheet,
} from 'lucide-react'
import { useEventContext } from '@/contexts/event-context'
import {
  getReportCampaigns,
  getCampaignLogs,
  CampaignRecord,
  EmailLogRecord,
} from '@/services/campaigns'
import { useRealtime } from '@/hooks/use-realtime'
import { ReportDetailDialog } from '@/components/ReportDetailDialog'
import { Card } from '@/components/ui/card'
import { CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { downloadCsv, downloadXlsx } from '@/lib/export-utils'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const statusConfig: Record<string, { label: string; class: string }> = {
  rascunho: { label: 'Rascunho', class: 'bg-slate-100 text-slate-600' },
  enviando: { label: 'Enviando', class: 'bg-blue-50 text-blue-700' },
  enviado: { label: 'Enviado', class: 'bg-emerald-50 text-emerald-700' },
  parcialmente_falhou: { label: 'Parcial', class: 'bg-amber-50 text-amber-700' },
}

interface CampaignMetrics {
  enviados: number
  entregues: number
  abertos: number
  clicados: number
  totalCliques: number
  taxaAbertura: number
  taxaCliques: number
}

function computeMetrics(logs: EmailLogRecord[]): CampaignMetrics {
  const enviados = logs.length
  const entregues = logs.filter((l) => l.status === 'enviado').length
  const abertos = logs.filter((l) => l.opened_at).length
  const clicados = logs.filter((l) => (l.click_count || 0) > 0).length
  const totalCliques = logs.reduce((s, l) => s + (l.click_count || 0), 0)
  return {
    enviados,
    entregues,
    abertos,
    clicados,
    totalCliques,
    taxaAbertura: enviados ? (abertos / enviados) * 100 : 0,
    taxaCliques: enviados ? (clicados / enviados) * 100 : 0,
  }
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
}) {
  return (
    <Card className="shadow-xs border-slate-200">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          <h3 className="text-xl font-extrabold text-slate-900">{value}</h3>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReportDeliveries() {
  const { selectedEvent } = useEventContext()
  const [statusFilter, setStatusFilter] = useState('all')
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [logsMap, setLogsMap] = useState<Record<string, EmailLogRecord[]>>({})
  const [loading, setLoading] = useState(true)
  const [detailCampaign, setDetailCampaign] = useState<CampaignRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    if (!selectedEvent?.id) {
      setCampaigns([])
      setLoading(false)
      return
    }
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter
      const data = await getReportCampaigns(selectedEvent.id, status)
      setCampaigns(data)
      const entries = await Promise.all(
        data.map(async (c) => [c.id, await getCampaignLogs(c.id)] as const),
      )
      const map: Record<string, EmailLogRecord[]> = {}
      entries.forEach(([id, logs]) => {
        map[id] = logs
      })
      setLogsMap(map)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedEvent?.id, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('email_logs', () => {
    loadData()
  })
  useRealtime('email_campaigns', () => {
    loadData()
  })

  const summary = useMemo(() => {
    let enviados = 0,
      entregues = 0,
      abertos = 0,
      clicados = 0,
      totalCliques = 0
    campaigns.forEach((c) => {
      const m = computeMetrics(logsMap[c.id] || [])
      enviados += m.enviados
      entregues += m.entregues
      abertos += m.abertos
      clicados += m.clicados
      totalCliques += m.totalCliques
    })
    return {
      enviados,
      entregues,
      abertos,
      clicados,
      totalCliques,
      taxaAbertura: enviados ? (abertos / enviados) * 100 : 0,
      taxaCliques: enviados ? (clicados / enviados) * 100 : 0,
    }
  }, [campaigns, logsMap])

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (campaigns.length === 0) {
      toast({ title: 'Nenhum dado encontrado para exportar.' })
      return
    }
    setExporting(format)
    await new Promise((r) => setTimeout(r, 50))
    try {
      const headers = [
        'Nome da Campanha',
        'Mailing (Lista)',
        'Status',
        'Enviados',
        'Entregues',
        'Abertos',
        'Cliques',
        'Taxa de Abertura (%)',
        'Taxa de Cliques (%)',
      ]
      const rows = campaigns.map((c) => {
        const m = computeMetrics(logsMap[c.id] || [])
        const st = statusConfig[c.status || 'rascunho'] || statusConfig.rascunho
        return [
          c.name,
          c.expand?.event?.name || selectedEvent?.name || '',
          st.label,
          m.enviados,
          m.entregues,
          m.abertos,
          m.totalCliques,
          `${m.taxaAbertura.toFixed(1)}%`,
          `${m.taxaCliques.toFixed(1)}%`,
        ]
      })
      if (format === 'csv') downloadCsv('relatorio-entregas', headers, rows)
      else downloadXlsx('relatorio-entregas', headers, rows)
      toast({ title: 'Arquivo exportado com sucesso!' })
    } catch {
      toast({ title: 'Erro ao exportar arquivo.' })
    } finally {
      setExporting(null)
    }
  }

  const handleRowClick = (c: CampaignRecord) => {
    setDetailCampaign(c)
    setDetailOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Relatório de Entregas
          </h1>
          <p className="text-xs text-slate-500">
            {selectedEvent ? selectedEvent.name : 'Nenhum mailing (lista) selecionado'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="enviando">Enviando</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="parcialmente_falhou">Parcial</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            disabled={exporting !== null || campaigns.length === 0}
            onClick={() => handleExport('csv')}
          >
            {exporting === 'csv' ? (
              <span className="animate-pulse">Gerando...</span>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            disabled={exporting !== null || campaigns.length === 0}
            onClick={() => handleExport('xlsx')}
          >
            {exporting === 'xlsx' ? (
              <span className="animate-pulse">Gerando...</span>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard
          icon={Send}
          label="Total de Enviados"
          value={String(summary.enviados)}
          color="bg-indigo-50 text-indigo-600"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Total de Entregues"
          value={String(summary.entregues)}
          color="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          icon={MailOpen}
          label="Total de Abertos"
          value={String(summary.abertos)}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Taxa de Abertura"
          value={`${summary.taxaAbertura.toFixed(1)}%`}
          color="bg-purple-50 text-purple-600"
        />
        <SummaryCard
          icon={MousePointerClick}
          label="Total de Cliques"
          value={String(summary.totalCliques)}
          color="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          icon={BarChart3}
          label="Taxa de Cliques"
          value={`${summary.taxaCliques.toFixed(1)}%`}
          color="bg-rose-50 text-rose-600"
        />
      </div>

      {campaigns.length === 0 ? (
        <Card className="text-center p-12 border-dashed border-2 border-slate-200">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Nenhuma campanha encontrada</p>
          <p className="text-xs text-slate-500 mt-1">
            Crie e envie campanhas para visualizar o relatório de entregas do mailing (lista).
          </p>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nome da Campanha</TableHead>
                <TableHead className="text-xs">Enviados</TableHead>
                <TableHead className="text-xs">Entregues</TableHead>
                <TableHead className="text-xs">Abertos</TableHead>
                <TableHead className="text-xs">Clicados</TableHead>
                <TableHead className="text-xs">Taxa de Abertura</TableHead>
                <TableHead className="text-xs">Taxa de Cliques</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const m = computeMetrics(logsMap[c.id] || [])
                const st = statusConfig[c.status || 'rascunho'] || statusConfig.rascunho
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleRowClick(c)}
                  >
                    <TableCell>
                      <p className="text-xs font-bold text-slate-900">{c.name}</p>
                      <Badge variant="secondary" className={st.class + ' text-[10px] mt-1'}>
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{m.enviados}</TableCell>
                    <TableCell className="text-xs">{m.entregues}</TableCell>
                    <TableCell className="text-xs">{m.abertos}</TableCell>
                    <TableCell className="text-xs">{m.clicados}</TableCell>
                    <TableCell className="text-xs font-semibold">
                      {m.taxaAbertura.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {m.taxaCliques.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <ReportDetailDialog
        campaign={detailCampaign}
        logs={detailCampaign ? logsMap[detailCampaign.id] || [] : []}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}

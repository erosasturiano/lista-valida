import { CheckCircle2, XCircle } from 'lucide-react'
import { CampaignRecord, EmailLogRecord } from '@/services/campaigns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ReportDetailDialogProps {
  campaign: CampaignRecord | null
  logs: EmailLogRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportDetailDialog({
  campaign,
  logs,
  open,
  onOpenChange,
}: ReportDetailDialogProps) {
  if (!campaign) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{campaign.name}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1">
          {logs.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">
              Nenhum envio registrado para esta campanha.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">E-mail</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Aberto em</TableHead>
                  <TableHead className="text-xs">Clicado em</TableHead>
                  <TableHead className="text-xs">Nº de Cliques</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-medium text-slate-900">
                      {log.recipient_name || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{log.recipient_email}</TableCell>
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
                      {log.opened_at ? new Date(log.opened_at).toLocaleString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-500">
                      {log.clicked_at ? new Date(log.clicked_at).toLocaleString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{log.click_count || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

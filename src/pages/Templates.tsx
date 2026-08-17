import { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, Pencil, Trash2, Mail } from 'lucide-react'
import {
  getTemplates,
  deleteTemplate,
  TemplateRecord,
  TEMPLATE_CATEGORIES,
} from '@/services/templates'
import { useRealtime } from '@/hooks/use-realtime'
import { TemplateFormDialog } from '@/components/TemplateFormDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'

const CATEGORY_COLORS: Record<string, string> = {
  RSVP: 'bg-rose-50 text-rose-700 border-rose-200',
  'Envio de Certificado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Convite: 'bg-brand-blue-50 text-brand-blue-700 border-brand-blue-200',
  Pitch: 'bg-amber-50 text-amber-700 border-amber-200',
  'Convite para Comunidade Exclusiva': 'bg-brand-navy-50 text-brand-navy-700 border-brand-navy-200',
}

export default function Templates() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<TemplateRecord | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TemplateRecord | null>(null)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    try {
      const data = await getTemplates()
      setTemplates(data)
    } catch {
      toast({ title: 'Erro ao carregar modelos' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('email_templates', () => {
    loadData()
  })

  const handleOpenCreate = () => {
    setEditTemplate(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (template: TemplateRecord) => {
    setEditTemplate(template)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteTemplate(confirmDelete.id)
      toast({ title: 'Modelo excluído.' })
    } catch {
      toast({ title: 'Erro ao excluir.' })
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Modelos de E-mail
          </h1>
          <p className="text-xs text-slate-500">{templates.length} modelos cadastrados</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-xs gap-1.5 self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Modelo</span>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="text-center p-12 border-dashed border-2 border-slate-200">
          <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Nenhum modelo criado</p>
          <p className="text-xs text-slate-500 mt-1">
            Crie seu primeiro modelo de e-mail para agilizar suas campanhas.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {TEMPLATE_CATEGORIES.map((category) => {
            const catTemplates = templates.filter((t) => t.category === category)
            if (catTemplates.length === 0) return null
            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${CATEGORY_COLORS[category] || ''}`}
                  >
                    {category}
                  </Badge>
                  <span className="text-[10px] text-slate-400">
                    {catTemplates.length} modelo(s)
                  </span>
                </div>
                {catTemplates.map((t) => (
                  <Card
                    key={t.id}
                    className="border-slate-200 shadow-xs hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-brand-blue-50 text-brand-blue-600 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{t.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{t.subject}</p>
                          {t.sender_name && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              De: {t.sender_name}
                              {t.sender_email ? ` <${t.sender_email}>` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(t)}
                          className="h-8 w-8 text-slate-500 hover:text-brand-blue-600"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDelete(t)}
                          className="h-8 w-8 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <TemplateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTemplate={editTemplate}
        onSaved={loadData}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Excluir modelo"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

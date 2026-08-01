import { useState, useEffect, useCallback, useMemo } from 'react'
import { FileText, Plus, Search, Copy, Trash2, Pencil, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  getTemplates,
  createTemplate,
  deleteTemplate,
  TEMPLATE_CATEGORIES,
  type TemplateRecord,
  type TemplateCategory,
} from '@/services/templates'
import { useRealtime } from '@/hooks/use-realtime'
import { TemplateFormDialog } from '@/components/TemplateFormDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

const CATEGORY_COLORS: Record<string, string> = {
  RSVP: 'bg-rose-50 text-rose-700 border-rose-200',
  'Envio de Certificado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Convite: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Pitch: 'bg-amber-50 text-amber-700 border-amber-200',
  'Convite para Comunidade Exclusiva': 'bg-purple-50 text-purple-700 border-purple-200',
}

export default function Templates() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('todas')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TemplateRecord | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TemplateRecord | null>(null)

  const loadData = useCallback(async () => {
    try {
      const data = await getTemplates()
      setTemplates(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('email_templates', () => {
    loadData()
  })

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (filterCategory !== 'todas' && t.category !== filterCategory) return false
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [templates, search, filterCategory])

  const handleNew = () => {
    setEditTarget(null)
    setDialogOpen(true)
  }

  const handleEdit = (t: TemplateRecord) => {
    setEditTarget(t)
    setDialogOpen(true)
  }

  const handleDuplicate = async (t: TemplateRecord) => {
    try {
      await createTemplate({
        name: `${t.name} (cópia)`,
        category: t.category,
        sender_name: t.sender_name,
        sender_email: t.sender_email,
        subject: t.subject,
        body_template: t.body_template,
      })
      toast({ title: 'Modelo duplicado com sucesso!' })
      setEditTarget({
        ...t,
        id: '',
        name: `${t.name} (cópia)`,
      } as TemplateRecord)
      // Open editor for the copy — find it after realtime refresh
      setTimeout(async () => {
        const data = await getTemplates()
        const copy = data.find((d) => d.name === `${t.name} (cópia)`)
        if (copy) {
          setEditTarget(copy)
          setDialogOpen(true)
        }
      }, 300)
    } catch {
      toast({ title: 'Erro ao duplicar modelo.' })
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteTemplate(confirmDelete.id)
      toast({ title: 'Modelo excluído com sucesso.' })
    } catch {
      toast({ title: 'Erro ao excluir modelo.' })
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
          <p className="text-xs text-slate-500">{templates.length} modelos disponíveis</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 h-9">
            <Link to="/campanhas">
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Campanhas</span>
            </Link>
          </Button>
          <Button
            onClick={handleNew}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 h-9"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Modelo</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="pl-9 text-xs h-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterCategory('todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterCategory === 'todas'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas
          </button>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center p-12 border-dashed border-2 border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Nenhum modelo encontrado</p>
          <p className="text-xs text-slate-500 mt-1">
            Crie seu primeiro modelo de e-mail reutilizável.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className="border-slate-200 shadow-xs hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-xs text-slate-900">{t.name}</p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${CATEGORY_COLORS[t.category] || ''}`}
                        >
                          {t.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">
                        <span className="font-semibold">Assunto:</span> {t.subject}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t.sender_name ? `De: ${t.sender_name}` : 'Sem remetente'} · Atualizado em{' '}
                        {new Date(t.updated).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(t)}
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDuplicate(t)}
                      title="Duplicar"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-red-600"
                      onClick={() => setConfirmDelete(t)}
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTemplate={editTarget}
        onSaved={loadData}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Excluir modelo"
        description={`Tem certeza que deseja excluir "${confirmDelete?.name}"? Campanhas que já usaram este conteúdo não serão afetadas.`}
        confirmText="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

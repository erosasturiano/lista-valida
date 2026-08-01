import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  Save,
  Trash2,
  Building,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
} from 'lucide-react'
import {
  getContact,
  updateContact,
  classifyContact,
  deleteContact,
  ContactRecord,
  RoleCategory,
  RSVPStatus,
  ClassificationStatus,
  PriorityLevel,
} from '@/services/contacts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [contact, setContact] = useState<ContactRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Editable Form State
  const [roleCategory, setRoleCategory] = useState<RoleCategory>('Outro')
  const [priority, setPriority] = useState<PriorityLevel>('Média')
  const [interests, setInterests] = useState<string[]>([])
  const [newInterest, setNewInterest] = useState('')
  const [demands, setDemands] = useState<string[]>([])
  const [newDemand, setNewDemand] = useState('')
  const [profileSummary, setProfileSummary] = useState('')
  const [status, setStatus] = useState<ClassificationStatus>('Pendente')
  const [notes, setNotes] = useState('')
  const [suggestedMessage, setSuggestedMessage] = useState('')
  const [rsvp, setRsvp] = useState<RSVPStatus>('Aguardando')

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmReclassify, setConfirmReclassify] = useState(false)

  const fetchContact = useCallback(async () => {
    if (!id) return
    try {
      const data = await getContact(id)
      setContact(data)
      setRoleCategory(data.role_category || 'Outro')
      setPriority(data.priority || 'Média')
      setInterests(data.interests || [])
      setDemands(data.demands || [])
      setProfileSummary(data.profile_summary || '')
      setStatus(data.classification_status || 'Pendente')
      setNotes(data.notes || '')
      setSuggestedMessage(data.suggested_message || '')
      setRsvp(data.rsvp || 'Aguardando')
    } catch (err) {
      toast({ title: 'Erro ao carregar contato', description: 'Registro não encontrado.' })
      navigate('/contatos')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, toast])

  useEffect(() => {
    fetchContact()
  }, [fetchContact])

  const handleCopy = (text?: string, fieldName?: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName || 'text')
    toast({ title: 'Copiado para a área de transferência!' })
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const updated = await updateContact(id, {
        role_category: roleCategory,
        priority,
        interests,
        demands,
        profile_summary: profileSummary,
        classification_status: status,
        notes,
        suggested_message: suggestedMessage,
        rsvp,
      })
      setContact(updated)
      toast({ title: 'Alterações salvas com sucesso!' })
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: 'Verifique as informações preenchidas.' })
    } finally {
      setSaving(false)
    }
  }

  const runClassification = async () => {
    if (!id) return
    setClassifying(true)
    try {
      const updated = await classifyContact(id)
      setContact(updated)
      setRoleCategory(updated.role_category || 'Outro')
      setPriority(updated.priority || 'Média')
      setInterests(updated.interests || [])
      setDemands(updated.demands || [])
      setProfileSummary(updated.profile_summary || '')
      setStatus(updated.classification_status || 'Classificado')
      setSuggestedMessage(updated.suggested_message || '')
      toast({ title: 'Perfil qualificado pela IA!' })
    } catch (err) {
      toast({ title: 'Erro ao qualificar perfil' })
    } finally {
      setClassifying(false)
    }
  }

  const handleClassifyClick = () => {
    if (
      contact?.classification_status === 'Classificado' ||
      contact?.classification_status === 'Revisado'
    ) {
      setConfirmReclassify(true)
    } else {
      runClassification()
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteContact(id)
      toast({ title: 'Contato excluído.' })
      navigate('/contatos')
    } catch (err) {
      toast({ title: 'Erro ao excluir contato.' })
    }
  }

  const addInterest = () => {
    if (!newInterest.trim()) return
    setInterests([...interests, newInterest.trim()])
    setNewInterest('')
  }

  const removeInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index))
  }

  const addDemand = () => {
    if (!newDemand.trim()) return
    setDemands([...demands, newDemand.trim()])
    setNewDemand('')
  }

  const removeDemand = (index: number) => {
    setDemands(demands.filter((_, i) => i !== index))
  }

  if (loading || !contact) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Carregando detalhes do contato...
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
            <Link to="/contatos">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
            {contact.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{contact.name}</h1>
            <p className="text-xs text-slate-500">
              {contact.company || 'Sem empresa'} • {contact.raw_role || 'Sem cargo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick RSVP Select */}
          <Select value={rsvp} onValueChange={(val: RSVPStatus) => setRsvp(val)}>
            <SelectTrigger className="h-8 text-xs font-medium w-32 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Confirmou" className="text-xs text-emerald-700">
                Confirmou
              </SelectItem>
              <SelectItem value="Aguardando" className="text-xs text-amber-700">
                Aguardando
              </SelectItem>
              <SelectItem value="Recusou" className="text-xs text-rose-700">
                Recusou
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="destructive"
            size="icon"
            onClick={() => setConfirmDelete(true)}
            className="h-8 w-8"
            title="Excluir contato"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact Data & Notes */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Dados do Participante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopy(contact.email, 'email')}
                >
                  {copiedField === 'email' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{contact.phone || 'Não informado'}</span>
                </div>
                {contact.phone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopy(contact.phone, 'phone')}
                  >
                    {copiedField === 'phone' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{contact.company || 'Não informada'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{contact.raw_role || 'Não informado'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Possui Diploma: {contact.has_degree || 'Não informado'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Observações Internas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Anotações e histórico sobre o contato..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs h-28"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Assistant & Profile Classification Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Trigger Banner */}
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xs">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-xs mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Higienizador por IA</span>
                </div>
                <p className="text-xs text-slate-300">
                  {contact.last_classified_at
                    ? `Última classificação em ${new Date(contact.last_classified_at).toLocaleString('pt-BR')}`
                    : 'Perfil ainda não classificado pela IA.'}
                </p>
              </div>

              <Button
                onClick={handleClassifyClick}
                disabled={classifying}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs h-9 px-4 gap-2 shrink-0"
              >
                {classifying ? 'Analisando...' : 'Classificar com IA'}
              </Button>
            </CardContent>
          </Card>

          {/* Profile Form */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Classificação do Perfil
              </CardTitle>
              <CardDescription className="text-xs">
                Edite ou revise as informações higienizadas pela IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Categoria de Cargo</Label>
                  <Select
                    value={roleCategory}
                    onValueChange={(v: RoleCategory) => setRoleCategory(v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'C-Level',
                        'Diretoria',
                        'Gerência',
                        'Coordenação',
                        'Analista',
                        'Assistente/Auxiliar',
                        'Estagiário',
                        'Consultor/Autônomo',
                        'Outro',
                      ].map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Prioridade</Label>
                  <Select value={priority} onValueChange={(v: PriorityLevel) => setPriority(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alta" className="text-xs">
                        Alta
                      </SelectItem>
                      <SelectItem value="Média" className="text-xs">
                        Média
                      </SelectItem>
                      <SelectItem value="Baixa" className="text-xs">
                        Baixa
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Status de Qualificação</Label>
                  <Select value={status} onValueChange={(v: ClassificationStatus) => setStatus(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente" className="text-xs">
                        Pendente
                      </SelectItem>
                      <SelectItem value="Classificado" className="text-xs">
                        Classificado
                      </SelectItem>
                      <SelectItem value="Revisado" className="text-xs">
                        Revisado
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Interests Chips */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Interesses Mapeados</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {interests.map((item, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-indigo-50 text-indigo-700 text-xs gap-1 pr-1"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeInterest(idx)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar interesse..."
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addInterest}
                    className="h-8 text-xs"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Demands List */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Demandas Personalizadas</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {demands.map((item, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="border-purple-200 text-purple-700 bg-purple-50/50 text-xs gap-1 pr-1"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeDemand(idx)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar demanda..."
                    value={newDemand}
                    onChange={(e) => setNewDemand(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDemand}
                    className="h-8 text-xs"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Profile Summary */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Resumo do Perfil</Label>
                <Textarea
                  value={profileSummary}
                  onChange={(e) => setProfileSummary(e.target.value)}
                  className="text-xs h-20"
                />
              </div>

              {/* Suggested Message */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-indigo-900">
                    Sugestão de Abordagem Personalizada
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-indigo-600 gap-1"
                    onClick={() => handleCopy(suggestedMessage, 'msg')}
                  >
                    {copiedField === 'msg' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copiar mensagem</span>
                  </Button>
                </div>
                <Textarea
                  value={suggestedMessage}
                  onChange={(e) => setSuggestedMessage(e.target.value)}
                  className="text-xs h-24 bg-slate-50/50 border-indigo-100"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-6 gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Salvando...' : 'Salvar alterações'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir contato"
        description="Tem certeza de que deseja remover este participante do mailing? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={confirmReclassify}
        onOpenChange={setConfirmReclassify}
        title="Substituir classificação atual?"
        description="A classificação atual e a mensagem gerada serão substituídas por uma nova análise da IA."
        confirmText="Reclassificar"
        onConfirm={runClassification}
      />
    </div>
  )
}

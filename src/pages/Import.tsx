import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Plus,
} from 'lucide-react'
import { useEventContext } from '@/contexts/event-context'
import { importContacts, createEvent } from '@/services/contacts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export default function Import() {
  const { events, selectedEventId, refreshEvents, setSelectedEventId } = useEventContext()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Raw file data
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])

  // Column Mapping
  const [mapping, setMapping] = useState<{
    name: string
    email: string
    phone: string
    company: string
    raw_role: string
    rsvp: string
    has_degree: string
  }>({
    name: '',
    email: '',
    phone: '',
    company: '',
    raw_role: '',
    rsvp: '',
    has_degree: '',
  })

  // Settings
  const [targetEventId, setTargetEventId] = useState<string>(selectedEventId || '')
  const [allowDuplicates, setAllowDuplicates] = useState<boolean>(false)

  // New Event Modal
  const [newEventOpen, setNewEventOpen] = useState(false)
  const [newEventName, setNewEventName] = useState('')

  // Processing & Results
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importReport, setImportReport] = useState<{
    imported: number
    skipped: number
    errors: Array<{ row: number; reason: string }>
  } | null>(null)

  // Parse CSV File
  const parseCSV = (content: string) => {
    const lines = content.split(/\r\n|\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) {
      toast({
        title: 'Arquivo inválido',
        description: 'O CSV precisa ter pelo menos um cabeçalho e uma linha de dados.',
      })
      return
    }

    // Detect Delimiter (comma vs semicolon)
    const firstLine = lines[0]
    const delimiter = firstLine.includes(';') ? ';' : ','

    const headers = firstLine.split(delimiter).map((h) => h.replace(/^"|"$/g, '').trim())
    const dataRows = lines
      .slice(1)
      .map((line) => line.split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim()))

    setCsvHeaders(headers)
    setCsvRows(dataRows)

    // Auto-map columns if header names match
    const autoMap = {
      name: headers.find((h) => /nome/i.test(h)) || '',
      email: headers.find((h) => /e-?mail/i.test(h)) || '',
      phone: headers.find((h) => /tel|fone|celular/i.test(h)) || '',
      company: headers.find((h) => /empresa|organiza/i.test(h)) || '',
      raw_role: headers.find((h) => /cargo|função/i.test(h)) || '',
      rsvp: headers.find((h) => /rsvp|confirma/i.test(h)) || '',
      has_degree: headers.find((h) => /diploma|gradua/i.test(h)) || '',
    }
    setMapping(autoMap)
    setStep(2)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const handleCreateNewEvent = async () => {
    if (!newEventName.trim()) return
    try {
      const created = await createEvent({ name: newEventName.trim() })
      await refreshEvents()
      setTargetEventId(created.id)
      setSelectedEventId(created.id)
      setNewEventOpen(false)
      setNewEventName('')
      toast({ title: 'Evento criado com sucesso!' })
    } catch (err) {
      toast({ title: 'Erro ao criar evento.' })
    }
  }

  const handleStartImport = async () => {
    if (!targetEventId) {
      toast({ title: 'Selecione um evento para associar os contatos.' })
      return
    }
    if (!mapping.name || !mapping.email) {
      toast({
        title: 'Mapeamento incompleto',
        description: 'Nome e E-mail são campos obrigatórios.',
      })
      return
    }

    setStep(3)
    setImporting(true)
    setImportProgress(20)

    const nameIdx = csvHeaders.indexOf(mapping.name)
    const emailIdx = csvHeaders.indexOf(mapping.email)
    const phoneIdx = csvHeaders.indexOf(mapping.phone)
    const companyIdx = csvHeaders.indexOf(mapping.company)
    const roleIdx = csvHeaders.indexOf(mapping.raw_role)
    const rsvpIdx = csvHeaders.indexOf(mapping.rsvp)
    const degreeIdx = csvHeaders.indexOf(mapping.has_degree)

    const payload = csvRows.map((row) => ({
      name: nameIdx >= 0 ? row[nameIdx] : '',
      email: emailIdx >= 0 ? row[emailIdx] : '',
      phone: phoneIdx >= 0 ? row[phoneIdx] : '',
      company: companyIdx >= 0 ? row[companyIdx] : '',
      raw_role: roleIdx >= 0 ? row[roleIdx] : '',
      rsvp: rsvpIdx >= 0 ? row[rsvpIdx] : '',
      has_degree: degreeIdx >= 0 ? row[degreeIdx] : '',
    }))

    setImportProgress(60)

    try {
      const result = await importContacts(targetEventId, payload, allowDuplicates)
      setImportReport(result)
      setImportProgress(100)
      toast({ title: 'Importação concluída!' })
    } catch (err) {
      toast({ title: 'Erro durante a importação.' })
    } finally {
      setImporting(false)
    }
  }

  const downloadErrorReport = () => {
    if (!importReport || importReport.errors.length === 0) return
    const csvLines = [
      'Linha;Motivo do erro',
      ...importReport.errors.map((e) => `${e.row};"${e.reason}"`),
    ].join('\n')
    const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'relatorio_erros_importacao.csv'
    link.click()
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Importar Mailing de Evento
          </h1>
          <p className="text-xs text-slate-500">
            Envie e mapeie sua planilha para higienização e classificação automática
          </p>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold border-b border-slate-200 pb-3">
        <div
          className={`flex items-center justify-center gap-1.5 ${step === 1 ? 'text-indigo-600 border-b-2 border-indigo-600 pb-2' : 'text-slate-400'}`}
        >
          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
            1
          </span>
          <span>1. Envio do CSV</span>
        </div>
        <div
          className={`flex items-center justify-center gap-1.5 ${step === 2 ? 'text-indigo-600 border-b-2 border-indigo-600 pb-2' : 'text-slate-400'}`}
        >
          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
            2
          </span>
          <span>2. Mapeamento</span>
        </div>
        <div
          className={`flex items-center justify-center gap-1.5 ${step === 3 ? 'text-indigo-600 border-b-2 border-indigo-600 pb-2' : 'text-slate-400'}`}
        >
          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
            3
          </span>
          <span>3. Resultado</span>
        </div>
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Selecione o arquivo da sua planilha
            </CardTitle>
            <CardDescription className="text-xs">
              Exporte sua planilha para o formato <strong>CSV</strong> (separado por vírgula ou
              ponto e vírgula) antes de enviar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors bg-slate-50/50 relative">
              <FileSpreadsheet className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-800 mb-1">
                Arraste seu arquivo CSV ou clique para procurar
              </p>
              <p className="text-[11px] text-slate-400 mb-4">
                Suporta arquivos .csv delimitados por vírgula ou ponto-e-vírgula
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs pointer-events-none"
              >
                Selecionar arquivo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Mapping */}
      {step === 2 && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                1. Associar ao Evento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Select value={targetEventId} onValueChange={setTargetEventId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione o evento destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((evt) => (
                        <SelectItem key={evt.id} value={evt.id} className="text-xs">
                          {evt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewEventOpen(true)}
                  className="h-9 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo evento</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                2. Mapeamento de Colunas
              </CardTitle>
              <CardDescription className="text-xs">
                Relacione as colunas da sua planilha com os campos do sistema (* campos
                obrigatórios)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nome Completo *</Label>
                  <Select
                    value={mapping.name}
                    onValueChange={(val) => setMapping({ ...mapping, name: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">E-mail *</Label>
                  <Select
                    value={mapping.email}
                    onValueChange={(val) => setMapping({ ...mapping, email: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Telefone</Label>
                  <Select
                    value={mapping.phone}
                    onValueChange={(val) => setMapping({ ...mapping, phone: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Empresa</Label>
                  <Select
                    value={mapping.company}
                    onValueChange={(val) => setMapping({ ...mapping, company: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Cargo Original</Label>
                  <Select
                    value={mapping.raw_role}
                    onValueChange={(val) => setMapping({ ...mapping, raw_role: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Status RSVP</Label>
                  <Select
                    value={mapping.rsvp}
                    onValueChange={(val) => setMapping({ ...mapping, rsvp: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Possui Diploma de Graduação?</Label>
                  <Select
                    value={mapping.has_degree}
                    onValueChange={(val) => setMapping({ ...mapping, has_degree: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Duplicates Options */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <Label className="text-xs font-semibold text-slate-800">
                  Tratamento de Duplicados
                </Label>
                <RadioGroup
                  value={allowDuplicates ? 'allow' : 'skip'}
                  onValueChange={(val) => setAllowDuplicates(val === 'allow')}
                  className="flex gap-4 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id="r-skip" />
                    <label htmlFor="r-skip" className="cursor-pointer text-slate-700">
                      Pular e-mails duplicados (Recomendado)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="allow" id="r-allow" />
                    <label htmlFor="r-allow" className="cursor-pointer text-slate-700">
                      Importar mesmo assim
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <div className="pt-4 flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-xs gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </Button>
                <Button
                  onClick={handleStartImport}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-6 gap-2"
                >
                  <span>Iniciar Importação ({csvRows.length} linhas)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: Progress & Report */}
      {step === 3 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              {importing ? 'Processando Importação...' : 'Relatório de Importação'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {importing && (
              <div className="space-y-3 py-6">
                <Progress value={importProgress} className="h-3" />
                <p className="text-xs text-center text-slate-500">
                  Gravando participantes na base do evento...
                </p>
              </div>
            )}

            {!importing && importReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                    <h4 className="text-2xl font-extrabold">{importReport.imported}</h4>
                    <p className="text-xs font-semibold">Importados</p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50 text-amber-800 border border-amber-100">
                    <h4 className="text-2xl font-extrabold">{importReport.skipped}</h4>
                    <p className="text-xs font-semibold">Duplicados Pulados</p>
                  </div>
                  <div className="p-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-100">
                    <h4 className="text-2xl font-extrabold">{importReport.errors.length}</h4>
                    <p className="text-xs font-semibold">Erros</p>
                  </div>
                </div>

                {importReport.errors.length > 0 && (
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">
                        Linhas com falhas de validação:
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={downloadErrorReport}
                        className="text-xs gap-1.5 h-8"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar relatório (CSV)</span>
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-xs font-bold w-20">Linha</TableHead>
                            <TableHead className="text-xs font-bold">Motivo do Erro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importReport.errors.map((err, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs font-semibold">#{err.row}</TableCell>
                              <TableCell className="text-xs text-rose-600">{err.reason}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(1)}
                    className="text-xs"
                  >
                    Importar outro arquivo
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                  >
                    <Link to="/contatos">
                      <span>Ver contatos do evento</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog Inline New Event */}
      <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Criar Novo Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">Nome do Evento</Label>
            <Input
              placeholder="Ex: Convenção Anual de RH 2026"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="text-xs h-9"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewEventOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateNewEvent}
              className="bg-indigo-600 text-white text-xs"
            >
              Criar Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

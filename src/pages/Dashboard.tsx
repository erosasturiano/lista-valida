import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Upload,
  ArrowRight,
  Play,
} from 'lucide-react'
import { useEventContext } from '@/contexts/event-context'
import { getContacts, classifyContact, ContactRecord } from '@/services/contacts'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { useToast } from '@/hooks/use-toast'

export default function Dashboard() {
  const { selectedEvent } = useEventContext()
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [classifyingBatch, setClassifyingBatch] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    if (!selectedEvent?.id) {
      setContacts([])
      setLoading(false)
      return
    }
    try {
      const data = await getContacts(selectedEvent.id)
      setContacts(data)
    } catch (err) {
      console.error('Erro ao buscar contatos:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedEvent?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('mailing_contacts', () => {
    loadData()
  })

  // KPI Computations
  const totalContacts = contacts.length
  const rsvpConfirmou = contacts.filter((c) => c.rsvp === 'Confirmou').length
  const rsvpAguardando = contacts.filter((c) => c.rsvp === 'Aguardando').length
  const rsvpRecusou = contacts.filter((c) => c.rsvp === 'Recusou').length
  const pendentesClassificacao = contacts.filter(
    (c) => c.classification_status === 'Pendente',
  ).length
  const classificadosCount = totalContacts - pendentesClassificacao
  const progressPercent =
    totalContacts > 0 ? Math.round((classificadosCount / totalContacts) * 100) : 0

  // Chart Data: RSVP Donut
  const rsvpChartData = useMemo(
    () => [
      { name: 'Confirmou', value: rsvpConfirmou, color: '#10B981' },
      { name: 'Aguardando', value: rsvpAguardando, color: '#F59E0B' },
      { name: 'Recusou', value: rsvpRecusou, color: '#EF4444' },
    ],
    [rsvpConfirmou, rsvpAguardando, rsvpRecusou],
  )

  // Chart Data: Roles Bar Chart
  const roleChartData = useMemo(() => {
    const categories = [
      'C-Level',
      'Diretoria',
      'Gerência',
      'Coordenação',
      'Analista',
      'Assistente/Auxiliar',
      'Estagiário',
      'Consultor/Autônomo',
    ]
    const counts: Record<string, number> = {}
    categories.forEach((cat) => (counts[cat] = 0))
    contacts.forEach((c) => {
      if (c.role_category && counts[c.role_category] !== undefined) {
        counts[c.role_category]++
      }
    })
    return categories.map((cat) => ({ name: cat, total: counts[cat] }))
  }, [contacts])

  // Chart Data: Top Interests
  const interestsChartData = useMemo(() => {
    const interestCounts: Record<string, number> = {}
    contacts.forEach((c) => {
      if (Array.isArray(c.interests)) {
        c.interests.forEach((item) => {
          const key = item.trim()
          if (key) interestCounts[key] = (interestCounts[key] || 0) + 1
        })
      }
    })
    const sorted = Object.entries(interestCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
    return sorted
  }, [contacts])

  // Batch Classification Trigger
  const handleClassifyAllPending = async () => {
    const pendingList = contacts.filter((c) => c.classification_status === 'Pendente')
    if (pendingList.length === 0) {
      toast({ title: 'Tudo atualizado', description: 'Todos os contatos já foram classificados.' })
      return
    }

    setClassifyingBatch(true)
    setBatchProgress(0)
    let done = 0

    for (const item of pendingList) {
      try {
        await classifyContact(item.id)
      } catch (err) {
        console.error('Erro ao classificar:', item.name, err)
      }
      done++
      setBatchProgress(Math.round((done / pendingList.length) * 100))
    }

    setClassifyingBatch(false)
    toast({
      title: 'Classificação concluída',
      description: `${done} contatos foram classificados com sucesso!`,
    })
    loadData()
  }

  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Olá, seja bem-vindo!
          </h1>
          <p className="text-xs text-slate-500 capitalize">
            {formattedDate} •{' '}
            {selectedEvent ? selectedEvent.name : 'Nenhum mailing (lista) selecionado'}
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-xs border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Contatos
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900">{totalContacts}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Confirmados
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-600">{rsvpConfirmou}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Aguardando
              </p>
              <h3 className="text-2xl font-extrabold text-amber-600">{rsvpAguardando}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Recusaram
              </p>
              <h3 className="text-2xl font-extrabold text-rose-600">{rsvpRecusou}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pendentes IA
              </p>
              <h3 className="text-2xl font-extrabold text-purple-600">{pendentesClassificacao}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Progress Card */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-md">
        <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 flex-1 w-full">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                Status da Higienização AI
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <h3 className="text-lg font-bold text-white">
                {classificadosCount} de {totalContacts} contatos qualificados
              </h3>
              <span className="text-sm font-bold text-indigo-300">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2.5 bg-slate-800" />
          </div>

          <Button
            onClick={handleClassifyAllPending}
            disabled={classifyingBatch || pendentesClassificacao === 0}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold text-xs h-10 px-5 gap-2 shadow-sm shrink-0 w-full md:w-auto"
          >
            {classifyingBatch ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Classificando ({batchProgress}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Classificar pendentes ({pendentesClassificacao})</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Empty State Guard */}
      {!loading && totalContacts === 0 && (
        <Card className="text-center p-12 border-dashed border-2 border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhum contato cadastrado no mailing (lista)
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            Importe uma planilha em formato CSV para iniciar a qualificação dos dados com
            inteligência artificial.
          </p>
          <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Link to="/importar">
              <Upload className="w-4 h-4" />
              <span>Importar mailing</span>
            </Link>
          </Button>
        </Card>
      )}

      {/* Analytics Charts Row */}
      {totalContacts > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* RSVP Donut */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900">Distribuição RSVP</CardTitle>
              <CardDescription className="text-xs">
                Confirmações no mailing (lista) atual
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-0">
              <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rsvpChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {rsvpChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="flex justify-center gap-4 text-xs font-medium text-slate-600 -mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Confirmou
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Aguardando
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Recusou
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Seniority Bar Chart */}
          <Card className="border-slate-200 shadow-xs md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900">
                Senioridade por Categoria de Cargo
              </CardTitle>
              <CardDescription className="text-xs">
                Volume de inscritos por nível hierárquico
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-0">
              <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={roleChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Interests Chart & Recent Contacts Table */}
      {totalContacts > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interests Chart */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900">
                Top Interesses Mapeados
              </CardTitle>
              <CardDescription className="text-xs">
                Assuntos mais relevantes entre os participantes
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72 pt-0">
              {interestsChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Nenhum interesse classificado ainda
                </div>
              ) : (
                <ChartContainer config={{}} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={interestsChartData}
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Contacts List */}
          <Card className="border-slate-200 shadow-xs lg:col-span-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Últimos Contatos Adicionados
                </CardTitle>
                <CardDescription className="text-xs">
                  Visualização rápida da base do mailing (lista)
                </CardDescription>{' '}
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs text-indigo-600 gap-1">
                <Link to="/contatos">
                  <span>Ver todos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {contacts.slice(0, 5).map((contact) => (
                  <Link
                    key={contact.id}
                    to={`/contatos/${contact.id}`}
                    className="p-3.5 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {contact.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{contact.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {contact.company || 'Sem empresa'} • {contact.raw_role || 'Sem cargo'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          contact.rsvp === 'Confirmou'
                            ? 'bg-emerald-50 text-emerald-700'
                            : contact.rsvp === 'Recusou'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                        }
                      >
                        {contact.rsvp || 'Aguardando'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          contact.classification_status === 'Classificado'
                            ? 'border-indigo-200 text-indigo-700 bg-indigo-50/50'
                            : 'text-slate-500'
                        }
                      >
                        {contact.classification_status || 'Pendente'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

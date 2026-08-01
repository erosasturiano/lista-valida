import { Link } from 'react-router-dom'
import {
  Globe,
  Mail,
  CheckCircle2,
  ArrowLeft,
  Server,
  ShieldCheck,
  ExternalLink,
  Send,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function DomainSettings() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-12">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link to="/campanhas">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Configurações de Domínio
          </h1>
          <p className="text-xs text-slate-500">
            Conecte listavalida.com.br e ative o envio real de e-mails
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            Domínio Personalizado
          </CardTitle>
          <CardDescription className="text-xs">
            Aponte listavalida.com.br para a aplicação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <p className="text-xs font-bold text-slate-700">Registro DNS — CNAME</p>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <p className="text-slate-400">Tipo</p>
                <p className="font-mono font-bold text-slate-800">CNAME</p>
              </div>
              <div>
                <p className="text-slate-400">Nome / Host</p>
                <p className="font-mono font-bold text-slate-800">@ ou www</p>
              </div>
              <div>
                <p className="text-slate-400">Valor / Destino</p>
                <p className="font-mono font-bold text-slate-800">listavalida.goskip.app</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Passo a passo:</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Acesse o painel do seu registrador de domínio (Registro.br, GoDaddy, etc.)</li>
              <li>Localize a seção de gerenciamento de DNS / Zone Records</li>
              <li>Adicione um registro CNAME apontando para listavalida.goskip.app</li>
              <li>Salve e aguarde a propagação DNS (até 30 minutos)</li>
            </ol>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>
              Após propagar, solicite a ativação do domínio personalizado na plataforma Skip Cloud.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" />
            Configuração do Resend
          </CardTitle>
          <CardDescription className="text-xs">
            Domínio de envio verificado para entrega de e-mails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              RESEND_API_KEY configurada
            </Badge>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Para enviar de @listavalida.com.br:</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>
                Acesse{' '}
                <a
                  href="https://resend.com/domains"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline inline-flex items-center gap-0.5"
                >
                  resend.com/domains <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Clique em "Add Domain" e insira listavalida.com.br</li>
              <li>Adicione os registros DNS exibidos (SPF, DKIM, DMARC) no seu registrador</li>
              <li>Aguarde a verificação automática (verde = verificado)</li>
            </ol>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-700">
            <p className="font-semibold mb-0.5">Importante</p>
            <p>
              O sender_email das campanhas deve usar um domínio verificado no Resend (ex:
              contato@listavalida.com.br). E-mails de domínios não verificados serão rejeitados.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Verificação
          </CardTitle>
          <CardDescription className="text-xs">Confirme que tudo está funcionando</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1.5 text-xs text-slate-600">
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>
                Acesse{' '}
                <a
                  href="https://listavalida.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline inline-flex items-center gap-0.5"
                >
                  https://listavalida.com.br <ExternalLink className="w-3 h-3" />
                </a>{' '}
                e confirme que a aplicação carrega com HTTPS
              </li>
              <li>Crie uma campanha de teste com alguns contatos</li>
              <li>Dispare a campanha e verifique se os e-mails chegam na caixa de entrada</li>
              <li>Confirme no Relatório de Entregas que aberturas e cliques são registrados</li>
            </ol>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 mt-2"
          >
            <Link to="/campanhas">
              <Send className="w-3.5 h-3.5" />
              Ir para Campanhas
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

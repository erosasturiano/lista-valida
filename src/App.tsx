/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import Index from './pages/Index'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import ContactDetail from './pages/ContactDetail'
import Import from './pages/Import'
import Events from './pages/Events'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Templates from './pages/Templates'
import ReportDeliveries from './pages/ReportDeliveries'
import DomainSettings from './pages/DomainSettings'
import BlockedContacts from './pages/BlockedContacts'
import Unsubscribe from './pages/Unsubscribe'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Users from './pages/Users'
import AccountSettings from './pages/AccountSettings'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

// Carregada sob demanda: a landing usa WebGL (ogl, ~90 kB) que nenhuma outra
// tela precisa - sem o lazy, o login baixaria a biblioteca a toa.
const Landing = lazy(() => import('./pages/Landing'))

// ONLY IMPORT AND RENDER WORKING PAGES, NEVER ADD PLACEHOLDER COMPONENTS OR PAGES IN THIS FILE
// AVOID REMOVING ANY CONTEXT PROVIDERS FROM THIS FILE (e.g. TooltipProvider, Toaster, Sonner)

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/descadastrar/:logId" element={<Unsubscribe />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />
          {/* Landing publica na raiz: fora do Layout, sem sidebar nem topbar. */}
          <Route
            path="/"
            element={
              <Suspense fallback={<div className="min-h-screen w-full bg-white" />}>
                <Landing />
              </Suspense>
            }
          />
          {/* Porta de entrada da aplicacao. Fica fora do Layout de proposito:
              e a tela de login, e o Layout redireciona quem nao tem sessao
              para ca - envolver os dois criaria um laco de redirecionamento.
              Com sessao ativa, Index manda direto para /dashboard. */}
          <Route path="/app" element={<Index />} />
          {/* A landing morava em /landing antes de assumir a raiz. */}
          <Route path="/landing" element={<Navigate to="/" replace />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contatos" element={<Contacts />} />
            <Route path="/contatos/:id" element={<ContactDetail />} />
            <Route path="/importar" element={<Import />} />
            <Route path="/modelos" element={<Templates />} />
            <Route path="/campanhas" element={<Campaigns />} />
            <Route path="/campanhas/:id" element={<CampaignDetail />} />
            <Route path="/relatorio-entregas" element={<ReportDeliveries />} />
            <Route path="/configuracoes" element={<DomainSettings />} />
            <Route path="/bloqueados" element={<BlockedContacts />} />
            <Route path="/eventos" element={<Events />} />
            <Route path="/conta" element={<AccountSettings />} />
            <Route path="/usuarios" element={<Users />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App

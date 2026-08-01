import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { EventProvider } from '@/contexts/event-context'
import { Sheet, SheetContent } from '@/components/ui/sheet'

export default function Layout() {
  const { isAuthenticated, loading } = useAuth()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Carregando MailFlow...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <EventProvider>
      <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block h-full">
          <Sidebar />
        </div>

        {/* Mobile Drawer */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            className="p-0 w-64 bg-slate-900 border-r border-slate-800 text-slate-100"
          >
            <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Topbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </EventProvider>
  )
}

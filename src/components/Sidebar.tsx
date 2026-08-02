import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Upload,
  Calendar,
  LogOut,
  Sparkles,
  X,
  Mail,
  FileText,
  BarChart3,
  Ban,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onCloseMobile?: () => void
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const { user, isAdmin, signOut } = useAuth()

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Contatos', path: '/contatos', icon: Users },
    { label: 'Importar', path: '/importar', icon: Upload },
    { label: 'Modelos de E-mail', path: '/modelos', icon: FileText },
    { label: 'Campanhas', path: '/campanhas', icon: Mail },
    { label: 'Relatório de Entregas', path: '/relatorio-entregas', icon: BarChart3 },
    { label: 'Lista de bloqueados', path: '/bloqueados', icon: Ban },
    { label: 'Minha Conta', path: '/conta', icon: Settings },
    ...(isAdmin ? [{ label: 'Usuários', path: '/usuarios', icon: ShieldCheck }] : []),
    { label: 'Mailing (listas)', path: '/eventos', icon: Calendar },
  ]

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800">
      <div className="p-5 flex items-center justify-between border-b border-slate-800">
        <Link to="/dashboard" className="flex items-center gap-3" onClick={onCloseMobile}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-indigo-400 flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight block text-white">
              Lista Válida
            </span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
              Higienização AI
            </span>
          </div>
        </Link>
        {onCloseMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all relative group',
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r" />
              )}
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform group-hover:scale-105',
                  isActive ? 'text-white' : 'text-slate-400',
                )}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-indigo-500/30">
            <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
              {getInitials(user?.name || user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {user?.name || 'Usuário'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title="Sair"
            className="text-slate-400 hover:text-red-400 hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}

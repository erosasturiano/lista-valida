import { Link } from 'react-router-dom'
import { Menu, Upload, Calendar, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useEventContext } from '@/contexts/event-context'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface TopbarProps {
  onOpenMobileSidebar: () => void
}

export function Topbar({ onOpenMobileSidebar }: TopbarProps) {
  const { user, signOut } = useAuth()
  const { events, selectedEventId, setSelectedEventId } = useEventContext()

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
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-16 px-4 lg:px-6 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileSidebar}
          className="lg:hidden text-slate-600 hover:text-slate-900"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Global Event Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600 hidden sm:inline-block" />
          <span className="text-xs font-semibold text-slate-500 hidden md:inline-block">
            Mailing (lista):
          </span>
          <Select value={selectedEventId || ''} onValueChange={(val) => setSelectedEventId(val)}>
            <SelectTrigger className="w-[180px] sm:w-[220px] h-9 text-xs font-medium bg-slate-50 border-slate-200 focus:ring-indigo-500">
              <SelectValue placeholder="Selecione um mailing (lista)" />
            </SelectTrigger>
            <SelectContent>
              {events.map((evt) => (
                <SelectItem key={evt.id} value={evt.id} className="text-xs">
                  {evt.name}
                </SelectItem>
              ))}
              {events.length === 0 && (
                <SelectItem value="empty" disabled className="text-xs">
                  Nenhum mailing (lista) encontrado
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Action Button */}
        <Button
          asChild
          size="sm"
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-xs text-xs gap-1.5 h-9"
        >
          <Link to="/importar">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar contatos</span>
          </Link>
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9 border border-indigo-100">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">
                  {getInitials(user?.name || user?.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-slate-900 leading-none">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-xs text-slate-500 leading-none">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

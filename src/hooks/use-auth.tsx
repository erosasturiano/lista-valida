import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import supabase from '@/lib/supabase/client'
import pb from '@/lib/pocketbase/client'

export interface AuthUser {
  id: string
  email: string
  name?: string
  role: 'admin' | 'user'
  sender_name?: string
  sender_email?: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (data: { sender_name?: string; sender_email?: string }) => Promise<{ error: Error | null }>
  refreshSession: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadUser = async (session: Session | null) => {
    if (!session) {
      setUser(null)
      setLoading(false)
      return
    }
    const profile = await fetchProfile(session.user.id)
    setUser(buildAuthUser(session, profile))
    setLoading(false)
  }

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: name || email.split('@')[0],
        role: 'user',
      })
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    await syncLegacyPocketBaseSession(email, password)
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    pb.authStore.clear()
  }

  const updateProfile = async (data: { sender_name?: string; sender_email?: string }) => {
    if (!user) return { error: new Error('Não autenticado') }
    const { error } = await supabase.rpc('update_own_profile', {
      p_sender_name: data.sender_name ?? null,
      p_sender_email: data.sender_email ?? null,
    })
    if (error) return { error }
    setUser({ ...user, ...data })
    return { error: null }
  }

  const refreshSession = async () => {
    const { data } = await supabase.auth.refreshSession()
    await loadUser(data.session)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        signUp,
        signIn,
        signOut,
        updateProfile,
        refreshSession,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

async function fetchProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('sender_name, sender_email')
    .eq('id', userId)
    .maybeSingle()
  return data
}

function buildAuthUser(
  session: Session,
  profile: { sender_name: string | null; sender_email: string | null } | null,
): AuthUser {
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: (session.user.user_metadata?.name as string | undefined) ?? undefined,
    role: (session.user.app_metadata?.role as 'admin' | 'user') ?? 'user',
    sender_name: profile?.sender_name ?? undefined,
    sender_email: profile?.sender_email ?? undefined,
  }
}

// Shim transitorio (estrategia Strangler Fig): enquanto nem todo service
// do frontend migrou para o Supabase (fase 5), as telas que ainda falam
// com o PocketBase precisam de uma sessao propria valida ali, em
// paralelo a sessao Supabase. Best-effort: se falhar (ex.: usuario que so
// existe de um lado ainda), a sessao Supabase segue valendo normalmente -
// so as telas ainda nao migradas param de funcionar para esse usuario
// especifico ate a fase 5/6 fecharem. Remover isto (e a dependencia de
// pocketbase) faz parte da fase 7 (limpeza final).
async function syncLegacyPocketBaseSession(email: string, password: string) {
  try {
    await pb.collection('users').authWithPassword(email, password)
  } catch {
    pb.authStore.clear()
  }
}

async function createLegacyPocketBaseUser(email: string, password: string, name?: string) {
  try {
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name: name || email.split('@')[0],
      // O hook set_owner.js deveria forcar isto no servidor (nunca confiar
      // no client para o role real), mas a validacao de campo obrigatorio
      // roda antes do hook aplicar nessa instancia - mandar 'user' aqui so
      // desbloqueia a validacao, nao contorna a seguranca: o hook, quando
      // roda, sobrescreve para 'user' de qualquer forma para quem nao e admin.
      role: 'user',
    })
    await pb.collection('users').authWithPassword(email, password)
  } catch {
    pb.authStore.clear()
  }
}

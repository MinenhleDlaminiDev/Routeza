import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured } from './backend'
import {
  getSession,
  onAuthChange,
  signInWithGoogle,
  signOut,
} from './backend/auth'

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out'

interface AuthState {
  status: AuthStatus
  session: Session | null
  user: User | null
  error: string | null
  signIn: () => Promise<{ error?: string }>
  logOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  // Start in 'loading' only when a backend exists to check against.
  status: isSupabaseConfigured ? 'loading' : 'signed-out',
  session: null,
  user: null,
  error: null,

  signIn: async () => {
    set({ error: null })
    const { error } = await signInWithGoogle()
    if (error) set({ error })
    // On success the browser redirects; onAuthChange updates state on return.
    return { error }
  },

  logOut: async () => {
    await signOut()
    // onAuthChange will flip status to 'signed-out'.
  },
}))

function applySession(session: Session | null) {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    status: session ? 'signed-in' : 'signed-out',
  })
}

/**
 * Wire Supabase auth into the store. Call once at app start; returns an
 * unsubscribe function. No-op when the backend isn't configured.
 */
export function initAuth(): () => void {
  if (!isSupabaseConfigured) return () => {}
  void getSession().then(applySession)
  return onAuthChange(applySession)
}

if (import.meta.env.DEV) {
  // Exposed for manual testing of signed-in UI without a real OAuth round-trip.
  ;(window as unknown as { __auth?: unknown }).__auth = useAuthStore
}

import { useStore } from '../store'
import { useAuthStore } from '../authStore'
import { isSupabaseConfigured } from '../backend'

/**
 * Header button that opens the Account sheet. Shows the signed-in user's
 * initial. Renders nothing in local-only mode (no backend / no user).
 */
export default function AccountButton() {
  const user = useAuthStore((s) => s.user)
  const openAccount = useStore((s) => s.openAccount)

  if (!isSupabaseConfigured || !user) return null
  const initial = (user.email ?? '?').charAt(0).toUpperCase()

  return (
    <button
      type="button"
      onClick={() => openAccount(true)}
      aria-label="Account"
      className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent-soft font-mono text-[14px] font-600 text-accent transition-colors hover:brightness-95"
    >
      {initial}
    </button>
  )
}

import { useSyncStore } from '../syncStore'
import { useAuthStore } from '../authStore'
import { isSupabaseConfigured } from '../backend'

/**
 * Small status chip so drivers know their work is saved.
 *  - Offline           → "Offline · saved here"
 *  - Online + pending  → "Saving…"
 *  - Online + synced   → nothing (stay out of the way)
 */
export default function SyncIndicator() {
  const online = useSyncStore((s) => s.online)
  const pending = useSyncStore((s) => s.pending)
  const user = useAuthStore((s) => s.user)

  if (!isSupabaseConfigured || !user) return null
  if (online && !pending) return null

  const offline = !online
  const label = offline ? 'Offline · saved here' : 'Saving…'
  const cls = offline
    ? 'bg-skipped-bg text-skipped-text'
    : 'bg-accent-soft text-accent'

  return (
    <span
      className={`inline-flex flex-none items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] font-600 ${cls}`}
      role="status"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${offline ? 'bg-skipped-pin' : 'bg-accent'}`}
        aria-hidden
      />
      {label}
    </span>
  )
}

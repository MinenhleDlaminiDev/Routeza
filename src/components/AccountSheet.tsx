import { useAuthStore } from '../authStore'
import Sheet from './Sheet'

interface AccountSheetProps {
  open: boolean
  onClose: () => void
}

export default function AccountSheet({ open, onClose }: AccountSheetProps) {
  const user = useAuthStore((s) => s.user)
  const logOut = useAuthStore((s) => s.logOut)

  const handleSignOut = async () => {
    onClose()
    await logOut()
  }

  const email = user?.email ?? 'Signed in'
  const initial = (user?.email ?? '?').charAt(0).toUpperCase()

  return (
    <Sheet open={open} onClose={onClose} labelledBy="account-title">
      <div className="px-5 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-hairline" />
        <h2 id="account-title" className="mb-5 text-[18px] font-700 text-ink">
          Account
        </h2>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-accent-soft font-mono text-[18px] font-600 text-accent">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] text-muted">Signed in as</div>
            <div className="ellipsis text-[15px] font-600 text-ink">{email}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="w-full rounded-[14px] border border-hairline bg-surface px-5 py-[14px] text-[16px] font-600 text-failed-text transition-colors hover:bg-failed-bg"
        >
          Sign out
        </button>
      </div>
    </Sheet>
  )
}

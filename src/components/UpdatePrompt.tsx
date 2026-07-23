import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Shows a small "Update available" toast when a new app version is ready.
 * The driver chooses when to reload, so the PWA never refreshes mid-delivery.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5">
      <div className="pointer-events-auto flex w-full max-w-[440px] items-center gap-3 rounded-[14px] border border-hairline bg-surface px-4 py-3 shadow-sheet">
        <div className="flex-1 text-[14px] text-ink">A new version is ready.</div>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-[10px] px-3 py-2 text-[13px] font-600 text-muted transition-colors hover:bg-app"
        >
          Later
        </button>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="rounded-[10px] bg-accent px-3 py-2 text-[13px] font-600 text-white transition-colors hover:bg-accent-hover"
        >
          Update
        </button>
      </div>
    </div>
  )
}

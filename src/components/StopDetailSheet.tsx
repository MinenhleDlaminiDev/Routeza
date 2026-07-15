import type { DerivedStop, Settings, StopStatus } from '../types'
import { statusStyle } from '../lib/statusStyle'
import { formatEta } from '../lib/format'
import Sheet from './Sheet'

interface StopDetailSheetProps {
  d: DerivedStop | null
  settings: Settings
  onClose: () => void
  onStatus: (id: string, status: StopStatus) => void
}

export default function StopDetailSheet({
  d,
  settings,
  onClose,
  onStatus,
}: StopDetailSheetProps) {
  const open = d !== null
  const stop = d?.stop

  const googleUrl = stop
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        stop.address,
      )}`
    : '#'
  const appleUrl = stop
    ? `http://maps.apple.com/?daddr=${encodeURIComponent(stop.address)}`
    : '#'

  const setStatus = (status: StopStatus) => {
    if (!stop) return
    onStatus(stop.id, status)
    onClose()
  }

  const st = stop ? statusStyle(stop.status, d!.isCurrent) : null

  return (
    <Sheet open={open} onClose={onClose} labelledBy="stop-sheet-title">
      {stop && st && (
        <div className="px-5 pb-7 pt-3">
          {/* Grip */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-hairline" />

          {/* Header */}
          <div className="mb-4 flex items-start gap-3">
            <div
              className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border-2 border-white font-mono text-[14px] font-600 shadow-[0_1px_3px_rgba(0,0,0,.14)]"
              style={{ background: st.pinColor, color: st.pinInk }}
              aria-hidden
            >
              {st.mark ?? d!.order}
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="stop-sheet-title"
                className="ellipsis text-[18px] font-700 text-ink"
              >
                {stop.name || stop.address}
              </h2>
              {stop.name && (
                <div className="ellipsis text-[14px] text-muted">
                  {stop.address}
                </div>
              )}
              <div className="mt-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-600 ${st.bgClass} ${st.textClass}`}
                >
                  {st.label} · {formatEta(settings.startHour, d!.etaMinutes)}
                </span>
              </div>
            </div>
          </div>

          {/* Navigate actions */}
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-accent px-5 py-[14px] text-[16px] font-600 text-white shadow-cta transition-colors hover:bg-accent-hover"
          >
            Navigate — Google Maps
          </a>
          <a
            href={appleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[14px] border border-hairline bg-surface px-5 py-[14px] text-[16px] font-600 text-ink transition-colors hover:bg-app"
          >
            Open in Apple Maps
          </a>

          {/* Status row */}
          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={() => setStatus('delivered')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[13px] bg-delivered-bg px-4 py-[13px] text-[15px] font-600 text-delivered-text transition-opacity hover:opacity-85"
            >
              <span aria-hidden>✓</span> Delivered
            </button>
            <button
              type="button"
              onClick={() => setStatus('failed')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[13px] bg-failed-bg px-4 py-[13px] text-[15px] font-600 text-failed-text transition-opacity hover:opacity-85"
            >
              <span aria-hidden>✕</span> Failed
            </button>
          </div>

          {/* Skip / reset */}
          <button
            type="button"
            onClick={() =>
              setStatus(stop.status === 'skipped' ? 'pending' : 'skipped')
            }
            className="mt-2.5 w-full rounded-[13px] px-4 py-[13px] text-[15px] font-600 text-muted transition-colors hover:bg-app"
          >
            {stop.status === 'skipped' ? 'Un-skip' : 'Skip for now'}
          </button>

          {stop.status !== 'pending' && stop.status !== 'skipped' && (
            <button
              type="button"
              onClick={() => setStatus('pending')}
              className="mt-1 w-full rounded-[13px] px-4 py-2.5 text-[14px] font-500 text-muted transition-colors hover:bg-app"
            >
              Reset to pending
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}

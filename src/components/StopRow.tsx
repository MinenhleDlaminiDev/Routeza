import type { DerivedStop, Settings } from '../types'
import { statusStyle } from '../lib/statusStyle'
import { formatEta, formatMiles } from '../lib/format'

interface StopRowProps {
  d: DerivedStop
  settings: Settings
  onTap: (id: string) => void
}

export default function StopRow({ d, settings, onTap }: StopRowProps) {
  const st = statusStyle(d.stop.status, d.isCurrent)
  const failed = d.stop.geocodeFailed

  return (
    <button
      type="button"
      onClick={() => onTap(d.stop.id)}
      className="row-press flex w-full items-center gap-3 border-b border-hairline2 bg-surface px-4 py-3 text-left last:border-b-0"
    >
      {/* Status circle */}
      <div
        className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-2 border-white font-mono text-[13px] font-600 shadow-[0_1px_3px_rgba(0,0,0,.14)]"
        style={{ background: st.pinColor, color: st.pinInk }}
        aria-hidden
      >
        {st.mark ?? d.order}
      </div>

      {/* Name / address / pill */}
      <div className="min-w-0 flex-1">
        <div className="ellipsis text-[16px] font-600 text-ink">
          {d.stop.name || d.stop.address}
        </div>
        <div className="ellipsis text-[13px] text-muted">
          {d.stop.name ? d.stop.address : ' '}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-600 ${st.bgClass} ${st.textClass}`}
          >
            {st.label}
          </span>
          {failed && (
            <span className="inline-flex items-center rounded-full bg-failed-bg px-2 py-0.5 font-mono text-[11px] font-600 text-failed-text">
              Couldn't locate
            </span>
          )}
        </div>
      </div>

      {/* ETA + leg distance */}
      <div className="flex flex-none flex-col items-end">
        <span className="font-mono text-[13px] font-600 text-ink">
          {formatEta(settings.startHour, d.etaMinutes)}
        </span>
        <span className="mt-0.5 font-mono text-[12px] text-muted">
          {formatMiles(d.legMiles)}
        </span>
      </div>
    </button>
  )
}

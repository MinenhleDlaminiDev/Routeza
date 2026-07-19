import { useEffect, useState } from 'react'
import { DEFAULT_DEPOT, useStore } from '../store'
import { SAMPLE_ADDRESSES } from '../data/sampleAddresses'
import AccountButton from './AccountButton'

export default function AddScreen() {
  const stops = useStore((s) => s.stops)
  const setStopsFromText = useStore((s) => s.setStopsFromText)
  const optimize = useStore((s) => s.optimize)
  const optimizing = useStore((s) => s.optimizing)
  const locationStatus = useStore((s) => s.locationStatus)
  const useCurrentLocation = useStore((s) => s.useCurrentLocation)
  const depot = useStore((s) => s.settings.depot)
  // The saved depot differs from the default once the driver has used GPS.
  const isCustomDepot =
    depot.lat !== DEFAULT_DEPOT.lat || depot.lng !== DEFAULT_DEPOT.lng

  // The raw text mirrors the parsed stops; seed from existing stops, or the
  // sample batch on a fresh start.
  const [raw, setRaw] = useState(
    () => stops.map((s) => s.address).join('\n') || SAMPLE_ADDRESSES,
  )
  const [editing, setEditing] = useState(false)

  // If we seeded from the sample (no persisted stops), parse it into the store once.
  useEffect(() => {
    if (stops.length === 0 && raw.trim()) setStopsFromText(raw)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the store's parsed stops in sync with the textarea while editing.
  const applyRaw = (text: string) => {
    setRaw(text)
    setStopsFromText(text)
  }

  const canOptimize = stops.length > 0 && !optimizing

  return (
    <div className="relative flex h-full flex-col bg-app">
      <div className="flex-1 overflow-y-auto px-5 pb-40 pt-7">
        {/* Header block */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 font-mono text-[11px] font-500 uppercase tracking-[0.14em] text-muted">
              New route
            </div>
            <h1 className="text-[23px] font-700 leading-tight text-ink">
              Today's deliveries
            </h1>
            <p className="mt-1 text-[14px] text-muted">
              {stops.length} {stops.length === 1 ? 'stop' : 'stops'} · gig
              delivery
            </p>
          </div>
          <AccountButton />
        </div>

        {/* Start point */}
        <div className="mb-6 flex items-center justify-between gap-3 rounded-[14px] border border-hairline bg-surface p-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-600 text-ink">Start point</div>
            <div className="ellipsis text-[12px] text-muted">
              {startPointStatus(locationStatus, isCustomDepot)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void useCurrentLocation()}
            disabled={locationStatus === 'locating'}
            className="flex flex-none items-center gap-1.5 rounded-[11px] border border-hairline bg-app px-3 py-2 text-[13px] font-600 text-accent transition-colors hover:bg-accent-soft disabled:opacity-60"
          >
            <LocationIcon />
            {locationStatus === 'locating'
              ? 'Locating…'
              : locationStatus === 'granted'
                ? 'Update'
                : 'Use my location'}
          </button>
        </div>

        {/* Pasted addresses card */}
        <div className="mb-6 rounded-[14px] border border-hairline bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] font-500 uppercase tracking-[0.12em] text-muted">
              Pasted addresses
            </span>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-lg px-2 py-1 text-[13px] font-600 text-accent hover:bg-accent-soft"
            >
              {editing ? 'Done' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <textarea
              value={raw}
              onChange={(e) => applyRaw(e.target.value)}
              spellCheck={false}
              rows={10}
              placeholder="One address per line…"
              className="w-full resize-y rounded-[10px] border border-hairline bg-app p-3 font-mono text-[12.5px] leading-relaxed text-ink outline-none focus:border-accent"
            />
          ) : (
            <pre className="max-h-28 overflow-hidden whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-muted">
              {raw.trim() || 'No addresses yet.'}
            </pre>
          )}
        </div>

        {/* Queued stops */}
        <div className="mb-3 flex items-baseline gap-2">
          <span className="font-mono text-[13px] font-600 text-ink">
            {stops.length}
          </span>
          <span className="text-[13px] font-600 text-ink">stops queued</span>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-hairline bg-surface">
          {stops.length === 0 ? (
            <div className="px-4 py-10 text-center text-[14px] text-muted">
              Paste addresses above to get started.
            </div>
          ) : (
            stops.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-3 border-b border-hairline2 px-4 py-3 last:border-b-0"
              >
                <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-app font-mono text-[12px] font-600 text-muted">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="ellipsis text-[15px] font-600 text-ink">
                    {s.name || s.address}
                  </div>
                  {s.name ? (
                    <div className="ellipsis text-[13px] text-muted">
                      {s.address}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sticky CTA over a fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 pt-10">
        <div
          className="h-full w-full"
          style={{
            background:
              'linear-gradient(to top, #FBFBFA 55%, rgba(251,251,250,0))',
          }}
        >
          <div className="pointer-events-auto px-5 pb-6 pt-2">
            <button
              type="button"
              disabled={!canOptimize}
              onClick={() => void optimize()}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-accent px-5 py-[15px] text-[16px] font-600 text-white shadow-cta transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-[#B8C6E8] disabled:shadow-none"
            >
              {optimizing ? 'Optimizing…' : 'Optimize route'}
              {!optimizing && <span aria-hidden>→</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function startPointStatus(status: string, isCustomDepot: boolean): string {
  // Live states during a session take priority; otherwise derive from the
  // actual saved depot so the label stays correct across reloads.
  if (status === 'locating') return 'Getting your location…'
  if (status === 'denied' && !isCustomDepot) {
    return "Couldn't get location — using default"
  }
  if (isCustomDepot) return 'Using your current location'
  return 'Default — Johannesburg'
}

function LocationIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

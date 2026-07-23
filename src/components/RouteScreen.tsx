import { useMemo } from 'react'
import { useStore } from '../store'
import { computeStats, deriveStops } from '../lib/selectors'
import { formatClock, formatDuration } from '../lib/format'
import RouteMap from './RouteMap'
import StatBar from './StatBar'
import StopList from './StopList'
import AccountButton from './AccountButton'
import SyncIndicator from './SyncIndicator'

export default function RouteScreen() {
  const stops = useStore((s) => s.stops)
  const routeResult = useStore((s) => s.routeResult)
  const settings = useStore((s) => s.settings)
  const setView = useStore((s) => s.setView)
  const selectStop = useStore((s) => s.selectStop)
  const openSettings = useStore((s) => s.openSettings)
  const optimizing = useStore((s) => s.optimizing)

  const derived = useMemo(
    () => deriveStops(stops, routeResult, settings),
    [stops, routeResult, settings],
  )
  const stats = useMemo(
    () => computeStats(stops, routeResult, settings),
    [stops, routeResult, settings],
  )

  const summary = `${stats.total} ${
    stats.total === 1 ? 'stop' : 'stops'
  } · ${formatDuration(stats.totalDriveMin)} drive · done by ${formatClock(
    stats.doneByHour,
  )}`

  return (
    <div className="relative flex h-full flex-col bg-app">
      {/* Re-optimize progress (settings / GPS change) */}
      {optimizing && (
        <div className="absolute inset-x-0 top-0 z-30 h-[3px] overflow-hidden bg-transparent">
          <div className="bar-indeterminate" />
        </div>
      )}

      {/* Header */}
      <header className="flex items-center gap-3 border-b border-hairline bg-surface px-3 py-2.5">
        <button
          type="button"
          onClick={() => setView('add')}
          aria-label="Back to add stops"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[20px] text-ink transition-colors hover:bg-app"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-700 leading-tight text-ink">
            Optimized route
          </div>
          <div className="ellipsis font-mono text-[12px] text-muted">
            {summary}
          </div>
        </div>
        <SyncIndicator />
        <button
          type="button"
          onClick={() => openSettings(true)}
          aria-label="Route settings"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-ink transition-colors hover:bg-app"
        >
          <GearIcon />
        </button>
        <AccountButton />
      </header>

      {/* Scroll area: map + stats + list */}
      <div className="flex-1 overflow-y-auto">
        <RouteMap
          derived={derived}
          route={routeResult}
          settings={settings}
          onPinTap={selectStop}
        />
        <StatBar
          distance={`${stats.totalMiles.toFixed(1)} mi`}
          delivered={`${stats.deliveredCount}/${stats.total}`}
          remaining={`${stats.remaining}`}
        />
        <StopList derived={derived} settings={settings} onTap={selectStop} />
        <div className="h-8" />
      </div>
    </div>
  )
}

function GearIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

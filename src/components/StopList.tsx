import type { DerivedStop, Settings } from '../types'
import StopRow from './StopRow'

interface StopListProps {
  derived: DerivedStop[]
  settings: Settings
  onTap: (id: string) => void
}

// NOTE: For very large routes (~50+ stops) this list should be virtualized
// (e.g. @tanstack/react-virtual). A demo batch stays well under that, so we
// render rows directly to keep the scroll container simple.
export default function StopList({ derived, settings, onTap }: StopListProps) {
  const allDone =
    derived.length > 0 &&
    derived.every((d) => d.stop.status !== 'pending')

  return (
    <div className="bg-app">
      {allDone && (
        <div className="mx-4 mt-4 rounded-[14px] border border-delivered-bg bg-delivered-bg px-4 py-3">
          <div className="font-mono text-[11px] font-600 uppercase tracking-[0.1em] text-delivered-text">
            Route complete
          </div>
          <div className="mt-0.5 text-[14px] text-delivered-text">
            Every stop has been worked. Nice driving.
          </div>
        </div>
      )}
      <div className="mt-3">
        {derived.map((d) => (
          <StopRow key={d.stop.id} d={d} settings={settings} onTap={onTap} />
        ))}
      </div>
    </div>
  )
}

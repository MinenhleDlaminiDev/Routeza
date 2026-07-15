import { useMemo } from 'react'
import type { DerivedStop, RouteResult, Settings } from '../types'
import { statusStyle } from '../lib/statusStyle'

interface SchematicMapProps {
  derived: DerivedStop[]
  route: RouteResult | null
  settings: Settings
  onPinTap: (id: string) => void
}

interface Projected {
  x: number // 0-100 (% of width)
  y: number // 0-100 (% of height)
}

const PAD = 12 // percent padding so pins never touch the edges

/** Normalize lat/lng of all points (stops + depot) into a padded 0-100 box. */
function useProjection(derived: DerivedStop[], settings: Settings) {
  return useMemo(() => {
    const pts = derived
      .filter((d) => d.stop.lat != null && d.stop.lng != null)
      .map((d) => ({ lat: d.stop.lat!, lng: d.stop.lng! }))
    // `all` always contains at least the depot.
    const all = [...pts, settings.depot]
    const lats = all.map((p) => p.lat)
    const lngs = all.map((p) => p.lng)
    let minLat = Math.min(...lats)
    let maxLat = Math.max(...lats)
    let minLng = Math.min(...lngs)
    let maxLng = Math.max(...lngs)
    // Avoid divide-by-zero for degenerate spreads.
    if (maxLat - minLat < 1e-6) {
      minLat -= 0.01
      maxLat += 0.01
    }
    if (maxLng - minLng < 1e-6) {
      minLng -= 0.01
      maxLng += 0.01
    }
    const project = (p: { lat: number; lng: number }): Projected => {
      const fx = (p.lng - minLng) / (maxLng - minLng)
      const fy = (p.lat - minLat) / (maxLat - minLat)
      return {
        x: PAD + fx * (100 - 2 * PAD),
        // Invert Y so north is up.
        y: PAD + (1 - fy) * (100 - 2 * PAD),
      }
    }
    return { project }
  }, [derived, settings.depot])
}

/**
 * Schematic SVG map — the WebGL-unavailable fallback for the MapLibre map.
 * Projects coordinates into a padded box over a faux street grid.
 */
export default function SchematicMap({
  derived,
  route,
  settings,
  onPinTap,
}: SchematicMapProps) {
  const { project } = useProjection(derived, settings)

  const depot = project(settings.depot)

  // Route polyline: depot → each located stop in optimized order (+ return).
  const linePoints: string = useMemo(() => {
    const pts: Projected[] = [depot]
    for (const d of derived) {
      if (d.stop.lat == null || d.stop.lng == null) continue
      pts.push(project({ lat: d.stop.lat, lng: d.stop.lng }))
    }
    if (settings.roundTrip) pts.push(depot)
    return pts.map((p) => `${p.x},${p.y}`).join(' ')
  }, [derived, depot, project, settings.roundTrip])

  return (
    <div className="relative h-[184px] w-full overflow-hidden bg-map-base">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <rect x="0" y="0" width="100" height="100" fill="#E9EDF1" />
        <rect x="0" y="72" width="100" height="28" fill="#CDD9E5" />
        <rect x="78" y="0" width="22" height="60" fill="#CDD9E5" />
        <rect x="10" y="14" width="20" height="14" rx="2" fill="#DDE6DC" />
        <rect x="52" y="40" width="16" height="12" rx="2" fill="#DDE6DC" />
        <g stroke="#D6DDE5" strokeWidth="1.4">
          <line x1="0" y1="22" x2="100" y2="22" />
          <line x1="0" y1="42" x2="100" y2="42" />
          <line x1="0" y1="62" x2="100" y2="62" />
          <line x1="18" y1="0" x2="18" y2="100" />
          <line x1="40" y1="0" x2="40" y2="100" />
          <line x1="62" y1="0" x2="62" y2="100" />
          <line x1="84" y1="0" x2="84" y2="100" />
        </g>
        <g stroke="#DFE5EC" strokeWidth="0.7">
          <line x1="0" y1="32" x2="100" y2="32" />
          <line x1="0" y1="52" x2="100" y2="52" />
          <line x1="29" y1="0" x2="29" y2="100" />
          <line x1="51" y1="0" x2="51" y2="100" />
          <line x1="73" y1="0" x2="73" y2="100" />
        </g>

        {route && (
          <polyline
            points={linePoints}
            fill="none"
            stroke="#2F6BFF"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 3 }}
          />
        )}
      </svg>

      {/* Depot marker */}
      <div
        className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ left: `${depot.x}%`, top: `${depot.y}%` }}
        aria-hidden
      >
        <div className="h-3.5 w-3.5 rounded-[3px] border-2 border-white bg-ink shadow-[0_1px_3px_rgba(0,0,0,.3)]" />
      </div>

      {/* Stop pins */}
      {derived.map((d) => {
        if (d.stop.lat == null || d.stop.lng == null) return null
        const p = project({ lat: d.stop.lat, lng: d.stop.lng })
        const st = statusStyle(d.stop.status, d.isCurrent)
        return (
          <button
            key={d.stop.id}
            type="button"
            onClick={() => onPinTap(d.stop.id)}
            aria-label={`Stop ${d.order}: ${d.stop.name || d.stop.address}, ${st.label}`}
            className="absolute z-20 flex h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white font-mono text-[10px] font-600 shadow-[0_1px_4px_rgba(0,0,0,.28)]"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              background: st.pinColor,
              color: st.pinInk,
            }}
          >
            {st.mark ?? d.order}
          </button>
        )
      })}
    </div>
  )
}

import type {
  DerivedStop,
  RouteResult,
  Settings,
  Stop,
  StopStatus,
} from '../types'

export interface RouteStats {
  totalMiles: number
  totalDriveMin: number
  deliveredCount: number
  total: number
  remaining: number
  doneByHour: number // fractional hour-of-day
}

/** Miles for the leg that arrives at `stopId` (or the return leg for depot). */
function legMilesTo(route: RouteResult, stopId: string): number {
  const leg = route.legs.find((l) => l.toId === stopId)
  return leg ? leg.miles : 0
}

/**
 * Build the ordered, derived stop list. ETAs are computed live from settings so
 * changing start time / speed / round-trip updates everything without a
 * re-optimize.
 */
export function deriveStops(
  stops: Stop[],
  route: RouteResult | null,
  settings: Settings,
): DerivedStop[] {
  if (!route) return []
  const byId = new Map(stops.map((s) => [s.id, s]))
  const speed = Math.max(1, settings.avgSpeedMph)

  // First pending stop in optimized order is "current".
  const currentId = route.orderedStopIds.find(
    (id) => byId.get(id)?.status === 'pending',
  )

  const out: DerivedStop[] = []
  let tMinutes = 0 // minutes elapsed from shift start
  route.orderedStopIds.forEach((id, idx) => {
    const stop = byId.get(id)
    if (!stop) return
    const legMiles = legMilesTo(route, id)
    const driveMin = (legMiles / speed) * 60
    tMinutes += driveMin
    const arrival = tMinutes
    tMinutes += settings.serviceMinPerStop
    out.push({
      stop,
      located: true,
      order: idx + 1,
      isCurrent: id === currentId,
      etaMinutes: arrival,
      legMiles,
    })
  })

  // Append stops that couldn't be geocoded (not in the optimized route) so the
  // driver can still see and work them. They carry no order/ETA/leg.
  const orderedSet = new Set(route.orderedStopIds)
  for (const stop of stops) {
    if (orderedSet.has(stop.id)) continue
    out.push({
      stop,
      located: false,
      order: 0,
      isCurrent: false,
      etaMinutes: 0,
      legMiles: 0,
    })
  }
  return out
}

export function computeStats(
  stops: Stop[],
  route: RouteResult | null,
  settings: Settings,
): RouteStats {
  const total = stops.length
  const deliveredCount = stops.filter((s) => s.status === 'delivered').length
  const remaining = stops.filter((s) => s.status === 'pending').length

  if (!route) {
    return {
      totalMiles: 0,
      totalDriveMin: 0,
      deliveredCount,
      total,
      remaining,
      doneByHour: settings.startHour,
    }
  }

  const speed = Math.max(1, settings.avgSpeedMph)
  const totalMiles = route.legs.reduce((sum, l) => sum + l.miles, 0)
  const totalDriveMin = (totalMiles / speed) * 60
  const serviceTotal = settings.serviceMinPerStop * route.orderedStopIds.length
  const doneByHour = settings.startHour + (totalDriveMin + serviceTotal) / 60

  return {
    totalMiles,
    totalDriveMin,
    deliveredCount,
    total,
    remaining,
    doneByHour,
  }
}

export const STATUS_LABELS: Record<StopStatus | 'current', string> = {
  pending: 'Pending',
  current: 'Next stop',
  delivered: 'Delivered',
  failed: 'Failed',
  skipped: 'Skipped',
}

import type { LatLng, RouteLeg, RouteResult, Stop } from '../types'
import { haversineMiles } from './geo'

/**
 * Offline route optimizer: greedy nearest-neighbour tour + a 2-opt improvement
 * pass, with straight-line (haversine) distances. Used by the mock provider and
 * as the fallback when a real routing service (OSRM) is unavailable.
 *
 * Good enough for a demo/fallback; it does not scale well or optimally to ~100
 * stops — that's what the real optimization service is for.
 */
export function localOptimize(
  depot: LatLng,
  located: Stop[],
  opts: { roundTrip: boolean; avgSpeedMph: number },
): RouteResult {
  const order = nearestNeighbor(depot, located)
  twoOptImprove(depot, order, opts.roundTrip)

  const speed = Math.max(1, opts.avgSpeedMph)
  const legs: RouteLeg[] = []
  let totalMiles = 0
  let prev: LatLng = depot
  let prevId: string | 'depot' = 'depot'

  for (const s of order) {
    const here: LatLng = { lat: s.lat!, lng: s.lng! }
    const miles = haversineMiles(prev, here)
    const driveMin = (miles / speed) * 60
    legs.push({ fromId: prevId, toId: s.id, miles, driveMin })
    totalMiles += miles
    prev = here
    prevId = s.id
  }

  if (opts.roundTrip && order.length > 0) {
    const miles = haversineMiles(prev, depot)
    const driveMin = (miles / speed) * 60
    legs.push({ fromId: prevId, toId: 'depot', miles, driveMin })
    totalMiles += miles
  }

  const totalDriveMin = (totalMiles / speed) * 60

  return {
    orderedStopIds: order.map((s) => s.id),
    legs,
    totalMiles,
    totalDriveMin,
  }
}

/** Greedy nearest-neighbour tour starting from the depot. */
function nearestNeighbor(depot: LatLng, stops: Stop[]): Stop[] {
  const remaining = [...stops]
  const order: Stop[] = []
  let current: LatLng = depot
  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const s = remaining[i]
      const d = haversineMiles(current, { lat: s.lat!, lng: s.lng! })
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    const [next] = remaining.splice(bestIdx, 1)
    order.push(next)
    current = { lat: next.lat!, lng: next.lng! }
  }
  return order
}

/** In-place 2-opt improvement pass to untangle crossings. */
function twoOptImprove(depot: LatLng, order: Stop[], roundTrip: boolean): void {
  const n = order.length
  if (n < 4) return
  const pt = (s: Stop): LatLng => ({ lat: s.lat!, lng: s.lng! })
  const dist = (a: LatLng, b: LatLng) => haversineMiles(a, b)

  let improved = true
  let guard = 0
  while (improved && guard < 40) {
    improved = false
    guard++
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const a = i === 0 ? depot : pt(order[i - 1])
        const b = pt(order[i])
        const c = pt(order[k])
        // Node after the segment; for round trips the tail wraps to depot.
        const dNode =
          k === n - 1 ? (roundTrip ? depot : null) : pt(order[k + 1])
        if (dNode == null) {
          // Open route: reversing the tail changes only the a-b / a-c edge.
          const before = dist(a, b)
          const after = dist(a, c)
          if (after + 1e-9 < before) {
            reverse(order, i, k)
            improved = true
          }
          continue
        }
        const before = dist(a, b) + dist(c, dNode)
        const after = dist(a, c) + dist(b, dNode)
        if (after + 1e-9 < before) {
          reverse(order, i, k)
          improved = true
        }
      }
    }
  }
}

function reverse(arr: Stop[], i: number, k: number): void {
  while (i < k) {
    ;[arr[i], arr[k]] = [arr[k], arr[i]]
    i++
    k--
  }
}

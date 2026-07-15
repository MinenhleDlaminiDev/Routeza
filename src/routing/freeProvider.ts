import type { LatLng, RouteResult, Stop } from '../types'
import type { GeocodeResult, RoutingProvider } from './provider'
import { geocodeAddress } from './nominatim'
import { osrmTrip } from './osrm'
import { localOptimize } from '../lib/localOptimize'

/**
 * Free / open-source routing backend.
 *
 *   geocode()  → Nominatim (OpenStreetMap)
 *   optimize() → OSRM `trip` service, with a local nearest-neighbour fallback
 */
export class FreeRoutingProvider implements RoutingProvider {
  /**
   * Geocode each address via Nominatim (throttled + cached in nominatim.ts).
   * Runs sequentially to respect the ~1 req/sec usage policy. Addresses that
   * can't be located are flagged `failed` so the row shows a "couldn't locate"
   * chip; they're excluded from optimization later.
   */
  async geocode(stops: Stop[]): Promise<GeocodeResult[]> {
    const results: GeocodeResult[] = []
    for (const stop of stops) {
      const coord = await geocodeAddress(stop.address)
      if (coord) {
        results.push({ id: stop.id, lat: coord.lat, lng: coord.lng })
      } else {
        results.push({ id: stop.id, lat: 0, lng: 0, failed: true })
      }
    }
    return results
  }

  /**
   * Optimize via OSRM (real road order + distances + geometry). Falls back to
   * the local nearest-neighbour optimizer if OSRM is unreachable or errors, so
   * a route is always produced.
   */
  async optimize(
    depot: LatLng,
    stops: Stop[],
    opts: { roundTrip: boolean; avgSpeedMph: number },
  ): Promise<RouteResult> {
    const located = stops.filter(
      (s) => s.lat != null && s.lng != null && !s.geocodeFailed,
    )
    if (located.length === 0) {
      return { orderedStopIds: [], legs: [], totalMiles: 0, totalDriveMin: 0 }
    }
    try {
      return await osrmTrip(depot, located, { roundTrip: opts.roundTrip })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[routing] OSRM unavailable, using local fallback:', err)
      return localOptimize(depot, located, opts)
    }
  }
}

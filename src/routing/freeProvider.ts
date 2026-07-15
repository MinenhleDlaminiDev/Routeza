import type { LatLng, RouteResult, Stop } from '../types'
import type { GeocodeResult, RoutingProvider } from './provider'
import { geocodeAddress } from './nominatim'

/**
 * Free / open-source routing backend.
 *
 *   geocode()  → Nominatim (OpenStreetMap)   — implemented in step 1b
 *   optimize() → OSRM `trip` service          — implemented in step 1c
 *
 * Both methods are placeholders for now. The app defaults to the mock provider
 * (see config.ts / index.ts), so selecting 'free' before 1b/1c are done will
 * surface these clear errors rather than failing silently.
 *
 * Notes for 1c:
 *  - OSRM `trip` returns an optimized visiting order plus real road geometry;
 *    use it for the route line instead of straight point-to-point segments.
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

  async optimize(
    _depot: LatLng,
    _stops: Stop[],
    _opts: { roundTrip: boolean; avgSpeedMph: number },
  ): Promise<RouteResult> {
    throw new Error(
      'FreeRoutingProvider.optimize is not implemented yet (arrives in step 1c).',
    )
  }
}

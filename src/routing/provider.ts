import type { LatLng, RouteResult, Stop } from '../types'

export interface GeocodeResult {
  id: string
  lat: number
  lng: number
  failed?: boolean
}

/** Reports geocoding progress as addresses resolve, for a loading UI. */
export type GeocodeProgress = (done: number, total: number) => void

export interface RoutingProvider {
  /** Resolve each address to a coordinate. Order matches input; `failed` flags unresolved. */
  geocode(stops: Stop[], onProgress?: GeocodeProgress): Promise<GeocodeResult[]>
  /** Produce an optimized visiting order and legs starting from the depot. */
  optimize(
    depot: LatLng,
    stops: Stop[],
    opts: { roundTrip: boolean; avgSpeedMph: number },
  ): Promise<RouteResult>
}

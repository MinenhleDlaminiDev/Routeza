import type { LatLng, RouteResult, Stop } from '../types'
import { hashString } from '../lib/geo'
import { localOptimize } from '../lib/localOptimize'
import type { GeocodeResult, RoutingProvider } from './provider'

// City center to scatter mock geocodes around (Johannesburg-ish).
const CITY_CENTER: LatLng = { lat: -26.2041, lng: 28.0473 }
const SPREAD = 0.09 // ~6 miles of jitter in each direction

/** Deterministic pseudo-coordinate derived from the address text. */
function mockGeocode(address: string): LatLng {
  const h1 = hashString(address)
  const h2 = hashString(address + '#salt')
  const fx = (h1 % 10000) / 10000 - 0.5 // -0.5..0.5
  const fy = (h2 % 10000) / 10000 - 0.5
  return {
    lat: CITY_CENTER.lat + fy * SPREAD * 2,
    lng: CITY_CENTER.lng + fx * SPREAD * 2,
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export class MockRoutingProvider implements RoutingProvider {
  async geocode(stops: Stop[]): Promise<GeocodeResult[]> {
    await delay(450)
    return stops.map((s) => {
      // Simulate a rare geocode failure for obviously junk lines (very short).
      const failed = s.address.replace(/[^a-z0-9]/gi, '').length < 3
      const { lat, lng } = mockGeocode(s.address)
      return { id: s.id, lat, lng, failed }
    })
  }

  async optimize(
    depot: LatLng,
    stops: Stop[],
    opts: { roundTrip: boolean; avgSpeedMph: number },
  ): Promise<RouteResult> {
    await delay(400)
    const located = stops.filter(
      (s) => s.lat != null && s.lng != null && !s.geocodeFailed,
    )
    return localOptimize(depot, located, opts)
  }
}

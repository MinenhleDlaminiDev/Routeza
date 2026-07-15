import type { LatLng, RouteLeg, RouteResult, Stop } from '../types'

/**
 * Route optimization via the public OSRM `trip` service (solves a TSP-style
 * visiting order and returns real road distances + geometry).
 *
 * Public demo server (router.project-osrm.org) is fair-use only and caps the
 * number of coordinates; for production, self-host OSRM. Throws on any failure
 * so the caller can fall back to the local optimizer.
 */

const OSRM_URL = 'https://router.project-osrm.org/trip/v1/driving'
const METERS_PER_MILE = 1609.344

interface OsrmLeg {
  distance: number // meters
  duration: number // seconds
}
interface OsrmTrip {
  distance: number
  duration: number
  legs: OsrmLeg[]
  geometry: { coordinates: [number, number][] } // [lng, lat] pairs
}
interface OsrmWaypoint {
  waypoint_index: number
}
interface OsrmResponse {
  code: string
  trips?: OsrmTrip[]
  waypoints?: OsrmWaypoint[]
}

export async function osrmTrip(
  depot: LatLng,
  located: Stop[],
  opts: { roundTrip: boolean },
): Promise<RouteResult> {
  // depot is index 0; stops follow in input order.
  const points: LatLng[] = [depot, ...located.map((s) => ({ lat: s.lat!, lng: s.lng! }))]
  const coordStr = points.map((p) => `${p.lng},${p.lat}`).join(';')

  const params = new URLSearchParams({
    source: 'first', // keep the depot as the start
    roundtrip: String(opts.roundTrip),
    geometries: 'geojson',
    overview: 'full',
    annotations: 'false',
  })

  const res = await fetch(`${OSRM_URL}/${coordStr}?${params.toString()}`)
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)
  const data = (await res.json()) as OsrmResponse
  if (data.code !== 'Ok' || !data.trips?.[0] || !data.waypoints) {
    throw new Error(`OSRM response: ${data.code}`)
  }

  const trip = data.trips[0]

  // Map each input waypoint to its position in the optimized trip.
  // posToId[position] = stop id (or 'depot' at the start).
  const posToId: (string | 'depot')[] = new Array(points.length)
  data.waypoints.forEach((wp, inputIdx) => {
    posToId[wp.waypoint_index] = inputIdx === 0 ? 'depot' : located[inputIdx - 1].id
  })

  const orderedStopIds = posToId.filter((id): id is string => id !== 'depot')

  // OSRM legs are already in trip order; leg k connects position k → k+1.
  const legs: RouteLeg[] = trip.legs.map((leg, k) => {
    const toId = k + 1 < posToId.length ? posToId[k + 1] : 'depot' // roundtrip wraps
    return {
      fromId: posToId[k],
      toId,
      miles: leg.distance / METERS_PER_MILE,
      driveMin: leg.duration / 60,
    }
  })

  const geometry: LatLng[] = trip.geometry.coordinates.map(([lng, lat]) => ({
    lat,
    lng,
  }))

  return {
    orderedStopIds,
    legs,
    totalMiles: trip.distance / METERS_PER_MILE,
    totalDriveMin: trip.duration / 60,
    geometry,
  }
}

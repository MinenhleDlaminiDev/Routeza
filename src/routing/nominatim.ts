import type { LatLng } from '../types'

/**
 * Geocoding via the public Nominatim (OpenStreetMap) search API.
 *
 * Usage-policy notes (https://operations.osmfoundation.org/policies/nominatim/):
 *  - Max ~1 request/second — we serialize calls with a minimum gap (below).
 *  - No heavy/bulk use on the public server; fine for a driver's daily batch.
 *  - Results are cached (see geocodeCache) so each address is looked up once.
 *  - For production scale, self-host Nominatim or switch geocoding to Google.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const MIN_GAP_MS = 1100 // keep just over 1 req/sec
const CACHE_KEY = 'routerun-geocache-v1'

// --- Address-keyed cache (localStorage) -------------------------------------

type CacheMap = Record<string, LatLng>

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ')
}

function loadCache(): CacheMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CacheMap) : {}
  } catch {
    return {}
  }
}

function saveCache(cache: CacheMap): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore quota / serialization errors — caching is best-effort.
  }
}

// --- Throttle: serialize requests with a minimum gap ------------------------

let chain: Promise<unknown> = Promise.resolve()

function throttle<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const result = await task()
    // Space out the *next* request rather than delaying this one's result.
    await new Promise((r) => setTimeout(r, MIN_GAP_MS))
    return result
  })
  // Keep the chain alive even if a task rejects.
  chain = run.catch(() => undefined)
  return run
}

// --- Public API -------------------------------------------------------------

/**
 * Resolve a single address to coordinates, or `null` if it can't be located.
 * Successful lookups are cached; failures are not (so a fixed typo or a
 * transient network error can be retried on the next run).
 */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const key = normalizeAddress(address)
  if (!key) return null

  const cache = loadCache()
  if (cache[key]) return cache[key]

  const coord = await throttle(() => fetchNominatim(address))
  if (coord) {
    cache[key] = coord
    saveCache(cache)
  }
  return coord
}

async function fetchNominatim(address: string): Promise<LatLng | null> {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
    addressdetails: '0',
  })
  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    if (!Array.isArray(data) || data.length === 0) return null
    const lat = Number(data[0].lat)
    const lng = Number(data[0].lon)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}

import type { LatLng } from '../types'

export type GeoError = 'denied' | 'unavailable' | 'timeout' | 'insecure'

/**
 * Resolve the device's current location, or reject with a GeoError.
 * Requires a secure context (HTTPS or localhost).
 */
export function getCurrentLocation(): Promise<LatLng> {
  return new Promise((resolve, reject: (e: GeoError) => void) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject('unavailable')
      return
    }
    // Geolocation only works in a secure context.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      reject('insecure')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject('denied')
        else if (err.code === err.TIMEOUT) reject('timeout')
        else reject('unavailable')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}

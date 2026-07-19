import type { RouteResult, Settings, Stop } from '../types'
import { supabase } from './supabaseClient'

export interface UserData {
  settings: Settings | null
  stops: Stop[] | null
  routeResult: RouteResult | null
}

/**
 * Load the signed-in driver's settings + current route from Supabase.
 * Throws if a query actually errors — callers must NOT treat a failed load as
 * "empty account" (that would let local data overwrite the server).
 */
export async function loadUserData(userId: string): Promise<UserData> {
  if (!supabase) return { settings: null, stops: null, routeResult: null }

  const [settingsRes, routeRes] = await Promise.all([
    supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('routes').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (settingsRes.error) throw new Error(settingsRes.error.message)
  if (routeRes.error) throw new Error(routeRes.error.message)

  const s = settingsRes.data
  const r = routeRes.data

  return {
    settings: s
      ? {
          startHour: s.start_hour,
          avgSpeedMph: s.avg_speed_mph,
          serviceMinPerStop: s.service_min_per_stop,
          roundTrip: s.round_trip,
          depot: { lat: s.depot_lat, lng: s.depot_lng },
        }
      : null,
    stops: (r?.stops as Stop[] | undefined) ?? null,
    routeResult: (r?.route_result as RouteResult | null | undefined) ?? null,
  }
}

/** Returns true only if the write actually reached the server. */
export async function saveSettings(
  userId: string,
  settings: Settings,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('settings').upsert({
    user_id: userId,
    start_hour: settings.startHour,
    avg_speed_mph: settings.avgSpeedMph,
    service_min_per_stop: settings.serviceMinPerStop,
    round_trip: settings.roundTrip,
    depot_lat: settings.depot.lat,
    depot_lng: settings.depot.lng,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.warn('[sync] saveSettings failed:', error.message)
    return false
  }
  return true
}

/** Returns true only if the write actually reached the server. */
export async function saveRoute(
  userId: string,
  stops: Stop[],
  routeResult: RouteResult | null,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('routes').upsert({
    user_id: userId,
    stops,
    // Geometry is large and rebuildable — don't persist it (matches localStorage).
    route_result: routeResult ? { ...routeResult, geometry: undefined } : null,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.warn('[sync] saveRoute failed:', error.message)
    return false
  }
  return true
}

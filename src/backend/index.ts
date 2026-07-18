import { config } from '../config'
import { isSupabaseConfigured, supabase } from './supabaseClient'

export { supabase, isSupabaseConfigured }

export interface ConnectionResult {
  ok: boolean
  error?: string
}

/**
 * Lightweight reachability check against the Supabase auth health endpoint.
 * Returns `not-configured` when no keys are set, so the app can degrade to
 * local-only mode without errors.
 */
export async function checkBackendConnection(): Promise<ConnectionResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'not-configured' }
  try {
    const res = await fetch(`${config.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: config.supabaseAnonKey },
    })
    return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info(
    `[backend] Supabase ${isSupabaseConfigured ? 'configured' : 'not configured (local-only)'}`,
  )
  // Expose for manual connection testing once keys are set.
  ;(window as unknown as { __backend?: unknown }).__backend = {
    supabase,
    isSupabaseConfigured,
    checkBackendConnection,
  }
}

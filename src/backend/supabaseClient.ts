import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config'

/**
 * The Supabase client, or `null` when no project keys are configured.
 *
 * The app runs fine without a backend (local-only): every caller must handle
 * the `null` case. This mirrors how routing has a mock fallback — the backend
 * is optional plumbing until accounts/sync are switched on.
 */
export const isSupabaseConfigured =
  config.supabaseUrl !== '' && config.supabaseAnonKey !== ''

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // needed for the OAuth redirect (2b)
      },
    })
  : null

/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Routing backend: 'mock' (default) or 'free'. */
  readonly VITE_ROUTING_PROVIDER?: 'mock' | 'free'
  /** Optional MapTiler key for nicer map tiles. */
  readonly VITE_MAPTILER_KEY?: string
  /** Supabase project URL. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon (public) key. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

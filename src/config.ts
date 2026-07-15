/**
 * Single source of truth for environment-driven settings.
 *
 * Read every `import.meta.env` value here (and nowhere else) so config stays in
 * one place and is easy to reason about.
 */

export type RoutingProviderKind = 'mock' | 'free'

function readProviderKind(): RoutingProviderKind {
  const raw = (import.meta.env.VITE_ROUTING_PROVIDER ?? '').trim().toLowerCase()
  if (raw === 'free') return 'free'
  // Default to the mock; also the safe fallback for any unknown value.
  return 'mock'
}

export const config = {
  /** Which routing backend to use: deterministic mock, or the free real stack. */
  routingProvider: readProviderKind(),
  /** Optional MapTiler key for nicer map tiles (blank = use plain OSM tiles). */
  maptilerKey: (import.meta.env.VITE_MAPTILER_KEY ?? '').trim(),
} as const

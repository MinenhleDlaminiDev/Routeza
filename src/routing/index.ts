import { config } from '../config'
import { MockRoutingProvider } from './mockProvider'
import { FreeRoutingProvider } from './freeProvider'
import type { RoutingProvider } from './provider'

/**
 * Pick the routing backend from config (VITE_ROUTING_PROVIDER).
 *   'mock' → deterministic offline mock (default)
 *   'free' → Nominatim + OSRM (free/open; wired up in steps 1b/1c)
 *
 * Falls back to the mock for any unknown value so the app always runs.
 */
function createRoutingProvider(): RoutingProvider {
  switch (config.routingProvider) {
    case 'free':
      return new FreeRoutingProvider()
    case 'mock':
    default:
      return new MockRoutingProvider()
  }
}

export const routingProvider: RoutingProvider = createRoutingProvider()

// Helps confirm which backend is active during development, and exposes the
// provider on window for manual console testing (dev builds only).
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info(`[routing] active provider: ${config.routingProvider}`)
  ;(window as unknown as { __routing?: RoutingProvider }).__routing =
    routingProvider
}

export type { RoutingProvider } from './provider'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  LatLng,
  RouteResult,
  Settings,
  Stop,
  StopStatus,
  ViewState,
} from './types'
import { parseAddresses } from './lib/parseAddresses'
import { getCurrentLocation } from './lib/geolocation'
import { setOptimizeProgress } from './progressStore'
import { routingProvider } from './routing'

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied'

/** The subset of store state that is persisted to localStorage. */
interface PersistedRouteState {
  stops: Stop[]
  settings: Settings
  routeResult: RouteResult | null
  view: ViewState
}

// Default depot ~ Johannesburg city center (matches the mock geocoder and
// sample data). Overridden by the driver's GPS via useCurrentLocation().
export const DEFAULT_DEPOT: LatLng = { lat: -26.2041, lng: 28.0473 }

const DEFAULT_SETTINGS: Settings = {
  startHour: 9,
  avgSpeedMph: 20,
  serviceMinPerStop: 3,
  roundTrip: false,
  depot: DEFAULT_DEPOT,
}

interface RouteStore {
  stops: Stop[]
  settings: Settings
  routeResult: RouteResult | null
  view: ViewState
  selectedStopId: string | null
  settingsOpen: boolean
  accountOpen: boolean
  optimizing: boolean
  optimizeError: string | null
  locationStatus: LocationStatus

  // Add screen
  setStopsFromText: (raw: string) => void
  clearStops: () => void
  resetUserState: () => void
  useCurrentLocation: () => Promise<void>

  // Navigation
  setView: (view: ViewState) => void
  selectStop: (id: string | null) => void
  openSettings: (open: boolean) => void
  openAccount: (open: boolean) => void

  // Optimization
  optimize: () => Promise<void>
  reoptimize: () => Promise<void>
  clearOptimizeError: () => void

  // Mutations
  setStatus: (id: string, status: StopStatus) => void
  updateSettings: (partial: Partial<Settings>) => void
}

export const useStore = create<RouteStore>()(
  persist(
    (set, get) => ({
      stops: [],
      settings: DEFAULT_SETTINGS,
      routeResult: null,
      view: 'add',
      selectedStopId: null,
      settingsOpen: false,
      accountOpen: false,
      optimizing: false,
      optimizeError: null,
      locationStatus: 'idle',

      setStopsFromText: (raw) => {
        set({ stops: parseAddresses(raw), routeResult: null, optimizeError: null })
      },

      clearStops: () => set({ stops: [], routeResult: null, view: 'add' }),

      // Wipe all user-specific state on sign-out so the next account on this
      // device starts clean (no leftover route/depot from the previous driver).
      resetUserState: () =>
        set({
          stops: [],
          routeResult: null,
          settings: DEFAULT_SETTINGS,
          view: 'add',
          selectedStopId: null,
          settingsOpen: false,
          accountOpen: false,
          optimizeError: null,
          locationStatus: 'idle',
        }),

      // Set the depot to the driver's current GPS location. Keeps the existing
      // depot on failure. Re-optimizes if a route already exists (the depot is
      // the route's start point).
      useCurrentLocation: async () => {
        set({ locationStatus: 'locating' })
        try {
          const loc = await getCurrentLocation()
          set((s) => ({
            settings: { ...s.settings, depot: loc },
            locationStatus: 'granted',
          }))
          if (get().routeResult) void get().reoptimize()
        } catch {
          set({ locationStatus: 'denied' })
        }
      },

      setView: (view) => set({ view }),
      selectStop: (id) => set({ selectedStopId: id }),
      openSettings: (open) => set({ settingsOpen: open }),
      openAccount: (open) => set({ accountOpen: open }),

      optimize: async () => {
        const { stops, settings } = get()
        if (stops.length === 0) return
        set({ optimizing: true, optimizeError: null })
        setOptimizeProgress({ phase: 'geocoding', done: 0, total: stops.length })
        try {
          const geo = await routingProvider.geocode(stops, (done, total) =>
            setOptimizeProgress({ phase: 'geocoding', done, total }),
          )
          setOptimizeProgress({ phase: 'building', done: 0, total: stops.length })
          const geoById = new Map(geo.map((g) => [g.id, g]))
          const located: Stop[] = stops.map((s) => {
            const g = geoById.get(s.id)
            if (!g || g.failed) {
              return { ...s, geocodeFailed: true, lat: undefined, lng: undefined }
            }
            return { ...s, lat: g.lat, lng: g.lng, geocodeFailed: false }
          })

          // If not a single address resolved, it's almost always the service
          // being unreachable — surface it and stay put instead of showing an
          // empty route the driver can't work.
          if (located.every((s) => s.geocodeFailed)) {
            set({
              optimizeError:
                "Couldn't look up your addresses. Check your connection and try again.",
            })
            return
          }

          const result = await routingProvider.optimize(settings.depot, located, {
            roundTrip: settings.roundTrip,
            avgSpeedMph: settings.avgSpeedMph,
          })
          // Flip optimizing off in the same update as the view switch so the
          // route screen never renders its re-optimize bar for a frame.
          set({ stops: located, routeResult: result, view: 'route', optimizing: false })
        } catch (e) {
          console.warn('[optimize] failed:', e)
          set({
            optimizeError: 'Something went wrong optimizing the route. Try again.',
          })
        } finally {
          set({ optimizing: false })
          setOptimizeProgress(null)
        }
      },

      clearOptimizeError: () => set({ optimizeError: null }),

      // Re-run only the optimizer against already-geocoded stops (e.g. when
      // roundTrip changes). Keeps existing coordinates.
      reoptimize: async () => {
        const { stops, settings, routeResult } = get()
        if (!routeResult) return
        set({ optimizing: true })
        try {
          const result = await routingProvider.optimize(settings.depot, stops, {
            roundTrip: settings.roundTrip,
            avgSpeedMph: settings.avgSpeedMph,
          })
          set({ routeResult: result })
        } catch (e) {
          // Keep the existing route on failure — a settings tweak shouldn't
          // break an active route.
          console.warn('[reoptimize] failed, keeping current route:', e)
        } finally {
          set({ optimizing: false })
        }
      },

      setStatus: (id, status) => {
        set((s) => ({
          stops: s.stops.map((st) => (st.id === id ? { ...st, status } : st)),
        }))
      },

      updateSettings: (partial) => {
        const prev = get().settings
        const next = { ...prev, ...partial }
        set({ settings: next })
        // roundTrip alters the tour itself, so recompute the order & legs.
        if (partial.roundTrip !== undefined && partial.roundTrip !== prev.roundTrip) {
          void get().reoptimize()
        }
      },
    }),
    {
      name: 'routerun-v1',
      // Bump this whenever seeded sample data or the persisted shape changes,
      // so stale saved state is discarded automatically instead of showing old
      // data.
      version: 1,
      // Discard any state from an older version quietly (re-seeds from
      // defaults) instead of logging a "couldn't be migrated" error.
      migrate: (persisted, version) =>
        version < 1 ? undefined : (persisted as PersistedRouteState),
      partialize: (s): PersistedRouteState => ({
        stops: s.stops,
        settings: s.settings,
        // Drop the road geometry before persisting — it can be thousands of
        // points. The line falls back to straight segments on reload until the
        // next optimize refetches it.
        routeResult: s.routeResult
          ? { ...s.routeResult, geometry: undefined }
          : null,
        view: s.view,
      }),
    },
  ),
)

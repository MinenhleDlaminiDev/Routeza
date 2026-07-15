import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  RouteResult,
  Settings,
  Stop,
  StopStatus,
  ViewState,
} from './types'
import { parseAddresses } from './lib/parseAddresses'
import { routingProvider } from './routing'

const DEFAULT_SETTINGS: Settings = {
  startHour: 9,
  avgSpeedMph: 20,
  serviceMinPerStop: 3,
  roundTrip: false,
  // Depot ~ San Francisco city center (matches the mock geocoder).
  depot: { lat: 37.7749, lng: -122.4194 },
}

interface RouteStore {
  stops: Stop[]
  settings: Settings
  routeResult: RouteResult | null
  view: ViewState
  selectedStopId: string | null
  settingsOpen: boolean
  optimizing: boolean

  // Add screen
  setStopsFromText: (raw: string) => void
  clearStops: () => void

  // Navigation
  setView: (view: ViewState) => void
  selectStop: (id: string | null) => void
  openSettings: (open: boolean) => void

  // Optimization
  optimize: () => Promise<void>
  reoptimize: () => Promise<void>

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
      optimizing: false,

      setStopsFromText: (raw) => {
        set({ stops: parseAddresses(raw), routeResult: null })
      },

      clearStops: () => set({ stops: [], routeResult: null, view: 'add' }),

      setView: (view) => set({ view }),
      selectStop: (id) => set({ selectedStopId: id }),
      openSettings: (open) => set({ settingsOpen: open }),

      optimize: async () => {
        const { stops, settings } = get()
        if (stops.length === 0) return
        set({ optimizing: true })
        try {
          const geo = await routingProvider.geocode(stops)
          const geoById = new Map(geo.map((g) => [g.id, g]))
          const located: Stop[] = stops.map((s) => {
            const g = geoById.get(s.id)
            if (!g || g.failed) {
              return { ...s, geocodeFailed: true, lat: undefined, lng: undefined }
            }
            return { ...s, lat: g.lat, lng: g.lng, geocodeFailed: false }
          })
          const result = await routingProvider.optimize(settings.depot, located, {
            roundTrip: settings.roundTrip,
            avgSpeedMph: settings.avgSpeedMph,
          })
          set({ stops: located, routeResult: result, view: 'route' })
        } finally {
          set({ optimizing: false })
        }
      },

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
      partialize: (s) => ({
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

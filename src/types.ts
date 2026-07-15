export type StopStatus = 'pending' | 'delivered' | 'failed' | 'skipped'

export interface LatLng {
  lat: number
  lng: number
}

export interface Stop {
  id: string
  name: string // customer or business name (optional; may be derived)
  address: string // raw address line
  lat?: number // filled by geocoding
  lng?: number
  status: StopStatus // default 'pending'
  geocodeFailed?: boolean // flagged when the address couldn't be located
}

export interface RouteLeg {
  fromId: string | 'depot'
  toId: string | 'depot'
  miles: number
  driveMin: number
}

export interface RouteResult {
  orderedStopIds: string[] // optimized visiting order
  legs: RouteLeg[]
  totalMiles: number
  totalDriveMin: number // excludes service time
}

export interface Settings {
  startHour: number // 6-11, when the shift begins (default 9)
  avgSpeedMph: number // 10-45 (default 20)
  serviceMinPerStop: number // default 3
  roundTrip: boolean // return to depot at the end (default false)
  depot: LatLng // driver start location
}

export type ViewState = 'add' | 'route'

/** A stop enriched with derived values for rendering. */
export interface DerivedStop {
  stop: Stop
  order: number // 1-based index in the optimized list
  isCurrent: boolean // first pending stop
  etaMinutes: number // minutes from shift start until arrival
  legMiles: number // miles from previous stop (or depot) to this stop
}

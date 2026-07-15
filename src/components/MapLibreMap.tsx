import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { DerivedStop, RouteResult, Settings } from '../types'
import { statusStyle } from '../lib/statusStyle'
import { mapStyle } from '../lib/mapStyle'

interface MapLibreMapProps {
  derived: DerivedStop[]
  route: RouteResult | null
  settings: Settings
  onPinTap: (id: string) => void
}

/** Coordinates for the route line: real OSRM geometry, else straight segments. */
function routeLineCoords(
  route: RouteResult | null,
  derived: DerivedStop[],
  settings: Settings,
): [number, number][] {
  if (route?.geometry && route.geometry.length > 0) {
    return route.geometry.map((p) => [p.lng, p.lat])
  }
  const pts: [number, number][] = [[settings.depot.lng, settings.depot.lat]]
  for (const d of derived) {
    if (d.located && d.stop.lng != null && d.stop.lat != null) {
      pts.push([d.stop.lng, d.stop.lat])
    }
  }
  if (settings.roundTrip) pts.push([settings.depot.lng, settings.depot.lat])
  return pts
}

function makePinEl(bg: string, ink: string, content: string, label: string) {
  const el = document.createElement('button')
  el.type = 'button'
  el.setAttribute('aria-label', label)
  el.textContent = content
  Object.assign(el.style, {
    width: '22px',
    height: '22px',
    borderRadius: '9999px',
    border: '2px solid #fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: '10px',
    fontWeight: '600',
    boxShadow: '0 1px 4px rgba(0,0,0,.28)',
    cursor: 'pointer',
    padding: '0',
    background: bg,
    color: ink,
  } satisfies Partial<CSSStyleDeclaration>)
  return el
}

function makeDepotEl() {
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  Object.assign(el.style, {
    width: '14px',
    height: '14px',
    borderRadius: '3px',
    border: '2px solid #fff',
    background: '#17181B',
    boxShadow: '0 1px 3px rgba(0,0,0,.3)',
  } satisfies Partial<CSSStyleDeclaration>)
  return el
}

export default function MapLibreMap({
  derived,
  route,
  settings,
  onPinTap,
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  // `mapReady` = map object created (markers + camera can be used).
  // `styleLoaded` = style finished loading (sources/layers can be added).
  const [mapReady, setMapReady] = useState(false)
  const [styleLoaded, setStyleLoaded] = useState(false)

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: [settings.depot.lng, settings.depot.lat],
      zoom: 11,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    })
    map.scrollZoom.disable() // don't hijack page scroll on the strip
    map.touchZoomRotate.disableRotation()
    map.on('load', () => setStyleLoaded(true))
    mapRef.current = map
    setMapReady(true)
    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
      setMapReady(false)
      setStyleLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cheap signature of the route geometry so we only redraw/refit when the
  // geography actually changes — not on every status tap.
  const geoKey = useMemo(
    () =>
      JSON.stringify({
        geomLen: route?.geometry?.length ?? 0,
        order: route?.orderedStopIds ?? [],
        coords: derived
          .filter((d) => d.located)
          .map((d) => [d.stop.lng, d.stop.lat]),
        depot: settings.depot,
        roundTrip: settings.roundTrip,
      }),
    [route, derived, settings.depot, settings.roundTrip],
  )

  // Draw/update the route line (needs the style loaded to add the layer).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleLoaded) return

    const data = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: routeLineCoords(route, derived, settings),
      },
    } as GeoJSON.Feature<GeoJSON.LineString>

    const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined
    if (src) {
      src.setData(data)
    } else {
      map.addSource('route', { type: 'geojson', data })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2F6BFF', 'line-width': 4 },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleLoaded, geoKey])

  // Fit the view to depot + located stops (camera works without the style).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const bounds = new maplibregl.LngLatBounds()
    bounds.extend([settings.depot.lng, settings.depot.lat])
    for (const d of derived) {
      if (d.located && d.stop.lng != null && d.stop.lat != null) {
        bounds.extend([d.stop.lng, d.stop.lat])
      }
    }
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 30, maxZoom: 15, duration: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, geoKey])

  // (Re)build markers — colors/positions follow status changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const depotMarker = new maplibregl.Marker({ element: makeDepotEl() })
      .setLngLat([settings.depot.lng, settings.depot.lat])
      .addTo(map)
    markersRef.current.push(depotMarker)

    for (const d of derived) {
      if (!d.located || d.stop.lng == null || d.stop.lat == null) continue
      const st = statusStyle(d.stop.status, d.isCurrent)
      const label = `Stop ${d.order}: ${d.stop.name || d.stop.address}, ${st.label}`
      const el = makePinEl(st.pinColor, st.pinInk, st.mark ?? String(d.order), label)
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onPinTap(d.stop.id)
      })
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([d.stop.lng, d.stop.lat])
        .addTo(map)
      // MapLibre overwrites the element's aria-label with a generic "Map
      // marker"; restore ours so the pin stays screen-reader friendly.
      el.setAttribute('aria-label', label)
      markersRef.current.push(marker)
    }
  }, [mapReady, derived, onPinTap, settings.depot])

  return (
    <div className="relative h-[184px] w-full overflow-hidden bg-map-base">
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  )
}

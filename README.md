# RouteRun

A mobile-first delivery route optimizer for gig drivers. Paste a batch of
addresses, optimize them into an efficient stop order, and work the route
stop-by-stop with live status and one-tap navigation handoff.

This is the **list-first** design: a compact schematic map strip on top, and a
large, scannable, tappable stop list as the primary working surface.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- zustand (route store, persisted to `localStorage`)
- Schematic SVG map (no API key required)

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
```

## How it works

1. **Add screen** — paste/edit addresses (one per line). They're parsed,
   trimmed, and deduped. A sample batch of 14 SF deliveries is pre-filled.
2. **Optimize** — geocodes each address, then solves a stop order starting from
   the driver's depot (nearest-neighbour + a 2-opt improvement pass).
3. **Route screen** — a map strip with the route line, numbered status-colored
   pins and a depot marker; a distance / delivered / remaining stat bar; and the
   ordered stop list with per-stop ETA and leg distance.
4. **Stop sheet** — tap a stop (row or pin) to navigate in Google/Apple Maps or
   mark it Delivered / Failed / Skipped. Status updates the pin, row and stats
   instantly.
5. **Settings** (gear icon) — start time, average speed, round-trip. Changing
   any of these recomputes ETAs, distances and the stat bar live.

State survives reload via `localStorage`.

## Configuration

Copy `.env.example` to `.env` to change settings (all optional):

| Variable | Values | Purpose |
| --- | --- | --- |
| `VITE_ROUTING_PROVIDER` | `mock` (default) · `free` | Which routing backend to use. |
| `VITE_MAPTILER_KEY` | key string | Optional, for nicer map tiles. |

## Routing backends

Geocoding and optimization sit behind the `RoutingProvider` interface
(`src/routing/provider.ts`). The active backend is chosen from
`VITE_ROUTING_PROVIDER` in `src/routing/index.ts`:

- **`mock`** — `MockRoutingProvider`: deterministic pseudo-geocodes +
  nearest-neighbour/2-opt. Offline, no keys, used for demos and tests.
- **`free`** — `FreeRoutingProvider`: Nominatim (geocoding) + OSRM
  (optimization). Free/open-source. Being wired up in steps 1b/1c.

Planned later: swap geocoding to Google for better South African / township
accuracy once scale demands it — a small, contained change behind the same
interface.

For a real coordinate map, replace the schematic SVG in
`src/components/RouteMap.tsx` with MapLibre GL JS (draw the route as a GeoJSON
LineString and render numbered pins as HTML markers).

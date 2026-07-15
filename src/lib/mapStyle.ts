import type { StyleSpecification } from 'maplibre-gl'
import { config } from '../config'

/**
 * MapLibre style for the route strip.
 *  - With a MapTiler key: their streets vector style.
 *  - Otherwise: CartoDB Positron raster — a muted light-grey basemap that
 *    matches the app's utilitarian aesthetic. Free with attribution.
 */
export function mapStyle(): string | StyleSpecification {
  if (config.maptilerKey) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${config.maptilerKey}`
  }
  return {
    version: 8,
    sources: {
      positron: {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [{ id: 'positron', type: 'raster', source: 'positron' }],
  }
}

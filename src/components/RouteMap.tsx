import { useState } from 'react'
import type { DerivedStop, RouteResult, Settings } from '../types'
import MapLibreMap from './MapLibreMap'
import SchematicMap from './SchematicMap'

interface RouteMapProps {
  derived: DerivedStop[]
  route: RouteResult | null
  settings: Settings
  onPinTap: (id: string) => void
}

/** True if the browser can create a WebGL context (MapLibre needs it). */
function detectWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return (
      !!window.WebGLRenderingContext &&
      !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

/**
 * The route map strip. Uses a real MapLibre map when WebGL is available, and
 * falls back to the schematic SVG map otherwise.
 */
export default function RouteMap(props: RouteMapProps) {
  const [webgl] = useState(detectWebgl)
  return webgl ? <MapLibreMap {...props} /> : <SchematicMap {...props} />
}

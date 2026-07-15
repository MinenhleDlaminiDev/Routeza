import type { Stop } from '../types'
import { hashString } from './geo'

let counter = 0
function makeId(seed: string): string {
  counter += 1
  return `stop_${hashString(seed).toString(36)}_${counter}`
}

/**
 * A line may be "Name, 123 Main St, City" or just an address.
 * We treat the whole line as the address, and derive a display name from
 * the first comma-separated segment when it doesn't look like a street
 * (i.e. it doesn't begin with a number).
 */
function deriveName(line: string): string {
  const first = line.split(',')[0]?.trim() ?? ''
  if (!first) return ''
  // If the first segment starts with a digit it's a street number, not a name.
  if (/^\d/.test(first)) return ''
  return first
}

/** Split pasted text into deduped, trimmed Stop objects. */
export function parseAddresses(raw: string): Stop[] {
  const seen = new Set<string>()
  const stops: Stop[] = []
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    stops.push({
      id: makeId(line),
      name: deriveName(line),
      address: line,
      status: 'pending',
    })
  }
  return stops
}

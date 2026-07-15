/** Format a fractional hour-of-day (e.g. 9.5) as "9:30a". */
export function formatClock(hourOfDay: number): string {
  let h = Math.floor(hourOfDay)
  const m = Math.round((hourOfDay - h) * 60)
  let mm = m
  if (mm === 60) {
    h += 1
    mm = 0
  }
  const suffix = h >= 12 && h < 24 ? 'p' : 'a'
  let display = h % 12
  if (display === 0) display = 12
  return `${display}:${mm.toString().padStart(2, '0')}${suffix}`
}

/** Format minutes-since-shift-start into a clock time given the shift start hour. */
export function formatEta(startHour: number, minutesFromStart: number): string {
  return formatClock(startHour + minutesFromStart / 60)
}

/** Format a drive duration in minutes as "Xh Ym" or "Ym". */
export function formatDuration(totalMin: number): string {
  const mins = Math.round(totalMin)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

/** Format a distance in miles as "37.1 mi". */
export function formatMiles(miles: number): string {
  return `${miles.toFixed(1)} mi`
}

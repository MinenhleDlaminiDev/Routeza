import type { StopStatus } from '../types'

export type VisualStatus = StopStatus | 'current'

export interface StatusStyle {
  label: string
  textClass: string // pill/text color
  bgClass: string // pill background
  pinColor: string // hex for map pin & status circle
  pinInk: string // hex for the number/glyph inside the pin
  mark: string | null // glyph shown instead of the number (✓ / ✕)
}

/** Resolve the visual status for a stop, folding "current" onto pending. */
export function visualStatus(status: StopStatus, isCurrent: boolean): VisualStatus {
  if (status === 'pending' && isCurrent) return 'current'
  return status
}

const STYLES: Record<VisualStatus, StatusStyle> = {
  pending: {
    label: 'Pending',
    textClass: 'text-pending-text',
    bgClass: 'bg-pending-bg',
    pinColor: '#2F6BFF',
    pinInk: '#FFFFFF',
    mark: null,
  },
  current: {
    label: 'Next stop',
    textClass: 'text-current-text',
    bgClass: 'bg-current-bg',
    pinColor: '#F5A623',
    pinInk: '#17181B',
    mark: null,
  },
  delivered: {
    label: 'Delivered',
    textClass: 'text-delivered-text',
    bgClass: 'bg-delivered-bg',
    pinColor: '#12896A',
    pinInk: '#FFFFFF',
    mark: '✓',
  },
  failed: {
    label: 'Failed',
    textClass: 'text-failed-text',
    bgClass: 'bg-failed-bg',
    pinColor: '#E5484D',
    pinInk: '#FFFFFF',
    mark: '✕',
  },
  skipped: {
    label: 'Skipped',
    textClass: 'text-skipped-text',
    bgClass: 'bg-skipped-bg',
    pinColor: '#B8BAC0',
    pinInk: '#FFFFFF',
    mark: null,
  },
}

export function statusStyle(status: StopStatus, isCurrent: boolean): StatusStyle {
  return STYLES[visualStatus(status, isCurrent)]
}

import { create } from 'zustand'

export interface OptimizeProgress {
  phase: 'geocoding' | 'building'
  done: number
  total: number
}

/**
 * Transient optimize progress, kept OUT of the persisted route store so the
 * frequent per-address updates during geocoding don't each trigger a
 * localStorage write.
 */
interface ProgressState {
  optimizeProgress: OptimizeProgress | null
}

export const useProgressStore = create<ProgressState>(() => ({
  optimizeProgress: null,
}))

export const setOptimizeProgress = (p: OptimizeProgress | null) =>
  useProgressStore.setState({ optimizeProgress: p })

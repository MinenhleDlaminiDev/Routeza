import { create } from 'zustand'

interface SyncState {
  online: boolean
  pending: boolean // local changes not yet confirmed saved to the server
}

export const useSyncStore = create<SyncState>(() => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: false,
}))

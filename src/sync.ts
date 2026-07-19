import { useStore } from './store'
import { useAuthStore } from './authStore'
import { isSupabaseConfigured } from './backend'
import { loadUserData, saveRoute, saveSettings } from './backend/data'

/**
 * Keeps the driver's route + settings in sync with Supabase (local-first):
 *  - On sign-in, load their data from the server into the store.
 *  - On changes, push the changed slice to the server (debounced).
 *  - On app foreground / focus / reconnect, pull the latest (unless we have
 *    unsynced local changes) so edits from another device show up (2d).
 *  - localStorage (zustand persist) remains the instant offline cache.
 *
 * Last-write-wins for now; a proper offline queue / conflict handling is Phase 3.
 */

function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

let currentUserId: string | null = null
// Suppress pushes while we're applying server data to the store.
let hydrating = false

// Track unsynced local changes so a refresh-on-focus never clobbers them.
let changeSeq = 0 // bumped on every local change
let syncedSeq = 0 // last change seq confirmed saved to the server
let settingsDirty = false
let routeDirty = false

const hasUnsyncedChanges = () => changeSeq !== syncedSeq

const flushToServer = debounce(async (userId: string) => {
  const seqAtStart = changeSeq
  if (settingsDirty) {
    settingsDirty = false
    await saveSettings(userId, useStore.getState().settings)
  }
  if (routeDirty) {
    routeDirty = false
    const { stops, routeResult } = useStore.getState()
    await saveRoute(userId, stops, routeResult)
  }
  // Only mark clean if nothing changed while we were saving.
  if (changeSeq === seqAtStart) syncedSeq = changeSeq
}, 800)

async function hydrateFromServer(userId: string) {
  hydrating = true
  try {
    const data = await loadUserData(userId)
    const patch: Partial<ReturnType<typeof useStore.getState>> = {}
    if (data.settings) patch.settings = data.settings
    if (data.stops) {
      patch.stops = data.stops
      patch.routeResult = data.routeResult
    }
    if (Object.keys(patch).length > 0) useStore.setState(patch)

    // First sign-in with nothing on the server but real local work → push it up
    // so pre-login progress isn't lost.
    const local = useStore.getState()
    if (!data.settings) void saveSettings(userId, local.settings)
    if (!data.stops && local.routeResult) {
      void saveRoute(userId, local.stops, local.routeResult)
    }
    // After a full hydrate, local and server agree — nothing left unsynced.
    syncedSeq = changeSeq
  } finally {
    hydrating = false
  }
}

/** Pull latest from the server, unless we have local changes still syncing. */
async function refreshFromServer() {
  if (!currentUserId || hydrating || hasUnsyncedChanges()) return
  await hydrateFromServer(currentUserId)
}

/** Wire up sync. Call once at app start; returns an unsubscribe function. */
export function initSync(): () => void {
  if (!isSupabaseConfigured) return () => {}

  const unsubAuth = useAuthStore.subscribe((state) => {
    const uid = state.user?.id ?? null
    if (uid && uid !== currentUserId) {
      currentUserId = uid
      void hydrateFromServer(uid)
    } else if (!uid) {
      currentUserId = null
    }
  })

  const unsubStore = useStore.subscribe((state, prev) => {
    if (hydrating || !currentUserId) return
    let changed = false
    if (state.settings !== prev.settings) {
      settingsDirty = true
      changed = true
    }
    if (state.stops !== prev.stops || state.routeResult !== prev.routeResult) {
      routeDirty = true
      changed = true
    }
    if (changed) {
      changeSeq++
      flushToServer(currentUserId)
    }
  })

  // Pull the latest when the app comes back to the foreground / reconnects.
  const onVisible = () => {
    if (document.visibilityState === 'visible') void refreshFromServer()
  }
  const onFocus = () => void refreshFromServer()
  const onOnline = () => void refreshFromServer()
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onFocus)
  window.addEventListener('online', onOnline)

  // Handle the case where a session is already present at startup.
  const uid = useAuthStore.getState().user?.id
  if (uid) {
    currentUserId = uid
    void hydrateFromServer(uid)
  }

  return () => {
    unsubAuth()
    unsubStore()
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('online', onOnline)
  }
}

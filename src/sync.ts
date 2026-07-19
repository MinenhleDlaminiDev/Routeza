import { useStore } from './store'
import { useAuthStore } from './authStore'
import { useSyncStore } from './syncStore'
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

/** Publish online + pending status for the offline indicator. */
function publishStatus() {
  useSyncStore.setState({
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    pending: currentUserId !== null && hasUnsyncedChanges(),
  })
}

/** Reset the sync bookkeeping so state never carries across accounts. */
function resetSyncState() {
  changeSeq = 0
  syncedSeq = 0
  settingsDirty = false
  routeDirty = false
  publishStatus()
}

const flushToServer = debounce(async (userId: string) => {
  const seqAtStart = changeSeq
  let allOk = true
  if (settingsDirty) {
    const ok = await saveSettings(userId, useStore.getState().settings)
    if (ok) settingsDirty = false
    else allOk = false
  }
  if (routeDirty) {
    const { stops, routeResult } = useStore.getState()
    const ok = await saveRoute(userId, stops, routeResult)
    if (ok) routeDirty = false
    else allOk = false
  }
  // Only mark synced if every write reached the server AND nothing changed
  // while we were saving. A failed (offline) write stays pending and is
  // retried when the connection returns.
  if (allOk && changeSeq === seqAtStart) syncedSeq = changeSeq
  publishStatus()
}, 800)

async function hydrateFromServer(userId: string) {
  let data
  try {
    // Load first (may throw). Don't touch the store until it succeeds, so a
    // failed load never triggers the push-on-empty path below.
    data = await loadUserData(userId)
  } catch (e) {
    console.warn('[sync] load failed, keeping local state:', e)
    return
  }

  hydrating = true
  try {
    const patch: Partial<ReturnType<typeof useStore.getState>> = {}
    if (data.settings) patch.settings = data.settings
    if (data.stops) {
      patch.stops = data.stops
      patch.routeResult = data.routeResult
    }
    if (Object.keys(patch).length > 0) useStore.setState(patch)

    // First sign-in with nothing on the server but real local work → push it up
    // so pre-login progress isn't lost. Only reached when the load succeeded.
    const local = useStore.getState()
    if (!data.settings) void saveSettings(userId, local.settings)
    if (!data.stops && local.routeResult) {
      void saveRoute(userId, local.stops, local.routeResult)
    }
    // After a full hydrate, local and server agree — nothing left unsynced.
    syncedSeq = changeSeq
    publishStatus()
  } finally {
    hydrating = false
  }
}

/** Pull latest from the server, unless we have local changes still syncing. */
function refreshFromServer() {
  if (!currentUserId || hydrating || hasUnsyncedChanges()) return
  void hydrateFromServer(currentUserId)
}

// Coalesce focus + visibilitychange (both fire on foreground) into one load.
const debouncedRefresh = debounce(refreshFromServer, 300)

/** Wire up sync. Call once at app start; returns an unsubscribe function. */
export function initSync(): () => void {
  if (!isSupabaseConfigured) return () => {}

  const unsubAuth = useAuthStore.subscribe((state) => {
    const uid = state.user?.id ?? null
    if (uid && uid !== currentUserId) {
      // Switching from another account → clear its data first. On a first
      // sign-in (currentUserId null) keep local work so hydrate can push it up.
      if (currentUserId !== null) {
        resetSyncState()
        useStore.getState().resetUserState()
      }
      currentUserId = uid
      void hydrateFromServer(uid)
    } else if (!uid && currentUserId) {
      // Signed out: wipe this device so the next account starts clean.
      currentUserId = null
      resetSyncState()
      useStore.getState().resetUserState()
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
      publishStatus()
      flushToServer(currentUserId)
    }
  })

  // Pull the latest when the app comes back to the foreground / reconnects.
  const onVisible = () => {
    if (document.visibilityState === 'visible') debouncedRefresh()
  }
  const onFocus = () => debouncedRefresh()
  const onOnline = () => {
    publishStatus()
    // Reconnected: retry any pending writes first, then pull.
    if (currentUserId && hasUnsyncedChanges()) flushToServer(currentUserId)
    debouncedRefresh()
  }
  const onOffline = () => publishStatus()
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onFocus)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  // Handle the case where a session is already present at startup.
  const uid = useAuthStore.getState().user?.id
  if (uid) {
    currentUserId = uid
    void hydrateFromServer(uid)
  }
  publishStatus()

  return () => {
    unsubAuth()
    unsubStore()
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

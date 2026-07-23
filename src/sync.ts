import { useStore } from './store'
import { useAuthStore } from './authStore'
import { useSyncStore } from './syncStore'
import { isSupabaseConfigured } from './backend'
import { loadUserData, saveRoute, saveSettings } from './backend/data'

/**
 * Keeps the driver's route + settings in sync with Supabase (local-first):
 *  - On changes, push the changed slice to the server (debounced).
 *  - On sign-in / foreground / reconnect / startup, RECONCILE: if local has
 *    unpushed changes, push them (never pull — a pull would clobber offline
 *    work); otherwise pull the latest so other-device edits show up.
 *  - A durable per-user "dirty" flag in localStorage survives app restarts, so
 *    offline changes made before the app was closed are pushed (not overwritten)
 *    on the next launch.
 *  - localStorage (zustand persist) remains the instant offline cache.
 *
 * Last-write-wins across devices for now; a richer merge is future work.
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

// In-memory tracking of unsynced local changes.
let changeSeq = 0 // bumped on every local change
let syncedSeq = 0 // last change seq confirmed saved to the server
let settingsDirty = false
let routeDirty = false

const hasUnsyncedChanges = () => changeSeq !== syncedSeq

// --- Durable "unsynced" flag (survives app restart) -------------------------

const DIRTY_PREFIX = 'routerun-dirty:'
// Mirrors whether the flag is currently written, so we don't re-write it on
// every store change within one dirty span.
let dirtyFlagWritten = false

function markDirtyPersisted(userId: string) {
  if (dirtyFlagWritten) return
  try {
    localStorage.setItem(DIRTY_PREFIX + userId, '1')
    dirtyFlagWritten = true
  } catch {
    /* ignore */
  }
}
function clearDirtyPersisted(userId: string) {
  try {
    localStorage.removeItem(DIRTY_PREFIX + userId)
  } catch {
    /* ignore */
  }
  dirtyFlagWritten = false
}
function isDirtyPersisted(userId: string): boolean {
  try {
    return localStorage.getItem(DIRTY_PREFIX + userId) === '1'
  } catch {
    return false
  }
}

/** Publish online + pending status for the offline indicator. */
function publishStatus() {
  useSyncStore.setState({
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    pending: currentUserId !== null && hasUnsyncedChanges(),
  })
}

/** Reset the in-memory bookkeeping so state never carries across accounts. */
function resetSyncState() {
  changeSeq = 0
  syncedSeq = 0
  settingsDirty = false
  routeDirty = false
  publishStatus()
}

const flushToServer = debounce(async (userId: string) => {
  const seqAtStart = changeSeq
  const wantSettings = settingsDirty
  const wantRoute = routeDirty
  let allOk = true

  if (wantSettings) {
    const ok = await saveSettings(userId, useStore.getState().settings)
    if (!ok) allOk = false
  }
  if (wantRoute) {
    const { stops, routeResult } = useStore.getState()
    const ok = await saveRoute(userId, stops, routeResult)
    if (!ok) allOk = false
  }

  // Clear the dirty flags only if every write reached the server AND nothing
  // changed while we were saving. Otherwise leave them set so the change is
  // retried (a failed offline write, or an edit that landed mid-save).
  if (allOk && changeSeq === seqAtStart) {
    settingsDirty = false
    routeDirty = false
    syncedSeq = changeSeq
    clearDirtyPersisted(userId)
  }
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
    let pushOk = true
    if (!data.settings) {
      pushOk = (await saveSettings(userId, local.settings)) && pushOk
    }
    if (!data.stops && local.routeResult) {
      pushOk = (await saveRoute(userId, local.stops, local.routeResult)) && pushOk
    }

    if (pushOk) {
      // Local and server now agree — nothing left unsynced.
      syncedSeq = changeSeq
      clearDirtyPersisted(userId)
    } else {
      // The catch-up upload failed — keep it pending so it's retried as a push.
      markDirtyPersisted(userId)
    }
    publishStatus()
  } finally {
    hydrating = false
  }
}

/**
 * Decide push vs pull. If local has unpushed changes (in-memory or from the
 * durable flag), push them and never pull. Otherwise pull the latest.
 */
function reconcile(userId: string) {
  if (hydrating) return
  if (hasUnsyncedChanges()) {
    // We already know which slices are dirty in-memory — just flush them.
    flushToServer(userId)
  } else if (isDirtyPersisted(userId)) {
    // Startup after offline edits: the durable flag says local is ahead but
    // the in-memory slice flags are fresh. Mark both and push; never pull.
    settingsDirty = true
    routeDirty = true
    changeSeq++
    dirtyFlagWritten = true // the flag is already persisted from before
    publishStatus()
    flushToServer(userId)
  } else {
    void hydrateFromServer(userId)
  }
}

// Coalesce focus + visibilitychange (both fire on foreground) into one call.
const debouncedReconcile = debounce(() => {
  if (currentUserId) reconcile(currentUserId)
}, 300)

/** Wire up sync. Call once at app start; returns an unsubscribe function. */
export function initSync(): () => void {
  if (!isSupabaseConfigured) return () => {}

  const unsubAuth = useAuthStore.subscribe((state) => {
    const uid = state.user?.id ?? null
    if (uid && uid !== currentUserId) {
      // Switching from another account → discard its local data + dirty flag
      // first (we can't keep two accounts' data in one local store). A first
      // sign-in (currentUserId null) keeps local work for reconcile to push.
      if (currentUserId !== null) {
        clearDirtyPersisted(currentUserId)
        resetSyncState()
        useStore.getState().resetUserState()
      }
      currentUserId = uid
      reconcile(uid)
    } else if (!uid && currentUserId) {
      // Signed out: wipe this device so the next account starts clean.
      const old = currentUserId
      currentUserId = null
      clearDirtyPersisted(old)
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
      markDirtyPersisted(currentUserId) // durable until confirmed saved
      publishStatus()
      flushToServer(currentUserId)
    }
  })

  // Reconcile (push pending, else pull) on foreground / focus / reconnect.
  const onVisible = () => {
    if (document.visibilityState === 'visible') debouncedReconcile()
  }
  const onFocus = () => debouncedReconcile()
  const onOnline = () => {
    publishStatus()
    if (currentUserId) reconcile(currentUserId)
  }
  const onOffline = () => publishStatus()
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onFocus)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  // Handle a session already present at startup (push pending offline work,
  // else pull).
  const uid = useAuthStore.getState().user?.id
  if (uid) {
    currentUserId = uid
    reconcile(uid)
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

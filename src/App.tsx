import { useEffect, useMemo } from 'react'
import { useStore } from './store'
import { useAuthStore, initAuth } from './authStore'
import { initSync } from './sync'
import { isSupabaseConfigured } from './backend'
import { deriveStops } from './lib/selectors'
import AddScreen from './components/AddScreen'
import RouteScreen from './components/RouteScreen'
import StopDetailSheet from './components/StopDetailSheet'
import SettingsSheet from './components/SettingsSheet'
import AccountSheet from './components/AccountSheet'
import LoginScreen from './components/LoginScreen'

export default function App() {
  const authStatus = useAuthStore((s) => s.status)

  // Wire up auth + server sync once (both no-op when backend isn't configured).
  useEffect(() => {
    const unsubAuth = initAuth()
    const unsubSync = initSync()
    return () => {
      unsubAuth()
      unsubSync()
    }
  }, [])

  // Gate behind login only when a backend exists; otherwise run local-only.
  if (isSupabaseConfigured) {
    if (authStatus === 'loading') return <AuthSplash />
    if (authStatus === 'signed-out') return <LoginScreen />
  }
  return <AppShell />
}

function AppShell() {
  const view = useStore((s) => s.view)
  const stops = useStore((s) => s.stops)
  const routeResult = useStore((s) => s.routeResult)
  const settings = useStore((s) => s.settings)
  const selectedStopId = useStore((s) => s.selectedStopId)
  const selectStop = useStore((s) => s.selectStop)
  const setStatus = useStore((s) => s.setStatus)
  const settingsOpen = useStore((s) => s.settingsOpen)
  const openSettings = useStore((s) => s.openSettings)
  const accountOpen = useStore((s) => s.accountOpen)
  const openAccount = useStore((s) => s.openAccount)
  const updateSettings = useStore((s) => s.updateSettings)
  const optimizing = useStore((s) => s.optimizing)

  const derived = useMemo(
    () => deriveStops(stops, routeResult, settings),
    [stops, routeResult, settings],
  )
  const selected =
    derived.find((d) => d.stop.id === selectedStopId) ?? null

  return (
    <div className="flex min-h-full w-full justify-center bg-canvas">
      {/* Centered phone-width column */}
      <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-app shadow-[0_0_0_1px_rgba(0,0,0,.04)]">
        {view === 'add' ? <AddScreen /> : <RouteScreen />}

        <StopDetailSheet
          d={selected}
          settings={settings}
          onClose={() => selectStop(null)}
          onStatus={setStatus}
        />
        <SettingsSheet
          open={settingsOpen}
          settings={settings}
          onClose={() => openSettings(false)}
          onChange={updateSettings}
        />
        <AccountSheet open={accountOpen} onClose={() => openAccount(false)} />

        {optimizing && view === 'add' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-app/70 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3">
              <Spinner />
              <div className="font-mono text-[13px] font-500 text-muted">
                Optimizing route…
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AuthSplash() {
  return (
    <div className="flex min-h-full w-full items-center justify-center bg-canvas">
      <Spinner />
    </div>
  )
}

function Spinner() {
  return (
    <svg width="34" height="34" viewBox="0 0 50 50" aria-hidden>
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="#EAF0FF"
        strokeWidth="5"
      />
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="#2F6BFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="90 150"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="0.9s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  )
}

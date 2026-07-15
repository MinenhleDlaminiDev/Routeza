import type { Settings } from '../types'
import { formatClock } from '../lib/format'
import Sheet from './Sheet'

interface SettingsSheetProps {
  open: boolean
  settings: Settings
  onClose: () => void
  onChange: (partial: Partial<Settings>) => void
}

export default function SettingsSheet({
  open,
  settings,
  onClose,
  onChange,
}: SettingsSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="settings-title">
      <div className="px-5 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-hairline" />
        <h2 id="settings-title" className="mb-5 text-[18px] font-700 text-ink">
          Route settings
        </h2>

        {/* Start time */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="startHour"
              className="text-[15px] font-600 text-ink"
            >
              Start time
            </label>
            <span className="font-mono text-[14px] font-600 text-accent">
              {formatClock(settings.startHour)}
            </span>
          </div>
          <input
            id="startHour"
            type="range"
            min={6}
            max={11}
            step={1}
            value={settings.startHour}
            onChange={(e) => onChange({ startHour: Number(e.target.value) })}
            className="w-full accent-accent"
          />
        </div>

        {/* Average speed */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="avgSpeed"
              className="text-[15px] font-600 text-ink"
            >
              Average speed
            </label>
            <span className="font-mono text-[14px] font-600 text-accent">
              {settings.avgSpeedMph} mph
            </span>
          </div>
          <input
            id="avgSpeed"
            type="range"
            min={10}
            max={45}
            step={5}
            value={settings.avgSpeedMph}
            onChange={(e) => onChange({ avgSpeedMph: Number(e.target.value) })}
            className="w-full accent-accent"
          />
        </div>

        {/* Round trip */}
        <div className="flex items-center justify-between rounded-[13px] border border-hairline bg-app px-4 py-3.5">
          <div>
            <div className="text-[15px] font-600 text-ink">Round trip</div>
            <div className="text-[13px] text-muted">
              Return to the depot at the end
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.roundTrip}
            aria-label="Round trip"
            onClick={() => onChange({ roundTrip: !settings.roundTrip })}
            className={`relative h-[30px] w-[52px] flex-none rounded-full transition-colors ${
              settings.roundTrip ? 'bg-accent' : 'bg-hairline'
            }`}
          >
            <span
              className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-transform ${
                settings.roundTrip ? 'translate-x-[25px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </div>
      </div>
    </Sheet>
  )
}

interface StatCellProps {
  value: string
  label: string
}

function StatCell({ value, label }: StatCellProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-3">
      <div className="font-mono text-[17px] font-600 text-ink">{value}</div>
      <div className="mt-0.5 font-mono text-[10px] font-500 uppercase tracking-[0.1em] text-muted">
        {label}
      </div>
    </div>
  )
}

interface StatBarProps {
  distance: string
  delivered: string
  remaining: string
}

export default function StatBar({ distance, delivered, remaining }: StatBarProps) {
  return (
    <div className="flex items-stretch border-b border-hairline bg-surface">
      <StatCell value={distance} label="distance" />
      <div className="my-2 w-px bg-hairline" />
      <StatCell value={delivered} label="delivered" />
      <div className="my-2 w-px bg-hairline" />
      <StatCell value={remaining} label="remaining" />
    </div>
  )
}

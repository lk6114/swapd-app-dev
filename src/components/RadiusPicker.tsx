import { MapPin } from 'lucide-react'
import { RADIUS_STEPS } from '@/lib/geo'
import { Chip } from './ui/chip'

/** Radius-Chips 5 / 10 / 25 / 50 km. Optional mit Zusatz pro Stufe (z. B. "+4"). */
export function RadiusPicker({
  value,
  onChange,
  extra,
  className,
}: {
  value: number
  onChange: (km: number) => void
  extra?: (km: number) => string | null
  className?: string
}) {
  return (
    <div className={className} role="radiogroup" aria-label="Radius">
      <div className="flex flex-wrap gap-2">
        {RADIUS_STEPS.map((km) => {
          const note = extra?.(km)
          return (
            <Chip key={km} role="radio" aria-checked={value === km} active={value === km} onClick={() => onChange(km)}>
              {km} km
              {note && <span className={value === km ? 'text-white/70' : 'text-ink-muted'}>{note}</span>}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}

/** Kleiner Chip im Header: zeigt den Radius, öffnet die Auswahl. */
export function RadiusChip({ km, onClick }: { km: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Search radius ${km} km, change`}
      className="inline-flex h-9 items-center gap-1 rounded-full border-2 border-ink bg-white px-3 text-sm font-bold"
    >
      <MapPin size={15} strokeWidth={2} /> {km} km
    </button>
  )
}

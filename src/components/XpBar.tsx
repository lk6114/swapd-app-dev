import { levelInfo } from '@/lib/format'

/** XP-Balken: grün auf Green Tint (CD). */
export function XpBar({ xp }: { xp: number }) {
  const { level, into, needed, progress } = levelInfo(xp)
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-display text-lg font-extrabold">Level {level}</span>
        <span className="font-display text-sm font-bold text-ink-muted">
          {into} / {needed} XP
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-green-tint">
        <div className="h-full rounded-full bg-green transition-[width] duration-700" style={{ width: `${Math.max(4, progress * 100)}%` }} />
      </div>
    </div>
  )
}

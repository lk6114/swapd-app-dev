import { Star } from 'lucide-react'

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={2}
          className={i <= Math.round(value) ? 'fill-gold text-ink' : 'text-ink/20'}
        />
      ))}
    </span>
  )
}

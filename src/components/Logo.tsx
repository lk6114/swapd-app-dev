import { cn } from '@/lib/utils'

/** Wortmarke: swap'd – Ink, Apostroph pink. (Offizielle SVGs aus dem claude.ai-Projekt können das später ersetzen.) */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-2xl font-extrabold tracking-tight text-ink', className)}>
      swap<span className="text-pink">’</span>d
    </span>
  )
}

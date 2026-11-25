import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Auswahl-Pill für Filter & Formular. */
export function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold transition-colors',
        active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink/40',
        className,
      )}
      {...props}
    />
  )
}

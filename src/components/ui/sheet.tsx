import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Bottom Sheet (mobile-first). Schließt per Hintergrund-Tap, X oder Escape. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div
        className={cn(
          'pb-safe relative w-full max-w-lg rounded-t-lg border-x-2 border-t-2 border-ink bg-white motion-safe:animate-[sheet-in_.22s_ease-out]',
          className,
        )}
      >
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <div className="min-w-0 flex-1 font-display text-lg font-bold">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="px-4 pb-5">{children}</div>
      </div>
    </div>
  )
}

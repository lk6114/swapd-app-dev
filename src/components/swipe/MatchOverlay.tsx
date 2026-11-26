import { useEffect, useRef } from 'react'
import { MessageCircle, Repeat2 } from 'lucide-react'
import type { Match } from '@/data'
import { ListingPhoto } from '../ListingPhoto'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

/** Vollbild "It's a Match!" – Grün = Match, Gold nur für die XP. */
export function MatchOverlay({
  match,
  xp,
  onChat,
  onClose,
}: {
  match: Match
  xp: number
  onChat: () => void
  onClose: () => void
}) {
  const chatBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    chatBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const [theirs, mine] = match.listings ?? []
  const name = match.other_user?.name ?? 'Someone'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-title"
      className="pt-safe pb-safe fixed inset-0 z-40 flex flex-col items-center justify-center bg-green-tint px-6 text-center text-ink"
    >
      <div className="w-full max-w-sm motion-safe:animate-[match-in_.35s_cubic-bezier(.2,1.4,.4,1)]">
        <p className="font-display text-lg font-bold">🎉</p>
        <h1 id="match-title" className="font-display text-5xl font-extrabold leading-none">
          It’s a Match!
        </h1>
        <p className="mt-3 text-ink-muted">You and {name} want each other’s stuff.</p>

        <div className="relative mt-8 flex items-center justify-center gap-3">
          {[theirs, mine].map(
            (l, i) =>
              l && (
                <figure key={l.id} className={i === 0 ? '-rotate-6' : 'rotate-6'}>
                  <div className="overflow-hidden rounded-md border-4 border-green bg-white shadow-pop">
                    <ListingPhoto listing={l} className="h-32 w-32" iconSize={48} />
                  </div>
                  <figcaption className="mt-2 max-w-[8rem] truncate text-sm font-bold">
                    {i === 0 ? l.title : `Your ${l.title.toLowerCase()}`}
                  </figcaption>
                </figure>
              ),
          )}
          <span className="absolute left-1/2 top-[4.25rem] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-green text-ink">
            <Repeat2 size={22} strokeWidth={2.25} />
          </span>
        </div>

        <Badge variant="reward" className="mt-6 px-4 py-1.5 font-display text-lg">
          +{xp} XP
        </Badge>

        <div className="mt-8 space-y-3">
          <Button ref={chatBtn} size="lg" className="w-full" onClick={onChat}>
            <MessageCircle size={22} strokeWidth={2.25} /> Start chat
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={onClose}>
            Keep swiping
          </Button>
        </div>
      </div>
    </div>
  )
}

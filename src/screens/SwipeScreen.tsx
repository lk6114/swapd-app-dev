import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, RotateCcw, Undo2, X } from 'lucide-react'
import { api, type Listing, type Match, type SwipeDirection } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { Logo } from '@/components/Logo'
import { useCurrentUser } from '@/components/CurrentUser'
import { useToast } from '@/components/Toast'
import { EmptyState } from '@/components/EmptyState'
import { RadiusChip, RadiusPicker } from '@/components/RadiusPicker'
import { SwipeDeck } from '@/components/swipe/SwipeDeck'
import { SwipeCardSkeleton } from '@/components/swipe/SwipeCard'
import { DeckEmpty } from '@/components/swipe/DeckEmpty'
import { MatchOverlay } from '@/components/swipe/MatchOverlay'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export function SwipeScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const reducedMotion = useReducedMotion()
  const { me, refresh } = useCurrentUser()
  const radius = me?.search_radius_km ?? 5

  const [includePassed, setIncludePassed] = useState(false)
  const { data: deck, loading, error, reload, setData: setDeck } = useAsync(
    () => (me ? api.getSwipeDeck({ radius_km: radius, include_passed: includePassed }) : Promise.resolve(undefined)),
    [me?.id, radius, includePassed],
  )

  const [exiting, setExiting] = useState<{ id: string; dir: SwipeDirection } | null>(null)
  const [history, setHistory] = useState(0) // Swipes in dieser Session → Undo möglich
  const [pending, setPending] = useState(0)
  const [match, setMatch] = useState<{ match: Match; xp: number } | null>(null)
  const [radiusOpen, setRadiusOpen] = useState(false)
  const exitTimer = useRef<number>()

  useEffect(() => () => window.clearTimeout(exitTimer.current), [])

  const swipe = useCallback(
    async (dir: SwipeDirection) => {
      const top = deck?.[0]
      if (!top || exiting || match) return
      setExiting({ id: top.id, dir })
      exitTimer.current = window.setTimeout(
        () => {
          setDeck((d) => d?.filter((x) => x.id !== top.id))
          setExiting(null)
        },
        reducedMotion ? 200 : 280,
      )
      setHistory((h) => h + 1)
      setPending((p) => p + 1)
      try {
        const res = await api.recordSwipe(top.id, dir)
        if (res.match) {
          setMatch({ match: res.match, xp: res.xp_earned })
          toast(`+${res.xp_earned} XP – it’s a match!`, 'reward')
          refresh()
        }
      } catch {
        toast('Couldn’t save that swipe. Try again.')
        setHistory((h) => h - 1)
        setDeck((d) => [top, ...(d ?? []).filter((x) => x.id !== top.id)])
      } finally {
        setPending((p) => p - 1)
      }
    },
    [deck, exiting, match, reducedMotion, setDeck, toast, refresh],
  )

  const undo = useCallback(async () => {
    if (!history || pending || exiting) return
    try {
      const listing = await api.undoLastSwipe()
      setHistory((h) => h - 1)
      if (listing) setDeck((d) => [listing, ...(d ?? []).filter((x) => x.id !== listing.id)])
      refresh()
    } catch {
      toast('Couldn’t undo that one.')
    }
  }, [history, pending, exiting, setDeck, refresh, toast])

  // Desktop: Pfeiltasten, Backspace = Undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (match || radiusOpen) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowRight') swipe('like')
      else if (e.key === 'ArrowLeft') swipe('pass')
      else if (e.key === 'Backspace' || (e.key === 'z' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        undo()
      } else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [swipe, undo, match, radiusOpen])

  async function changeRadius(km: number) {
    setRadiusOpen(false)
    if (km === radius) return
    setIncludePassed(false)
    try {
      await api.updateSearchRadius(km)
      await refresh()
    } catch {
      toast('Couldn’t change the radius.')
    }
  }

  const closeMatch = useCallback(() => setMatch(null), [])
  const tapCard = (l: Listing) => navigate(`/listing/${l.id}`)
  const hasCards = !!deck?.length
  const busy = !!exiting

  return (
    <div className="flex h-[calc(100dvh-6rem)] flex-col">
      <header className="pt-safe shrink-0">
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <RadiusChip km={radius} onClick={() => setRadiusOpen(true)} />
            {me && <Badge variant="reward" className="h-9 px-3 font-display text-sm">⚡ {me.xp} XP</Badge>}
          </div>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 px-4 pb-2 pt-1">
        {error ? (
          <EmptyState
            icon={<RotateCcw size={28} />}
            title="Your deck didn’t load"
            text="Probably a hiccup. Give it another go."
            action={<Button onClick={reload}>Try again</Button>}
          />
        ) : (loading && !deck) || !me ? (
          <SwipeCardSkeleton />
        ) : hasCards ? (
          <SwipeDeck items={deck!} exiting={exiting} reducedMotion={reducedMotion} onSwipe={swipe} onTap={tapCard} />
        ) : (
          <DeckEmpty
            radius={radius}
            onRadius={changeRadius}
            onReviewPassed={() => (includePassed ? reload() : setIncludePassed(true))}
          />
        )}
      </main>

      {/* Pop-Buttons */}
      <div className={cn('flex h-20 shrink-0 items-center justify-center gap-5 pb-3 pt-2', !hasCards && !history && 'invisible')}>
        {hasCards && (
          <button
            onClick={() => swipe('pass')}
            disabled={busy || !hasCards}
            aria-label="Pass"
            className="pop flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink disabled:opacity-50"
          >
            <X size={30} strokeWidth={2.5} />
          </button>
        )}
        <button
          onClick={undo}
          disabled={!history || !!pending || busy}
          aria-label="Undo last swipe"
          className="pop flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink disabled:opacity-40"
        >
          <Undo2 size={20} strokeWidth={2.25} />
        </button>
        {hasCards && (
          <button
            onClick={() => swipe('like')}
            disabled={busy || !hasCards}
            aria-label="Like"
            className="pop flex h-16 w-16 items-center justify-center rounded-full bg-pink text-white disabled:opacity-50"
          >
            <Heart size={30} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <Sheet open={radiusOpen} onClose={() => setRadiusOpen(false)} title="Swipe radius">
        <p className="mb-4 text-sm text-ink-muted">Show stuff up to this far from {me?.district ?? 'you'}.</p>
        <RadiusPicker value={radius} onChange={changeRadius} />
      </Sheet>

      {match && (
        <MatchOverlay
          match={match.match}
          xp={match.xp}
          onChat={() => navigate(`/chats/${match.match.chat_id}`)}
          onClose={closeMatch}
        />
      )}
    </div>
  )
}

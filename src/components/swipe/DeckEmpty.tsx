import { Link } from 'react-router-dom'
import { Compass, PartyPopper, RotateCcw } from 'lucide-react'
import { api } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { RADIUS_STEPS } from '@/lib/geo'
import { RadiusPicker } from '../RadiusPicker'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'

/** Deck leer: nie ein toter Screen – Radius erweitern, Gepasste nochmal, oder stöbern. */
export function DeckEmpty({
  radius,
  onRadius,
  onReviewPassed,
}: {
  radius: number
  onRadius: (km: number) => void
  onReviewPassed: () => void
}) {
  const { data, loading } = useAsync(async () => {
    const [wide, passed] = await Promise.all([
      api.getSwipeDeck({ radius_km: RADIUS_STEPS[RADIUS_STEPS.length - 1] }),
      api.getSwipeDeck({ radius_km: radius, include_passed: true }),
    ])
    return { wide, passed: passed.length }
  }, [radius])

  const newWithin = (km: number) => data?.wide.filter((l) => (l.distance_km ?? 0) <= km).length ?? 0

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-tint text-ink">
        <PartyPopper size={30} strokeWidth={2} />
      </div>
      <h2 className="text-2xl">Your Kiez is swiped clean 🎉</h2>
      <p className="mt-1 text-ink-muted">You’ve seen everything within {radius} km. Go wider, or take another look.</p>

      <div className="mt-6 w-full max-w-xs">
        <p className="mb-2 text-sm font-bold">Widen your radius</p>
        {loading && !data ? (
          <div className="flex justify-center gap-2">
            {RADIUS_STEPS.map((km) => <Skeleton key={km} className="h-9 w-16 rounded-full" />)}
          </div>
        ) : (
          <RadiusPicker
            className="flex justify-center [&>div]:justify-center"
            value={radius}
            onChange={onRadius}
            extra={(km) => (km > radius ? `+${newWithin(km)}` : null)}
          />
        )}
      </div>

      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        {!!data?.passed && (
          <Button variant="outline" onClick={onReviewPassed}>
            <RotateCcw size={18} strokeWidth={2} /> See passed again ({data.passed})
          </Button>
        )}
        <Link to="/explore" className="inline-flex items-center justify-center gap-1.5 py-2 font-bold text-ink underline-offset-4 hover:underline">
          <Compass size={18} strokeWidth={2} /> Rather browse? Explore
        </Link>
      </div>
    </div>
  )
}

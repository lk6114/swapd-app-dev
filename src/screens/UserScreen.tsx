import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Flag, MapPin, PackageOpen, Pencil, Star, UserX } from 'lucide-react'
import { api, type SubmitReviewResult } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Avatar } from '@/components/Avatar'
import { Stars } from '@/components/Stars'
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard'
import { ReviewCard } from '@/components/ReviewCard'
import { RateSheet } from '@/components/RateSheet'
import { ReportSheet } from '@/components/ReportSheet'
import { EmptyState } from '@/components/EmptyState'
import { useCurrentUser } from '@/components/CurrentUser'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Öffentliches Profil einer anderen Person (aus Chat, Inserat, Bewertungen). */
export function UserScreen() {
  const { id = '' } = useParams()
  const { me, refresh } = useCurrentUser()
  const toast = useToast()
  const [tab, setTab] = useState<'listings' | 'reviews'>('reviews')
  const [rateOpen, setRateOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const { data: user, loading, error, reload: reloadUser } = useAsync(() => api.getUser(id), [id])
  const { data: listings, loading: lLoading } = useAsync(() => api.getListings({ user_id: id }), [id])
  const { data: reviews, loading: rLoading, reload: reloadReviews } = useAsync(() => api.getReviews(id), [id])
  const { data: interaction, reload: reloadInteraction } = useAsync(() => api.getUserInteraction(id), [id])

  if (me && id === me.id) return <Navigate to="/profile" replace />

  if (loading) {
    return (
      <>
        <ScreenHeader back />
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    )
  }

  if (error || !user) {
    return (
      <>
        <ScreenHeader back />
        <EmptyState
          icon={<UserX size={28} />}
          title={error ? 'That didn’t load' : 'User not found'}
          text={error ? 'Probably a hiccup. Give it another go.' : 'This profile doesn’t exist anymore.'}
          action={error ? <Button onClick={reloadUser}>Try again</Button> : undefined}
        />
      </>
    )
  }

  function rated(res: SubmitReviewResult) {
    setRateOpen(false)
    toast(res.xp_earned ? `+${res.xp_earned} XP – thanks for rating!` : 'Rating updated', res.xp_earned ? 'reward' : 'info')
    setTab('reviews')
    reloadUser()
    reloadReviews()
    reloadInteraction()
    if (res.xp_earned) refresh()
  }

  function reported() {
    setReportOpen(false)
    toast('Thanks. We’ll take a look.')
    reloadInteraction()
  }

  const myReview = interaction?.my_review ?? null
  const hasRating = user.rating_count > 0

  return (
    <>
      <ScreenHeader back title={user.name} />
      <main className="space-y-5 px-4 pb-8">
        <div className="flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0">
            <h1 className="text-3xl">{user.name}</h1>
            <p className="flex items-center gap-1 text-sm text-ink-muted">
              <MapPin size={14} strokeWidth={2} /> {user.district}
            </p>
          </div>
        </div>
        {user.bio && <p>{user.bio}</p>}

        {/* Rating + Rate-Button */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <p className="font-display text-5xl font-extrabold leading-none">{hasRating ? user.rating_avg.toFixed(1) : '–'}</p>
            <div className="min-w-0 flex-1">
              <Stars value={user.rating_avg} size={18} />
              <p className="mt-1 text-sm text-ink-muted">
                {hasRating ? `${user.rating_count} rating${user.rating_count > 1 ? 's' : ''}` : 'No ratings yet'} ·{' '}
                {user.swaps_count} swaps
              </p>
            </div>
          </div>

          <div className="mt-4">
            {!interaction ? (
              <Skeleton className="h-12 w-full rounded-full" />
            ) : myReview ? (
              <Button variant="outline" className="w-full" onClick={() => setRateOpen(true)}>
                <Pencil size={18} strokeWidth={2} /> You gave {myReview.rating}★ · Edit
              </Button>
            ) : interaction.can_rate ? (
              <Button className="w-full" onClick={() => setRateOpen(true)}>
                <Star size={18} strokeWidth={2.25} /> Rate {user.name}
              </Button>
            ) : (
              <p className="rounded-full bg-surface py-3 text-center text-sm font-bold text-ink-muted">
                Swap with {user.name} first to rate them
              </p>
            )}
          </div>
        </Card>

        <div className="flex gap-6 border-b border-line">
          {(['reviews', 'listings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                '-mb-px border-b-2 pb-2 font-bold capitalize',
                tab === t ? 'border-pink text-ink' : 'border-transparent text-ink-muted',
              )}
            >
              {t}
              <span className="ml-1 text-ink-muted">
                {t === 'reviews' ? (reviews?.length ?? '') : (listings?.length ?? '')}
              </span>
            </button>
          ))}
        </div>

        {tab === 'reviews' &&
          (rLoading && !reviews ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : reviews?.length ? (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id}>
                  <ReviewCard review={r} meId={me?.id} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Star size={28} />} title="No reviews yet" text="Swap with them and be the first." />
          ))}

        {tab === 'listings' &&
          (lLoading && !listings ? (
            <div className="grid grid-cols-2 gap-3">
              <ListingCardSkeleton />
              <ListingCardSkeleton />
            </div>
          ) : listings?.length ? (
            <div className="grid grid-cols-2 gap-3">
              {listings.map((l) => <ListingCard key={l.id} listing={l} me={me} />)}
            </div>
          ) : (
            <EmptyState icon={<PackageOpen size={28} />} title="No listings right now" />
          ))}

        {/* Report ganz unten */}
        <div className="border-t border-line pt-6 text-center">
          {interaction?.reported ? (
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-muted">
              <Flag size={16} strokeWidth={2} /> Reported. Thanks for looking out.
            </p>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)} disabled={!interaction}>
              <Flag size={16} strokeWidth={2} /> Report {user.name}
            </Button>
          )}
        </div>
      </main>

      <RateSheet open={rateOpen} onClose={() => setRateOpen(false)} user={user} existing={myReview} onDone={rated} />
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} user={user} onDone={reported} />
    </>
  )
}

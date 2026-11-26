import { useState } from 'react'
import { MapPin, PackageOpen, Star } from 'lucide-react'
import { api } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { timeAgo } from '@/lib/format'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Avatar } from '@/components/Avatar'
import { XpBar } from '@/components/XpBar'
import { Stars } from '@/components/Stars'
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard'
import { EmptyState } from '@/components/EmptyState'
import { useCurrentUser } from '@/components/CurrentUser'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function ProfileScreen() {
  const { me, loading: meLoading } = useCurrentUser()
  const [tab, setTab] = useState<'listings' | 'reviews'>('listings')
  const { data: listings, loading: lLoading } = useAsync(
    () => (me ? api.getListings({ user_id: me.id }) : Promise.resolve([])),
    [me?.id],
  )
  const { data: reviews, loading: rLoading } = useAsync(
    () => (me ? api.getReviews(me.id) : Promise.resolve([])),
    [me?.id],
  )

  async function resetDemo() {
    if (!confirm('Reset all demo data? Swipes, matches, chats and new listings will be gone.')) return
    await api.resetDemoData?.()
    location.reload()
  }

  if (meLoading || !me) {
    return (
      <>
        <ScreenHeader title="Profile" />
        <div className="space-y-4 p-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-16 w-full" />
        </div>
      </>
    )
  }

  return (
    <>
      <ScreenHeader title="Profile" />
      <main className="space-y-5 px-4">
        <div className="flex items-center gap-4">
          <Avatar user={me} size="lg" />
          <div className="min-w-0">
            <h1 className="text-3xl">{me.name}</h1>
            <p className="flex items-center gap-1 text-sm text-ink-muted">
              <MapPin size={14} strokeWidth={2} /> {me.district}
            </p>
          </div>
        </div>
        {me.bio && <p>{me.bio}</p>}

        <Card className="p-4">
          <XpBar xp={me.xp} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="reward">🌱 Plant Parent</Badge>
            <Badge variant="reward">🔁 First Swap</Badge>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { value: me.swaps_count, label: 'Swaps' },
            { value: me.rating_avg.toFixed(1), label: 'Rating' },
            { value: listings?.length ?? '–', label: 'Listings' },
          ].map((s) => (
            <Card key={s.label} className="py-3">
              <p className="font-display text-2xl font-extrabold">{s.value}</p>
              <p className="text-xs font-bold text-ink-muted">{s.label}</p>
            </Card>
          ))}
        </div>

        <div className="flex gap-6 border-b border-line">
          {(['listings', 'reviews'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                '-mb-px border-b-2 pb-2 font-bold capitalize',
                tab === t ? 'border-pink text-ink' : 'border-transparent text-ink-muted',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'listings' &&
          (lLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <ListingCardSkeleton />
              <ListingCardSkeleton />
            </div>
          ) : listings?.length ? (
            <div className="grid grid-cols-2 gap-3">
              {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          ) : (
            <EmptyState icon={<PackageOpen size={28} />} title="No listings yet" text="Post your first one and earn XP." />
          ))}

        {tab === 'reviews' &&
          (rLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : reviews?.length ? (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar user={r.reviewer} size="sm" />
                    <div className="flex-1">
                      <p className="font-bold">{r.reviewer?.name}</p>
                      <Stars value={r.rating} size={12} />
                    </div>
                    <span className="text-xs text-ink-muted">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm">{r.text}</p>
                </Card>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Star size={28} />} title="No reviews yet" />
          ))}

        {api.resetDemoData && (
          <div className="pb-4 pt-8 text-center">
            <button onClick={resetDemo} className="text-xs font-bold text-ink-muted/70 underline-offset-4 hover:underline">
              Reset demo
            </button>
          </div>
        )}
      </main>
    </>
  )
}

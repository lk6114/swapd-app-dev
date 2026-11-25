import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapPin, Repeat2, SearchX } from 'lucide-react'
import { api } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { CATEGORY_LABEL, CONDITION_LABEL, distanceKm, formatDistance, timeAgo } from '@/lib/format'
import { ScreenHeader } from '@/components/ScreenHeader'
import { ListingPhoto } from '@/components/ListingPhoto'
import { TypeBadge } from '@/components/TypeBadge'
import { Avatar } from '@/components/Avatar'
import { Stars } from '@/components/Stars'
import { EmptyState } from '@/components/EmptyState'
import { useCurrentUser } from '@/components/CurrentUser'
import { useToast } from '@/components/Toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ListingScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { me } = useCurrentUser()
  const { data: listing, loading } = useAsync(() => api.getListing(id), [id])
  const [starting, setStarting] = useState(false)

  if (loading) {
    return (
      <>
        <ScreenHeader back />
        <Skeleton className="aspect-square w-full rounded-none" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </>
    )
  }

  if (!listing) {
    return (
      <>
        <ScreenHeader back />
        <EmptyState icon={<SearchX size={28} />} title="Listing not found" text="Maybe it was already swapped." />
      </>
    )
  }

  const isMine = listing.user_id === me?.id
  const owner = listing.owner

  async function requestSwap() {
    setStarting(true)
    try {
      const chat = await api.startChat(listing!.id)
      navigate(`/chats/${chat.id}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong')
      setStarting(false)
    }
  }

  return (
    <div className="pb-28">
      <ScreenHeader back />
      <ListingPhoto listing={listing} className="aspect-square w-full" iconSize={80} />

      <div className="space-y-5 p-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <TypeBadge type={listing.type} />
            <Badge>{CATEGORY_LABEL[listing.category]}</Badge>
            <Badge>{CONDITION_LABEL[listing.condition]}</Badge>
          </div>
          <h1 className="text-3xl leading-tight">{listing.title}</h1>
          <p className="mt-2 flex items-center gap-1 text-sm text-ink-muted">
            <MapPin size={14} strokeWidth={2} />
            {listing.district}
            {me && !isMine && <> · {formatDistance(distanceKm(me, listing))} away</>}
            <span aria-hidden>·</span> {timeAgo(listing.created_at)}
          </p>
        </div>

        {listing.description && <p className="leading-relaxed">{listing.description}</p>}

        {owner && (
          <Card className="flex items-center gap-3 p-4">
            <Avatar user={owner} />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{isMine ? 'You' : owner.name}</p>
              <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                <Stars value={owner.rating_avg} size={12} /> {owner.rating_avg.toFixed(1)} · {owner.swaps_count} swaps
              </p>
            </div>
          </Card>
        )}
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-lg p-4">
          {isMine ? (
            <Link to="/profile" className="block text-center font-bold text-ink-muted">
              This is your listing
            </Link>
          ) : (
            <Button size="lg" className="w-full" onClick={requestSwap} disabled={starting}>
              <Repeat2 size={22} strokeWidth={2.25} />
              {starting ? 'Opening chat…' : listing.type === 'offer' ? 'Request swap' : 'I have this!'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

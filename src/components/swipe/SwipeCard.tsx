import { MapPin, Sparkles } from 'lucide-react'
import type { Listing } from '@/data'
import { CATEGORY_LABEL, CONDITION_LABEL, formatDistance } from '@/lib/format'
import { ListingPhoto } from '../ListingPhoto'
import { Avatar } from '../Avatar'
import { Stars } from '../Stars'
import { Badge } from '../ui/badge'
import { Skeleton } from '../ui/skeleton'

/** Inhalt einer Swipe-Karte. Drag-Logik sitzt in SwipeDeck. */
export function SwipeCard({ listing, like = 0, pass = 0 }: { listing: Listing; like?: number; pass?: number }) {
  const owner = listing.owner
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border-2 border-ink bg-white shadow-pop">
      <div className="relative min-h-0 flex-1">
        <ListingPhoto listing={listing} className="h-full w-full" iconSize={96} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge variant="neutral" className="border-ink/20">{CATEGORY_LABEL[listing.category]}</Badge>
          {listing.matches_my_search && (
            <Badge variant="search" className="border border-ink/20">
              <Sparkles size={12} strokeWidth={2} /> On your list
            </Badge>
          )}
        </div>

        {/* Stamps beim Ziehen */}
        <span
          aria-hidden
          style={{ opacity: like }}
          className="pointer-events-none absolute left-5 top-14 -rotate-12 rounded-sm border-2 border-ink bg-green px-3 py-1 font-display text-3xl font-extrabold uppercase text-ink"
        >
          Want it
        </span>
        <span
          aria-hidden
          style={{ opacity: pass }}
          className="pointer-events-none absolute right-5 top-14 rotate-12 rounded-sm border-2 border-ink bg-ink px-3 py-1 font-display text-3xl font-extrabold uppercase text-white"
        >
          Nope
        </span>
      </div>

      <div className="space-y-2 border-t-2 border-ink p-4">
        <h2 className="line-clamp-2 text-2xl leading-tight">{listing.title}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <Badge>{CONDITION_LABEL[listing.condition]}</Badge>
          <span className="inline-flex items-center gap-1 font-bold text-ink">
            <MapPin size={14} strokeWidth={2} />
            {listing.distance_km !== undefined && <>{formatDistance(listing.distance_km)} · </>}
            {listing.district}
          </span>
        </div>
        {owner && (
          <div className="flex items-center gap-2 pt-1">
            <Avatar user={owner} size="sm" />
            <span className="truncate font-bold">{owner.name}</span>
            <Stars value={owner.rating_avg} size={12} />
            <span className="text-xs text-ink-muted">{owner.rating_avg.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function SwipeCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border-2 border-line bg-white">
      <Skeleton className="flex-1 rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-9 w-2/3 rounded-full" />
      </div>
    </div>
  )
}

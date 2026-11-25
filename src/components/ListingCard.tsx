import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import type { Listing, User } from '@/data'
import { distanceKm, formatDistance } from '@/lib/format'
import { ListingPhoto } from './ListingPhoto'
import { TypeBadge } from './TypeBadge'
import { Skeleton } from './ui/skeleton'

export function ListingCard({ listing, me }: { listing: Listing; me?: User | null }) {
  const km = me ? distanceKm(me, listing) : null
  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group block overflow-hidden rounded-md border border-line bg-white transition-transform active:scale-[0.98]"
    >
      <div className="relative">
        <ListingPhoto listing={listing} className="aspect-square w-full" />
        <TypeBadge type={listing.type} className="absolute left-2 top-2 border border-white/60" />
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-bold leading-snug">{listing.title}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
          <MapPin size={12} strokeWidth={2} />
          {km !== null ? formatDistance(km) : listing.district}
          <span aria-hidden>·</span>
          <span className="truncate">{listing.owner?.name}</span>
        </p>
      </div>
    </Link>
  )
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-white">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

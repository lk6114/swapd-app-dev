import { Link } from 'react-router-dom'
import { ChevronRight, MapPin } from 'lucide-react'
import type { Listing, User } from '@/data'
import { distanceKm, formatDistance } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ListingPhoto } from './ListingPhoto'
import { TypeBadge } from './TypeBadge'
import { Avatar } from './Avatar'
import { Skeleton } from './ui/skeleton'

/** "1.2 km · Vaihingen" – nie die genaue Adresse. Bei eigenen Inseraten nur der Stadtteil. */
export function placeLabel(listing: Listing, me?: User | null) {
  if (me && listing.user_id === me.id) return listing.district
  const km = listing.distance_km ?? (me ? distanceKm(me, listing) : null)
  return km !== null ? `${formatDistance(km)} · ${listing.district}` : listing.district
}

export function ListingCard({ listing, me }: { listing: Listing; me?: User | null }) {
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
          <MapPin size={12} strokeWidth={2} className="shrink-0" />
          <span className="truncate">{placeLabel(listing, me)}</span>
        </p>
      </div>
    </Link>
  )
}

/** Kompakte Zeile (z. B. im Karten-Sheet). */
export function ListingRow({ listing, me, className }: { listing: Listing; me?: User | null; className?: string }) {
  return (
    <Link
      to={`/listing/${listing.id}`}
      className={cn('flex items-center gap-3 rounded-md border-2 border-ink bg-white p-2 pr-3 shadow-pop', className)}
    >
      <ListingPhoto listing={listing} className="h-20 w-20 shrink-0 rounded-sm" iconSize={32} />
      <div className="min-w-0 flex-1">
        <TypeBadge type={listing.type} />
        <p className="mt-1 truncate font-bold">{listing.title}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
          <MapPin size={12} strokeWidth={2} className="shrink-0" />
          <span className="truncate">{placeLabel(listing, me)}</span>
        </p>
        {listing.owner && (
          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold">
            <Avatar user={listing.owner} className="h-5 w-5 text-[10px]" /> {listing.owner.name}
          </p>
        )}
      </div>
      <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-ink-muted" />
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

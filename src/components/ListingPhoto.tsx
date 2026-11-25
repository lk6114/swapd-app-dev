import type { Listing } from '@/data'
import { cn } from '@/lib/utils'
import { CategoryIcon } from './CategoryIcon'

/** Foto des Inserats – oder ein Platzhalter mit Kategorie-Icon. */
export function ListingPhoto({ listing, className, iconSize = 40 }: { listing: Listing; className?: string; iconSize?: number }) {
  if (listing.photo_url) {
    return <img src={listing.photo_url} alt={listing.title} className={cn('object-cover', className)} />
  }
  const isOffer = listing.type === 'offer'
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        isOffer ? 'bg-pink-tint text-pink' : 'bg-green-tint text-ink',
        className,
      )}
    >
      <CategoryIcon category={listing.category} size={iconSize} />
    </div>
  )
}

import type { ListingType } from '@/data'
import { Badge } from './ui/badge'

export function TypeBadge({ type, className }: { type: ListingType; className?: string }) {
  return type === 'offer' ? (
    <Badge variant="offer" className={className}>Offering</Badge>
  ) : (
    <Badge variant="search" className={className}>Looking for</Badge>
  )
}

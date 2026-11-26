import { Link } from 'react-router-dom'
import type { Review } from '@/data'
import { timeAgo } from '@/lib/format'
import { Avatar } from './Avatar'
import { Stars } from './Stars'
import { Card } from './ui/card'

export function ReviewCard({ review, meId }: { review: Review; meId?: string }) {
  const r = review
  const isMe = r.reviewer_id === meId
  const name = isMe ? 'You' : r.reviewer?.name
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Avatar user={r.reviewer} size="sm" />
        <div className="min-w-0 flex-1">
          {isMe || !r.reviewer ? (
            <p className="font-bold">{name}</p>
          ) : (
            <Link to={`/users/${r.reviewer_id}`} className="block w-fit font-bold hover:underline">
              {name}
            </Link>
          )}
          <Stars value={r.rating} size={12} />
        </div>
        <span className="text-xs text-ink-muted">{timeAgo(r.created_at)}</span>
      </div>
      {r.text && <p className="mt-2 text-sm">{r.text}</p>}
    </Card>
  )
}

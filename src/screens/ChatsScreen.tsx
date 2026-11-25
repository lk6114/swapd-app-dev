import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { api } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { timeAgo } from '@/lib/format'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Avatar } from '@/components/Avatar'
import { ListingPhoto } from '@/components/ListingPhoto'
import { EmptyState } from '@/components/EmptyState'
import { useCurrentUser } from '@/components/CurrentUser'
import { Skeleton } from '@/components/ui/skeleton'

export function ChatsScreen() {
  const { me } = useCurrentUser()
  const { data: chats, loading } = useAsync(() => api.getChats())

  return (
    <>
      <ScreenHeader title="Chats" />
      <main className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !chats?.length ? (
          <EmptyState icon={<MessageCircle size={28} />} title="No chats yet" text="Find something you like and request a swap." />
        ) : (
          <ul className="divide-y divide-line">
            {chats.map((c) => (
              <li key={c.id}>
                <Link to={`/chats/${c.id}`} className="flex items-center gap-3 py-3">
                  <Avatar user={c.other_user} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-bold">{c.other_user?.name}</p>
                      {c.last_message && (
                        <span className="shrink-0 text-xs text-ink-muted">{timeAgo(c.last_message.created_at)}</span>
                      )}
                    </div>
                    <p className="truncate text-sm text-ink-muted">
                      {c.last_message
                        ? `${c.last_message.sender_id === me?.id ? 'You: ' : ''}${c.last_message.text}`
                        : `About: ${c.listing?.title}`}
                    </p>
                  </div>
                  {c.listing && <ListingPhoto listing={c.listing} className="h-12 w-12 shrink-0 rounded-sm" iconSize={20} />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}

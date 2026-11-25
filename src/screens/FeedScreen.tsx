import { useEffect, useState } from 'react'
import { Search, PackageOpen } from 'lucide-react'
import { api, CATEGORIES, type Category, type ListingType } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { CATEGORY_LABEL } from '@/lib/format'
import { Logo } from '@/components/Logo'
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard'
import { useCurrentUser } from '@/components/CurrentUser'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Chip } from '@/components/ui/chip'
import { cn } from '@/lib/utils'

export function FeedScreen() {
  const { me } = useCurrentUser()
  const [type, setType] = useState<ListingType>('offer')
  const [category, setCategory] = useState<Category | undefined>()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const { data: listings, loading } = useAsync(
    () => api.getListings({ type, category, query: debounced }),
    [type, category, debounced],
  )
  const visible = listings?.filter((l) => l.user_id !== me?.id)

  return (
    <>
      <header className="pt-safe sticky top-0 z-20 bg-surface/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo />
          {me && <Badge variant="reward" className="font-display text-sm">⚡ {me.xp} XP</Badge>}
        </div>
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 rounded-full border-2 border-ink bg-white p-1">
            {(['offer', 'search'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  'h-9 rounded-full text-sm font-bold transition-colors',
                  type === t ? 'bg-ink text-white' : 'text-ink-muted',
                )}
              >
                {t === 'offer' ? 'Offering' : 'Looking for'}
              </button>
            ))}
          </div>
          <div className="relative mt-3">
            <Search size={18} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your Kiez…"
              className="h-11 w-full rounded-full border-2 border-line bg-white pl-11 pr-4 outline-none focus:border-ink"
            />
          </div>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
          <Chip active={!category} onClick={() => setCategory(undefined)}>All</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? undefined : c)}>
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </div>
      </header>

      <main className="px-4 pt-1">
        {loading && !listings ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)}
          </div>
        ) : visible && visible.length > 0 ? (
          <div className={cn('grid grid-cols-2 gap-3 transition-opacity', loading && 'opacity-60')}>
            {visible.map((l) => <ListingCard key={l.id} listing={l} me={me} />)}
          </div>
        ) : (
          <EmptyState icon={<PackageOpen size={28} />} title="Nothing here yet" text="Try another category, or be the first to post one." />
        )}
      </main>
    </>
  )
}

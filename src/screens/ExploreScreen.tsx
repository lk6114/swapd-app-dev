import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { List, LocateFixed, Map as MapIcon, PackageOpen, RotateCcw, Search, X } from 'lucide-react'
import { api, CATEGORIES, type Category, type Listing, type ListingType } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { CATEGORY_LABEL } from '@/lib/format'
import { RADIUS_STEPS, type LatLng } from '@/lib/geo'
import { ListingCard, ListingCardSkeleton, ListingRow } from '@/components/ListingCard'
import { useCurrentUser } from '@/components/CurrentUser'
import { useToast } from '@/components/Toast'
import { EmptyState } from '@/components/EmptyState'
import { RadiusChip, RadiusPicker } from '@/components/RadiusPicker'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const ListingMap = lazy(() => import('@/components/map/ListingMap'))

type View = 'map' | 'list'
type TypeFilter = 'all' | ListingType

/** Segment-Toggle im CD (Ink = aktiv). */
function Segment<T extends string>({
  value,
  options,
  onChange,
  className,
  label,
}: {
  value: T
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (v: T) => void
  className?: string
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('grid rounded-full border-2 border-ink bg-white p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-bold transition-colors',
            value === o.value ? 'bg-ink text-white' : 'text-ink-muted',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ExploreScreen() {
  const { me } = useCurrentUser()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  // Filter liegen in der URL → nach Detail → Zurück ist alles noch da
  const view: View = params.get('view') === 'map' ? 'map' : 'list'
  const type = (['offer', 'search'].includes(params.get('type') ?? '') ? params.get('type') : 'all') as TypeFilter
  const category = (CATEGORIES as readonly string[]).includes(params.get('cat') ?? '')
    ? (params.get('cat') as Category)
    : undefined
  const radiusParam = Number(params.get('r'))
  const radius = (RADIUS_STEPS as readonly number[]).includes(radiusParam) ? radiusParam : (me?.search_radius_km ?? 5)
  const urlQuery = params.get('q') ?? ''

  const setParam = (key: string, value: string | null) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  const [query, setQuery] = useState(urlQuery)
  useEffect(() => {
    const t = setTimeout(() => query !== urlQuery && setParam('q', query.trim() || null), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const [near, setNear] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState(false)
  const [radiusOpen, setRadiusOpen] = useState(false)
  const [selected, setSelected] = useState<Listing | null>(null)

  const filter = {
    type: type === 'all' ? undefined : type,
    category,
    query: urlQuery,
    radius_km: radius,
    near: near ?? undefined,
  }
  const { data: listings, loading, error, reload } = useAsync(
    () => (me ? api.getListings(filter) : Promise.resolve(undefined)),
    [me?.id, type, category, urlQuery, radius, near?.lat, near?.lng],
  )
  const { data: matches } = useAsync(() => api.getMatches(), [])

  const visible = useMemo(() => listings?.filter((l) => l.user_id !== me?.id), [listings, me?.id])
  const matchedIds = useMemo(
    () => new Set((matches ?? []).flatMap((m) => m.listing_ids)),
    [matches],
  )
  const center: LatLng | null = near ?? (me ? { lat: me.lat, lng: me.lng } : null)
  const nextRadius = RADIUS_STEPS.find((km) => km > radius)

  // Auswahl verwerfen, wenn das Inserat durch Filter verschwindet
  useEffect(() => {
    if (selected && visible && !visible.some((l) => l.id === selected.id)) setSelected(null)
  }, [visible, selected])

  function toggleMyLocation() {
    if (near) {
      setNear(null)
      return
    }
    if (!('geolocation' in navigator)) {
      toast('Your browser can’t share a location')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        try {
          const around = await api.getListings({ ...filter, near: here, radius_km: RADIUS_STEPS[RADIUS_STEPS.length - 1] })
          if (around.some((l) => l.user_id !== me?.id)) setNear(here)
          else toast(`No swaps near you yet. Showing ${me?.district ?? 'home'}.`)
        } catch {
          toast('Couldn’t load swaps around you')
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        toast(`No location access. Showing ${me?.district ?? 'home'}.`)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  const header = (
    <header className={cn('pt-safe z-20 bg-surface/90 backdrop-blur', view === 'list' && 'sticky top-0')}>
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <h1 className="text-2xl">Explore</h1>
        <Segment
          label="View"
          className="w-44"
          value={view}
          onChange={(v) => setParam('view', v === 'list' ? null : v)}
          options={[
            { value: 'map', label: 'Map', icon: <MapIcon size={15} strokeWidth={2} /> },
            { value: 'list', label: 'List', icon: <List size={15} strokeWidth={2} /> },
          ]}
        />
      </div>
      <div className="space-y-3 px-4 pb-3">
        <Segment
          label="Type"
          value={type}
          onChange={(v) => setParam('type', v === 'all' ? null : v)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'offer', label: 'Offering' },
            { value: 'search', label: 'Looking for' },
          ]}
        />
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={18} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your Kiez…"
              aria-label="Search"
              className="h-11 w-full rounded-full border-2 border-line bg-white pl-11 pr-9 outline-none focus:border-ink"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5"
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </div>
          <div className="flex items-center">
            <RadiusChip km={radius} onClick={() => setRadiusOpen(true)} />
          </div>
        </div>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
        <Chip active={!category} onClick={() => setParam('cat', null)}>All</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setParam('cat', category === c ? null : c)}>
            {CATEGORY_LABEL[c]}
          </Chip>
        ))}
      </div>
    </header>
  )

  const radiusSheet = (
    <Sheet open={radiusOpen} onClose={() => setRadiusOpen(false)} title="Radius">
      <p className="mb-4 text-sm text-ink-muted">Show stuff up to this far from {near ? 'your location' : (me?.district ?? 'you')}.</p>
      <RadiusPicker
        value={radius}
        onChange={(km) => {
          setParam('r', String(km))
          setRadiusOpen(false)
        }}
      />
    </Sheet>
  )

  const errorState = (
    <EmptyState
      icon={<RotateCcw size={28} />}
      title="That didn’t load"
      text="Probably a hiccup. Give it another go."
      action={<Button onClick={reload}>Try again</Button>}
    />
  )

  const widenAction = nextRadius ? (
    <Button variant="outline" onClick={() => setParam('r', String(nextRadius))}>
      Try {nextRadius} km
    </Button>
  ) : undefined

  if (view === 'list') {
    return (
      <>
        {header}
        <main className="px-4 pt-1">
          {error ? (
            errorState
          ) : (loading && !listings) || !me ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)}
            </div>
          ) : visible && visible.length > 0 ? (
            <div className={cn('grid grid-cols-2 gap-3 transition-opacity', loading && 'opacity-60')}>
              {visible.map((l) => <ListingCard key={l.id} listing={l} me={me} />)}
            </div>
          ) : (
            <EmptyState
              icon={<PackageOpen size={28} />}
              title="Nothing here yet"
              text={nextRadius ? 'Try a bigger radius or another category.' : 'Try another category, or be the first to post one.'}
              action={widenAction}
            />
          )}
        </main>
        {radiusSheet}
      </>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-6rem)] flex-col">
      {header}
      <div className="relative isolate min-h-0 flex-1 overflow-hidden border-t border-line">
        {error ? (
          errorState
        ) : !center ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : (
          <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
            <ListingMap
              listings={visible ?? []}
              center={center}
              radiusKm={radius}
              matchedIds={matchedIds}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          </Suspense>
        )}

        {/* Overlays über der Karte (z-index über den Leaflet-Panes) */}
        {!error && (
          <>
            <button
              onClick={toggleMyLocation}
              disabled={locating}
              aria-pressed={!!near}
              className={cn(
                'pop absolute right-3 top-3 z-[1000] inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold',
                near ? 'bg-ink text-white' : 'bg-white text-ink',
              )}
            >
              <LocateFixed size={16} strokeWidth={2} />
              {locating ? 'Locating…' : near ? 'Back to home' : 'Use my location'}
            </button>

            {loading && (
              <span className="absolute left-3 top-3 z-[1000] rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white">
                Loading…
              </span>
            )}

            {!loading && visible && visible.length === 0 && (
              <div className="absolute inset-x-3 bottom-8 z-[1000] flex items-center justify-between gap-3 rounded-md border-2 border-ink bg-white p-3 shadow-pop">
                <p className="text-sm font-bold">Nothing here yet.</p>
                {widenAction}
              </div>
            )}

            {selected && (
              <div className="absolute inset-x-3 bottom-8 z-[1000] motion-safe:animate-[sheet-in_.2s_ease-out]">
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close preview"
                  className="absolute -top-3 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
                <ListingRow listing={selected} me={me} />
              </div>
            )}
          </>
        )}
      </div>
      {radiusSheet}
    </div>
  )
}

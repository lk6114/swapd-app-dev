/**
 * Karte (Leaflet + react-leaflet). Wird per React.lazy geladen, damit Leaflet nicht im
 * Start-Bundle landet. Marker = divIcon mit CSS (index.css) → keine Marker-PNGs,
 * dadurch kein Ärger mit dem GitHub-Pages-Unterpfad.
 *
 * Pins, die sich bei der aktuellen Zoomstufe überlappen, werden zu einem Pin mit Zahl
 * zusammengefasst (eigene kleine Gruppierung, kein Plugin nötig).
 */
import { useEffect, useMemo, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Listing } from '@/data'
import { fuzzLocation, type LatLng } from '@/lib/geo'

const INK = '#1C1A2B'
/** Abstand in px, ab dem sich zwei Pins optisch überlappen. */
const MERGE_DISTANCE = 30

type PinKind = 'offer' | 'search' | 'match'

const iconCache = new Map<string, L.DivIcon>()
function cachedIcon(key: string, make: () => L.DivIcon) {
  if (!iconCache.has(key)) iconCache.set(key, make())
  return iconCache.get(key)!
}

function pinIcon(kind: PinKind, selected: boolean) {
  return cachedIcon(`pin-${kind}-${selected}`, () =>
    L.divIcon({
      className: 'swapd-pin-wrap',
      html: `<span class="swapd-pin swapd-pin--${kind}${selected ? ' is-selected' : ''}"></span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    }),
  )
}

function clusterIcon(kind: PinKind, count: number, selected: boolean) {
  const label = count > 99 ? '99+' : String(count)
  return cachedIcon(`cluster-${kind}-${label}-${selected}`, () =>
    L.divIcon({
      className: 'swapd-pin-wrap',
      html: `<span class="swapd-cluster swapd-cluster--${kind}${selected ? ' is-selected' : ''}">${label}</span>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    }),
  )
}

interface Pin {
  listing: Listing
  pos: LatLng
}

interface Group {
  pins: Pin[]
  center: LatLng
  point: L.Point
}

/** Fasst Pins zusammen, die bei Zoomstufe `zoom` näher als MERGE_DISTANCE px liegen. */
function groupPins(map: L.Map, pins: Pin[], zoom: number): Group[] {
  const groups: Group[] = []
  for (const pin of pins) {
    const p = map.project([pin.pos.lat, pin.pos.lng], zoom)
    const hit = groups.find((g) => g.point.distanceTo(p) < MERGE_DISTANCE)
    if (hit) {
      hit.pins.push(pin)
      const n = hit.pins.length
      hit.center = {
        lat: hit.center.lat + (pin.pos.lat - hit.center.lat) / n,
        lng: hit.center.lng + (pin.pos.lng - hit.center.lng) / n,
      }
      hit.point = map.project([hit.center.lat, hit.center.lng], zoom)
    } else {
      groups.push({ pins: [pin], center: pin.pos, point: p })
    }
  }
  return groups
}

/** Zoomt auf den Radius-Kreis, wenn sich Mittelpunkt oder Radius ändern. */
function FitRadius({ center, radiusKm }: { center: LatLng; radiusKm: number }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(L.latLng(center.lat, center.lng).toBounds(radiusKm * 2000), { padding: [16, 16] })
  }, [map, center.lat, center.lng, radiusKm])
  return null
}

function Pins({
  pins,
  matchedIds,
  selectedIds,
  onSelect,
}: {
  pins: Pin[]
  matchedIds: Set<string>
  selectedIds: Set<string>
  onSelect: (listings: Listing[] | null) => void
}) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    click: () => onSelect(null),
  })
  const groups = useMemo(() => groupPins(map, pins, zoom), [map, pins, zoom])

  return (
    <>
      {groups.map((g) => {
        const listings = g.pins.map((p) => p.listing)
        const kind: PinKind = listings.some((l) => matchedIds.has(l.id))
          ? 'match'
          : listings.some((l) => l.type === 'offer')
            ? 'offer'
            : 'search'
        const selected = listings.some((l) => selectedIds.has(l.id))
        const single = listings.length === 1
        return (
          <Marker
            key={listings.map((l) => l.id).join('|')}
            position={[g.center.lat, g.center.lng]}
            icon={single ? pinIcon(kind, selected) : clusterIcon(kind, listings.length, selected)}
            title={single ? listings[0].title : `${listings.length} swaps here`}
            keyboard
            zIndexOffset={selected ? 1000 : single ? 0 : 500}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e)
                onSelect(listings)
              },
            }}
          />
        )
      })}
    </>
  )
}

export interface ListingMapProps {
  listings: Listing[]
  center: LatLng
  radiusKm: number
  matchedIds: Set<string>
  selectedIds: Set<string>
  /** Ein Pin → [1 Inserat], ein Sammel-Pin → alle Inserate darin, Klick ins Leere → null. */
  onSelect: (listings: Listing[] | null) => void
}

export default function ListingMap({ listings, center, radiusKm, matchedIds, selectedIds, onSelect }: ListingMapProps) {
  const pins = useMemo(() => listings.map((l) => ({ listing: l, pos: fuzzLocation(l.id, l) })), [listings])

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      minZoom={9}
      maxZoom={17}
      zoomSnap={0.25}
      className="swapd-map h-full w-full"
      zoomControl={false}
      attributionControl
    >
      {/* OSM-Standardkacheln, per CSS (index.css) hell + entsättigt → passt zu 60 % Surface.
          CARTO Positron bräuchte inzwischen einen API-Key. Für echten Betrieb: Anbieter mit Key (z. B. MapTiler). */}
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <FitRadius center={center} radiusKm={radiusKm} />

      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        interactive={false}
        pathOptions={{ color: INK, weight: 1.5, opacity: 0.45, dashArray: '4 6', fillColor: INK, fillOpacity: 0.03 }}
      />

      <Pins pins={pins} matchedIds={matchedIds} selectedIds={selectedIds} onSelect={onSelect} />

      {/* Eigener Standort: Ink-Punkt */}
      <CircleMarker
        center={[center.lat, center.lng]}
        radius={8}
        interactive={false}
        pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: INK, fillOpacity: 1 }}
      />
    </MapContainer>
  )
}

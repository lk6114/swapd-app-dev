/**
 * Karte (Leaflet + react-leaflet). Wird per React.lazy geladen, damit Leaflet nicht im
 * Start-Bundle landet. Marker = divIcon mit CSS (index.css) → keine Marker-PNGs,
 * dadurch kein Ärger mit dem GitHub-Pages-Unterpfad.
 */
import { useEffect, useMemo } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Listing } from '@/data'
import { fuzzLocation, type LatLng } from '@/lib/geo'

const INK = '#1C1A2B'

type PinKind = 'offer' | 'search' | 'match'

const iconCache = new Map<string, L.DivIcon>()
function pinIcon(kind: PinKind, selected: boolean) {
  const key = `${kind}-${selected}`
  if (!iconCache.has(key)) {
    iconCache.set(
      key,
      L.divIcon({
        className: 'swapd-pin-wrap',
        html: `<span class="swapd-pin swapd-pin--${kind}${selected ? ' is-selected' : ''}"></span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      }),
    )
  }
  return iconCache.get(key)!
}

/** Zoomt auf den Radius-Kreis, wenn sich Mittelpunkt oder Radius ändern. */
function FitRadius({ center, radiusKm }: { center: LatLng; radiusKm: number }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(L.latLng(center.lat, center.lng).toBounds(radiusKm * 2000), { padding: [16, 16] })
  }, [map, center.lat, center.lng, radiusKm])
  return null
}

function MapClick({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: onClick })
  return null
}

export interface ListingMapProps {
  listings: Listing[]
  center: LatLng
  radiusKm: number
  matchedIds: Set<string>
  selectedId: string | null
  onSelect: (listing: Listing | null) => void
}

export default function ListingMap({ listings, center, radiusKm, matchedIds, selectedId, onSelect }: ListingMapProps) {
  const pins = useMemo(
    () => listings.map((l) => ({ listing: l, pos: fuzzLocation(l.id, l) })),
    [listings],
  )

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
      <MapClick onClick={() => onSelect(null)} />

      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        interactive={false}
        pathOptions={{ color: INK, weight: 1.5, opacity: 0.45, dashArray: '4 6', fillColor: INK, fillOpacity: 0.03 }}
      />

      {pins.map(({ listing, pos }) => {
        const kind: PinKind = matchedIds.has(listing.id) ? 'match' : listing.type
        return (
          <Marker
            key={listing.id}
            position={[pos.lat, pos.lng]}
            icon={pinIcon(kind, listing.id === selectedId)}
            title={listing.title}
            keyboard
            zIndexOffset={listing.id === selectedId ? 1000 : 0}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e)
                onSelect(listing)
              },
            }}
          />
        )
      })}

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

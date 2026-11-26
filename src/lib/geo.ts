/**
 * Geo-Helfer. Im Mock rechnen wir Distanzen im Browser,
 * später übernimmt das Postgres (PostGIS ST_DWithin / earthdistance).
 */

export interface LatLng {
  lat: number
  lng: number
}

/** Luftlinie in km (Haversine). */
export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Einfacher, stabiler Hash (gleiche ID → gleicher Wert). */
function hash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Datenschutz für Karten-Pins: Position um bis zu ~150 m versetzen (stabil pro ID)
 * und auf 3 Nachkommastellen (~100 m) runden. Die echte Adresse lässt sich so nicht ablesen.
 */
export function fuzzLocation(id: string, p: LatLng): LatLng {
  const h = hash(id)
  const angle = ((h % 360) * Math.PI) / 180
  const meters = 60 + ((h >>> 9) % 90) // 60–150 m
  const dLat = (meters * Math.cos(angle)) / 111_320
  const dLng = (meters * Math.sin(angle)) / (111_320 * Math.cos((p.lat * Math.PI) / 180))
  const round = (n: number) => Math.round(n * 1000) / 1000
  return { lat: round(p.lat + dLat), lng: round(p.lng + dLng) }
}

export const RADIUS_STEPS = [5, 10, 25, 50] as const

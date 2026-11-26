/**
 * Adresse → Koordinaten + Stadtteil über OpenStreetMap Nominatim (kostenlos, ohne Key).
 * Nutzungsregeln: max. 1 Anfrage/Sekunde, kein Autocomplete → wir fragen nur beim Speichern.
 * Später evtl. über eine Supabase Edge Function (eigener User-Agent, Caching).
 */

export interface GeocodeInput {
  street: string
  postal_code: string
  city: string
}

export interface GeocodeResult {
  lat: number
  lng: number
  district: string
}

interface NominatimHit {
  lat: string
  lon: string
  address?: Record<string, string | undefined>
}

export async function geocodeAddress(input: GeocodeInput): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'de',
    street: input.street,
    postalcode: input.postal_code,
    city: input.city,
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Address lookup is unavailable right now')
  const hits = (await res.json()) as NominatimHit[]
  const hit = hits[0]
  if (!hit) return null
  const a = hit.address ?? {}
  // Großstadt (Stuttgart): Stadtteil steht in suburb ("Vaihingen"). Kleinere Städte: town ("Böblingen").
  const raw = a.city
    ? (a.suburb ?? a.city_district ?? a.city)
    : (a.town ?? a.village ?? a.municipality ?? input.city)
  const district = raw.replace(/\s*\(.*\)$/, '')
  return { lat: Number(hit.lat), lng: Number(hit.lon), district }
}

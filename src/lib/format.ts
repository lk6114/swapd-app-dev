import type { Category, Condition } from '@/data'

/** Luftlinie in km (Haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.max(100, Math.round(km * 10) * 100)} m`
  return `${km.toFixed(1)} km`
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export const CATEGORY_LABEL: Record<Category, string> = {
  clothes: 'Clothes',
  books: 'Books',
  electronics: 'Electronics',
  home: 'Home',
  sports: 'Sports',
  kids: 'Kids',
  plants: 'Plants',
  other: 'Other',
}

export const CONDITION_LABEL: Record<Condition, string> = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  used: 'Used',
}

/** Gamification: Level aus XP (alle 200 XP ein Level). */
export const XP_PER_LEVEL = 200
export function levelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const into = xp % XP_PER_LEVEL
  return { level, into, needed: XP_PER_LEVEL, progress: into / XP_PER_LEVEL }
}

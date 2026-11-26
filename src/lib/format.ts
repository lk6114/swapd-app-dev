import type { Category, Condition } from '@/data'

export { distanceKm } from './geo'

export function formatDistance(km: number) {
  if (km < 1) return `${Math.max(100, Math.round(km * 10) * 100)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
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

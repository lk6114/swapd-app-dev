/**
 * Mock-Adapter (Phase 1): liest test.json (read-only) und legt Änderungen
 * als Overlay in localStorage ab. Verhält sich nach außen wie ein echtes Backend
 * (async + kleiner Fake-Delay), damit die UI später 1:1 mit Supabase läuft.
 */
import seed from './test.json'
import { distanceKm, type LatLng } from '@/lib/geo'
import type {
  Address,
  Chat,
  CreateListingResult,
  DataAdapter,
  Listing,
  ListingFilter,
  Match,
  Message,
  NewListing,
  RecordSwipeResult,
  Review,
  Swipe,
  SwipeDeckOptions,
  SwipeDirection,
  User,
} from './types'

/** Mock-Login: "du bist User 1". */
const CURRENT_USER_ID = '10000000-0000-4000-8000-000000000001'
/** v2 = Stuttgart-Daten. Alte Berlin-Overlays (v1) werden damit ignoriert. */
const STORAGE_KEY = 'swapd:mock:v2'

const XP_PER_LISTING = 10
const XP_PER_PHOTO = 10
const XP_PER_MATCH = 25

/** Für undoLastSwipe: was der Swipe alles ausgelöst hat. */
interface SwipeLogEntry {
  swipe_id: string
  previous: Swipe | null
  match_id: string | null
  xp: number
}

interface Overlay {
  listings: Listing[]
  chats: Chat[]
  messages: Message[]
  xp_bonus: Record<string, number>
  swipes: Swipe[]
  matches: Match[]
  swipe_log: SwipeLogEntry[]
  user_patch: Record<string, Partial<User>>
  addresses: Address[]
}

const emptyOverlay = (): Overlay => ({
  listings: [],
  chats: [],
  messages: [],
  xp_bonus: {},
  swipes: [],
  matches: [],
  swipe_log: [],
  user_patch: {},
  addresses: [],
})

function loadOverlay(): Overlay {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...emptyOverlay(), ...JSON.parse(raw) } : emptyOverlay()
  } catch {
    return emptyOverlay()
  }
}

function saveOverlay(o: Overlay) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(o))
  } catch (e) {
    console.warn('[mock] localStorage voll oder blockiert', e)
  }
}

const delay = (ms = 150 + Math.random() * 250) => new Promise((r) => setTimeout(r, ms))

const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

// ---- "Tabellen" = Seed + Overlay ------------------------------------------

function users(): User[] {
  const { xp_bonus, user_patch } = loadOverlay()
  return (seed.users as User[]).map((u) => ({
    ...u,
    ...user_patch[u.id],
    xp: u.xp + (xp_bonus[u.id] ?? 0),
  }))
}
const listings = (): Listing[] => [...(seed.listings as Listing[]), ...loadOverlay().listings]
const chats = (): Chat[] => [...(seed.chats as Chat[]), ...loadOverlay().chats]
const messages = (): Message[] => [...(seed.messages as Message[]), ...loadOverlay().messages]
const reviews = (): Review[] => seed.reviews as Review[]
const addresses = (): Address[] => [...(seed.addresses as Address[]), ...loadOverlay().addresses]
const matches = (): Match[] => [...(seed.matches as Match[]), ...loadOverlay().matches]

/** Ein Swipe pro (user_id, listing_id) – Overlay überschreibt Seed (wie ein Upsert). */
function swipes(): Swipe[] {
  const byKey = new Map<string, Swipe>()
  for (const s of [...(seed.swipes as Swipe[]), ...loadOverlay().swipes]) byKey.set(`${s.user_id}|${s.listing_id}`, s)
  return [...byKey.values()]
}

const findUser = (id: string) => users().find((u) => u.id === id)
const me = () => findUser(CURRENT_USER_ID)!

// ---- Datenschutz: fremde Adressen verlassen die "API" nicht ---------------
// (addresses gibt es nur über getMyAddresses; bei fremden Inseraten auch keine address_id)

function publicUser(u: User | undefined): User | undefined {
  if (!u || u.id === CURRENT_USER_ID) return u
  return { ...u, last_address_id: null }
}

function publicListing(l: Listing): Listing {
  return {
    ...l,
    address_id: l.user_id === CURRENT_USER_ID ? l.address_id : null,
    owner: publicUser(findUser(l.user_id)),
  }
}

function withChatDetails(c: Chat): Chat {
  const listing = listings().find((l) => l.id === c.listing_id)
  const otherId = c.participant_ids.find((id) => id !== CURRENT_USER_ID)
  const msgs = messages()
    .filter((m) => m.chat_id === c.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  return {
    ...c,
    listing: listing ? publicListing(listing) : undefined,
    other_user: otherId ? publicUser(findUser(otherId)) : undefined,
    last_message: msgs[msgs.length - 1] ?? null,
  }
}

function withMatchDetails(m: Match): Match {
  const otherId = m.user_ids.find((id) => id !== CURRENT_USER_ID)
  return {
    ...m,
    listings: m.listing_ids
      .map((id) => listings().find((l) => l.id === id))
      .filter((l): l is Listing => !!l)
      .map(publicListing),
    other_user: otherId ? publicUser(findUser(otherId)) : undefined,
  }
}

// ---- Swipe-Deck: "passt zu meinem Looking for" ----------------------------

const STOP_WORDS = new Set(['inch', 'with', 'size', 'pieces', 'bundle', 'and', 'for', 'the'])
const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-zäöüß]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))

/** 2 = gleiche Kategorie + Stichwort aus meinem Gesuch im Titel, 1 = nur gleiche Kategorie, 0 = nichts. */
function searchScore(l: Listing, mySearches: Listing[]) {
  const title = new Set(words(l.title))
  const sameCat = mySearches.filter((s) => s.category === l.category)
  if (sameCat.some((s) => words(s.title).some((w) => title.has(w)))) return 2
  return sameCat.length ? 1 : 0
}

const mySearches = () =>
  listings().filter((l) => l.user_id === CURRENT_USER_ID && l.type === 'search' && l.status === 'active')

function toDeckItem(l: Listing, from: LatLng, searches: Listing[]): Listing {
  return {
    ...publicListing(l),
    distance_km: distanceKm(from, l),
    matches_my_search: searchScore(l, searches) === 2,
  }
}

// ---- Fake-Realtime ----------------------------------------------------------

const listeners = new Map<string, Set<(m: Message) => void>>()
const emit = (m: Message) => listeners.get(m.chat_id)?.forEach((fn) => fn(m))

const AUTO_REPLIES = [
  'Sounds good! 🙌',
  'Deal! When works for you?',
  'Nice, I’m around this weekend.',
  'Perfect, let’s do it!',
  'Can you send a photo?',
]

function newMessage(chatId: string, senderId: string, text: string): Message {
  return { id: uuid(), chat_id: chatId, sender_id: senderId, text, created_at: new Date().toISOString() }
}

function insertMessage(chatId: string, senderId: string, text: string): Message {
  const msg = newMessage(chatId, senderId, text)
  const o = loadOverlay()
  o.messages.push(msg)
  saveOverlay(o)
  return msg
}

// ---- Adapter ----------------------------------------------------------------

export const mockAdapter: DataAdapter = {
  async getListings(filter: ListingFilter = {}) {
    await delay()
    const q = filter.query?.trim().toLowerCase()
    const from = filter.near ?? me()
    return listings()
      .filter((l) => l.status === 'active')
      .filter((l) => !filter.type || l.type === filter.type)
      .filter((l) => !filter.category || l.category === filter.category)
      .filter((l) => !filter.user_id || l.user_id === filter.user_id)
      .filter((l) => !q || `${l.title} ${l.description}`.toLowerCase().includes(q))
      .map((l) => ({ ...publicListing(l), distance_km: distanceKm(from, l) }))
      .filter((l) => filter.radius_km === undefined || l.distance_km <= filter.radius_km)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(clone)
  },

  async getListing(id) {
    await delay()
    const l = listings().find((x) => x.id === id)
    return l ? clone({ ...publicListing(l), distance_km: distanceKm(me(), l) }) : null
  },

  async createListing(data: NewListing): Promise<CreateListingResult> {
    await delay(400)
    const user = me()
    const address = addresses().find((a) => a.id === data.address_id && a.user_id === user.id)
    if (!address) throw new Error('Pick a pickup address first')
    const listing: Listing = {
      ...data,
      id: uuid(),
      user_id: user.id,
      district: address.district,
      lat: address.lat,
      lng: address.lng,
      status: 'active',
      created_at: new Date().toISOString(),
    }
    const xp_earned = XP_PER_LISTING + (data.photo_url ? XP_PER_PHOTO : 0)
    const o = loadOverlay()
    o.listings.push(listing)
    o.user_patch[user.id] = { ...o.user_patch[user.id], last_address_id: address.id }
    o.xp_bonus[user.id] = (o.xp_bonus[user.id] ?? 0) + xp_earned
    saveOverlay(o)
    return { listing: clone(publicListing(listing)), xp_earned }
  },

  async getCurrentUser() {
    await delay(100)
    const u = findUser(CURRENT_USER_ID)
    return u ? clone(u) : null
  },

  async getMyAddresses() {
    await delay(100)
    return addresses()
      .filter((a) => a.user_id === CURRENT_USER_ID)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(clone)
  },

  async createAddress(data) {
    await delay(200)
    const address: Address = {
      ...data,
      id: uuid(),
      user_id: CURRENT_USER_ID,
      created_at: new Date().toISOString(),
    }
    const o = loadOverlay()
    o.addresses.push(address)
    saveOverlay(o)
    return clone(address)
  },

  async getUser(id) {
    await delay()
    const u = publicUser(findUser(id))
    return u ? clone(u) : null
  },

  async getReviews(userId) {
    await delay()
    return reviews()
      .filter((r) => r.reviewee_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((r) => clone({ ...r, reviewer: publicUser(findUser(r.reviewer_id)) }))
  },

  async getChats() {
    await delay()
    return chats()
      .filter((c) => c.participant_ids.includes(CURRENT_USER_ID))
      .map(withChatDetails)
      .sort((a, b) =>
        (b.last_message?.created_at ?? b.created_at).localeCompare(
          a.last_message?.created_at ?? a.created_at,
        ),
      )
      .map(clone)
  },

  async getChat(id) {
    await delay()
    const c = chats().find((x) => x.id === id && x.participant_ids.includes(CURRENT_USER_ID))
    return c ? clone(withChatDetails(c)) : null
  },

  async startChat(listingId) {
    await delay()
    const listing = listings().find((l) => l.id === listingId)
    if (!listing) throw new Error('Listing not found')
    if (listing.user_id === CURRENT_USER_ID) throw new Error('That’s your own listing')
    const existing = chats().find(
      (c) => c.listing_id === listingId && c.participant_ids.includes(CURRENT_USER_ID),
    )
    if (existing) return clone(withChatDetails(existing))
    const chat: Chat = {
      id: uuid(),
      listing_id: listingId,
      participant_ids: [CURRENT_USER_ID, listing.user_id],
      created_at: new Date().toISOString(),
    }
    const o = loadOverlay()
    o.chats.push(chat)
    saveOverlay(o)
    return clone(withChatDetails(chat))
  },

  async getMessages(chatId) {
    await delay()
    return messages()
      .filter((m) => m.chat_id === chatId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(clone)
  },

  async sendMessage(chatId, text) {
    await delay(120)
    const chat = chats().find((c) => c.id === chatId)
    if (!chat) throw new Error('Chat not found')
    const msg = insertMessage(chatId, CURRENT_USER_ID, text)

    // Demo: die andere Person antwortet kurz darauf (ersetzt später echtes Realtime).
    const otherId = chat.participant_ids.find((id) => id !== CURRENT_USER_ID)
    if (otherId) {
      setTimeout(() => {
        const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]
        emit(insertMessage(chatId, otherId, reply))
      }, 1500 + Math.random() * 1500)
    }
    return clone(msg)
  },

  subscribeToMessages(chatId, onMessage) {
    if (!listeners.has(chatId)) listeners.set(chatId, new Set())
    listeners.get(chatId)!.add(onMessage)
    return () => listeners.get(chatId)?.delete(onMessage)
  },

  // ---- Swipe-to-Swap --------------------------------------------------------

  async getSwipeDeck({ radius_km, include_passed = false }: SwipeDeckOptions) {
    await delay()
    const user = me()
    const searches = mySearches()
    const mine = new Map(
      swipes()
        .filter((s) => s.user_id === CURRENT_USER_ID)
        .map((s) => [s.listing_id, s.direction]),
    )
    return listings()
      .filter((l) => l.status === 'active' && l.type === 'offer' && l.user_id !== CURRENT_USER_ID)
      .filter((l) => {
        const dir = mine.get(l.id)
        return dir === undefined || (include_passed && dir === 'pass')
      })
      .map((l) => ({ item: toDeckItem(l, user, searches), score: searchScore(l, searches) }))
      .filter(({ item }) => item.distance_km! <= radius_km)
      .sort((a, b) => b.score - a.score || a.item.distance_km! - b.item.distance_km!)
      .map(({ item }) => clone(item))
  },

  async recordSwipe(listingId: string, direction: SwipeDirection): Promise<RecordSwipeResult> {
    await delay(120)
    const listing = listings().find((l) => l.id === listingId)
    if (!listing) throw new Error('Listing not found')
    if (listing.user_id === CURRENT_USER_ID) throw new Error('That’s your own listing')

    const all = swipes()
    const previous = all.find((s) => s.user_id === CURRENT_USER_ID && s.listing_id === listingId) ?? null
    const swipe: Swipe = {
      id: uuid(),
      user_id: CURRENT_USER_ID,
      listing_id: listingId,
      direction,
      created_at: new Date().toISOString(),
    }

    const o = loadOverlay()
    o.swipes = o.swipes.filter((s) => !(s.user_id === CURRENT_USER_ID && s.listing_id === listingId))
    o.swipes.push(swipe)

    let match: Match | null = null
    let xp_earned = 0

    if (direction === 'like') {
      const otherId = listing.user_id
      const alreadyMatched = matches().some(
        (m) => m.user_ids.includes(CURRENT_USER_ID) && m.user_ids.includes(otherId),
      )
      // Hat die andere Person eins MEINER aktiven Inserate geliked?
      const myIds = new Set(
        listings()
          .filter((l) => l.user_id === CURRENT_USER_ID && l.status === 'active')
          .map((l) => l.id),
      )
      const theirLike = all
        .filter((s) => s.user_id === otherId && s.direction === 'like' && myIds.has(s.listing_id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]

      if (theirLike && !alreadyMatched) {
        const now = new Date().toISOString()
        const chat: Chat = {
          id: uuid(),
          listing_id: listingId,
          participant_ids: [CURRENT_USER_ID, otherId],
          created_at: now,
        }
        match = {
          id: uuid(),
          user_ids: [CURRENT_USER_ID, otherId],
          listing_ids: [listingId, theirLike.listing_id],
          chat_id: chat.id,
          created_at: now,
        }
        xp_earned = XP_PER_MATCH
        o.chats.push(chat)
        o.messages.push(newMessage(chat.id, otherId, 'Hey, we matched! 👋 Up for a swap?'))
        o.matches.push(match)
        o.xp_bonus[CURRENT_USER_ID] = (o.xp_bonus[CURRENT_USER_ID] ?? 0) + xp_earned
      }
    }

    o.swipe_log.push({ swipe_id: swipe.id, previous, match_id: match?.id ?? null, xp: xp_earned })
    saveOverlay(o)
    return { match: match ? clone(withMatchDetails(match)) : null, xp_earned }
  },

  async undoLastSwipe() {
    await delay(100)
    const o = loadOverlay()
    const entry = o.swipe_log.pop()
    if (!entry) return null
    const swipe = o.swipes.find((s) => s.id === entry.swipe_id)
    o.swipes = o.swipes.filter((s) => s.id !== entry.swipe_id)
    if (entry.previous) o.swipes.push(entry.previous)
    if (entry.match_id) {
      const m = o.matches.find((x) => x.id === entry.match_id)
      o.matches = o.matches.filter((x) => x.id !== entry.match_id)
      if (m) {
        o.chats = o.chats.filter((c) => c.id !== m.chat_id)
        o.messages = o.messages.filter((msg) => msg.chat_id !== m.chat_id)
      }
      o.xp_bonus[CURRENT_USER_ID] = (o.xp_bonus[CURRENT_USER_ID] ?? 0) - entry.xp
    }
    saveOverlay(o)
    const listing = swipe && listings().find((l) => l.id === swipe.listing_id)
    return listing ? clone(toDeckItem(listing, me(), mySearches())) : null
  },

  async getMatches() {
    await delay()
    return matches()
      .filter((m) => m.user_ids.includes(CURRENT_USER_ID))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((m) => clone(withMatchDetails(m)))
  },

  async updateSearchRadius(km) {
    await delay(100)
    const o = loadOverlay()
    o.user_patch[CURRENT_USER_ID] = { ...o.user_patch[CURRENT_USER_ID], search_radius_km: km }
    saveOverlay(o)
    return clone(me())
  },

  async resetDemoData() {
    localStorage.removeItem(STORAGE_KEY)
  },
}

/** Nur für Entwicklung: Demo-Daten zurücksetzen (Browser-Konsole: swapdReset()). */
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).swapdReset = () => {
    localStorage.removeItem(STORAGE_KEY)
    location.reload()
  }
}

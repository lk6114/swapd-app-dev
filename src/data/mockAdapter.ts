/**
 * Mock-Adapter (Phase 1): liest test.json (read-only) und legt Änderungen
 * als Overlay in localStorage ab. Verhält sich nach außen wie ein echtes Backend
 * (async + kleiner Fake-Delay), damit die UI später 1:1 mit Supabase läuft.
 */
import seed from './test.json'
import type {
  Chat,
  CreateListingResult,
  DataAdapter,
  Listing,
  ListingFilter,
  Message,
  NewListing,
  Review,
  User,
} from './types'

/** Mock-Login: "du bist User 1". */
const CURRENT_USER_ID = '10000000-0000-4000-8000-000000000001'
const STORAGE_KEY = 'swapd:mock:v1'

const XP_PER_LISTING = 10
const XP_PER_PHOTO = 10

interface Overlay {
  listings: Listing[]
  chats: Chat[]
  messages: Message[]
  xp_bonus: Record<string, number>
}

const emptyOverlay = (): Overlay => ({ listings: [], chats: [], messages: [], xp_bonus: {} })

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
  const { xp_bonus } = loadOverlay()
  return (seed.users as User[]).map((u) => ({ ...u, xp: u.xp + (xp_bonus[u.id] ?? 0) }))
}
const listings = (): Listing[] => [...(seed.listings as Listing[]), ...loadOverlay().listings]
const chats = (): Chat[] => [...(seed.chats as Chat[]), ...loadOverlay().chats]
const messages = (): Message[] => [...(seed.messages as Message[]), ...loadOverlay().messages]
const reviews = (): Review[] => seed.reviews as Review[]

const findUser = (id: string) => users().find((u) => u.id === id)

const withOwner = (l: Listing): Listing => ({ ...l, owner: findUser(l.user_id) })

function withChatDetails(c: Chat): Chat {
  const listing = listings().find((l) => l.id === c.listing_id)
  const otherId = c.participant_ids.find((id) => id !== CURRENT_USER_ID)
  const msgs = messages()
    .filter((m) => m.chat_id === c.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  return {
    ...c,
    listing: listing ? withOwner(listing) : undefined,
    other_user: otherId ? findUser(otherId) : undefined,
    last_message: msgs[msgs.length - 1] ?? null,
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

function insertMessage(chatId: string, senderId: string, text: string): Message {
  const msg: Message = {
    id: uuid(),
    chat_id: chatId,
    sender_id: senderId,
    text,
    created_at: new Date().toISOString(),
  }
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
    return listings()
      .filter((l) => l.status === 'active')
      .filter((l) => !filter.type || l.type === filter.type)
      .filter((l) => !filter.category || l.category === filter.category)
      .filter((l) => !filter.user_id || l.user_id === filter.user_id)
      .filter((l) => !q || `${l.title} ${l.description}`.toLowerCase().includes(q))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(withOwner)
      .map(clone)
  },

  async getListing(id) {
    await delay()
    const l = listings().find((x) => x.id === id)
    return l ? clone(withOwner(l)) : null
  },

  async createListing(data: NewListing): Promise<CreateListingResult> {
    await delay(400)
    const me = findUser(CURRENT_USER_ID)!
    const listing: Listing = {
      ...data,
      id: uuid(),
      user_id: me.id,
      district: me.district,
      lat: me.lat,
      lng: me.lng,
      status: 'active',
      created_at: new Date().toISOString(),
    }
    const xp_earned = XP_PER_LISTING + (data.photo_url ? XP_PER_PHOTO : 0)
    const o = loadOverlay()
    o.listings.push(listing)
    o.xp_bonus[me.id] = (o.xp_bonus[me.id] ?? 0) + xp_earned
    saveOverlay(o)
    return { listing: clone(withOwner(listing)), xp_earned }
  },

  async getCurrentUser() {
    await delay(100)
    const me = findUser(CURRENT_USER_ID)
    return me ? clone(me) : null
  },

  async getUser(id) {
    await delay()
    const u = findUser(id)
    return u ? clone(u) : null
  },

  async getReviews(userId) {
    await delay()
    return reviews()
      .filter((r) => r.reviewee_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((r) => clone({ ...r, reviewer: findUser(r.reviewer_id) }))
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
}

/** Nur für Entwicklung: Demo-Daten zurücksetzen (im Browser-Konsole: swapdReset()). */
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).swapdReset = () => {
    localStorage.removeItem(STORAGE_KEY)
    location.reload()
  }
}

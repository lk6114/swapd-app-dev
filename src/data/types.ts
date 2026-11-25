/**
 * Der "Vertrag" zwischen UI und Daten.
 * Feldnamen = spätere Postgres-Spalten (snake_case), IDs als String, Datum als ISO-String.
 * Optionale verschachtelte Felder (owner, listing, ...) = Joins, wie Supabase sie mit
 * select('*, owner:users(*)') liefert.
 */

export type ListingType = 'offer' | 'search'

export const CATEGORIES = [
  'clothes',
  'books',
  'electronics',
  'home',
  'sports',
  'kids',
  'plants',
  'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export const CONDITIONS = ['new', 'like_new', 'good', 'used'] as const
export type Condition = (typeof CONDITIONS)[number]

export interface User {
  id: string
  name: string
  district: string
  bio: string
  avatar_url: string | null
  xp: number
  swaps_count: number
  rating_avg: number
  rating_count: number
  lat: number
  lng: number
  created_at: string
}

export interface Listing {
  id: string
  user_id: string
  type: ListingType
  title: string
  description: string
  category: Category
  condition: Condition
  photo_url: string | null
  district: string
  lat: number
  lng: number
  status: 'active' | 'swapped'
  created_at: string
  owner?: User
}

export interface NewListing {
  type: ListingType
  title: string
  description: string
  category: Category
  condition: Condition
  photo_url: string | null
}

export interface ListingFilter {
  type?: ListingType
  category?: Category
  user_id?: string
  query?: string
}

export interface Review {
  id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  text: string
  created_at: string
  reviewer?: User
}

export interface Chat {
  id: string
  listing_id: string
  participant_ids: string[]
  created_at: string
  listing?: Listing
  other_user?: User
  last_message?: Message | null
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  text: string
  created_at: string
}

/** Ergebnis von createListing: das Inserat + verdiente XP (für die Belohnungs-Meldung). */
export interface CreateListingResult {
  listing: Listing
  xp_earned: number
}

export interface DataAdapter {
  // Listings
  getListings(filter?: ListingFilter): Promise<Listing[]>
  getListing(id: string): Promise<Listing | null>
  createListing(data: NewListing): Promise<CreateListingResult>

  // Users
  getCurrentUser(): Promise<User | null>
  getUser(id: string): Promise<User | null>
  getReviews(userId: string): Promise<Review[]>

  // Chats
  getChats(): Promise<Chat[]>
  getChat(id: string): Promise<Chat | null>
  /** Tauschanfrage: öffnet (oder findet) den Chat zu einem Inserat. */
  startChat(listingId: string): Promise<Chat>
  getMessages(chatId: string): Promise<Message[]>
  sendMessage(chatId: string, text: string): Promise<Message>
  /** Live-Updates (Supabase: Realtime). Gibt eine Abmelde-Funktion zurück. */
  subscribeToMessages(chatId: string, onMessage: (msg: Message) => void): () => void
}

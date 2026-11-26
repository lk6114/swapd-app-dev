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

/**
 * Tabelle addresses: gespeicherte Abholorte eines Users (z. B. "Dorm", "Campus").
 * Exakte Adresse wird NIE anderen angezeigt (nur Stadtteil + Entfernung) und kommt bei
 * fremden Usern/Inseraten gar nicht erst aus der API (später: RLS "nur Owner" in Supabase).
 */
export interface Address {
  id: string
  user_id: string
  label: string
  street: string
  postal_code: string
  district: string
  city: string
  lat: number
  lng: number
  created_at: string
}

export type NewAddress = Omit<Address, 'id' | 'user_id' | 'created_at'>

export interface User {
  id: string
  name: string
  /** Stadtteil + lat/lng = Profil-Standort (Basis für Entfernungen & Swipe-Radius). */
  district: string
  /** Zuletzt beim Einstellen gewählte Adresse → beim nächsten Mal vorausgewählt. */
  last_address_id: string | null
  /** Swipe-Radius in km (Default 5). */
  search_radius_km: number
  bio: string
  avatar_url: string | null
  xp: number
  swaps_count: number
  /** Berechnet aus reviews (nicht gespeichert; später Postgres-View user_ratings). 0 = noch keine Bewertung. */
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
  /** Abholort. district/lat/lng werden beim Anlegen daraus übernommen (Snapshot). */
  address_id: string | null
  district: string
  lat: number
  lng: number
  status: 'active' | 'swapped'
  created_at: string
  owner?: User
  /** Berechnet (nicht gespeichert): Entfernung zu mir in km – wie später PostGIS sie mitliefert. */
  distance_km?: number
  /** Berechnet: passt zu einem meiner "Looking for"-Inserate. */
  matches_my_search?: boolean
}

export interface NewListing {
  type: ListingType
  title: string
  description: string
  category: Category
  condition: Condition
  photo_url: string | null
  address_id: string
}

export interface ListingFilter {
  type?: ListingType
  category?: Category
  user_id?: string
  query?: string
  /** Nur Inserate im Umkreis (km) um `near` (Default: mein Standort). */
  radius_km?: number
  near?: { lat: number; lng: number }
}

export type SwipeDirection = 'like' | 'pass'

/** Tabelle swipes: ein Swipe pro (user_id, listing_id). */
export interface Swipe {
  id: string
  user_id: string
  listing_id: string
  direction: SwipeDirection
  created_at: string
}

/** Tabelle matches: zwei User haben gegenseitig Sachen geliked. */
export interface Match {
  id: string
  user_ids: string[]
  /** [Item, das ich geliked habe, mein Item, das die andere Person geliked hat] */
  listing_ids: string[]
  chat_id: string
  created_at: string
  listings?: Listing[]
  other_user?: User
}

export interface SwipeDeckOptions {
  radius_km: number
  /** Bereits gepasste Items erneut zeigen (gelikte nie). */
  include_passed?: boolean
}

export interface RecordSwipeResult {
  match: Match | null
  xp_earned: number
}

/** Tabelle reviews: eine Bewertung pro (reviewer_id, reviewee_id), änderbar. */
export interface Review {
  id: string
  reviewer_id: string
  reviewee_id: string
  /** 1–5 Sterne */
  rating: number
  text: string
  created_at: string
  reviewer?: User
}

export interface NewReview {
  reviewee_id: string
  rating: number
  text: string
}

export interface SubmitReviewResult {
  review: Review
  /** XP nur für die erste Bewertung einer Person, nicht fürs Ändern. */
  xp_earned: number
}

export const REPORT_REASONS = ['no_show', 'scam', 'offensive', 'fake_listing', 'other'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

/** Tabelle reports: nur einfügen, lesen kann später nur das Team (Moderation). */
export interface Report {
  id: string
  reporter_id: string
  reported_user_id: string
  reason: ReportReason
  details: string
  created_at: string
}

export interface NewReport {
  reported_user_id: string
  reason: ReportReason
  details: string
}

/** Was ich mit einer anderen Person machen darf / schon gemacht habe. */
export interface UserInteraction {
  /** Bewerten nur nach gemeinsamem Chat (= Tauschkontakt). */
  can_rate: boolean
  my_review: Review | null
  reported: boolean
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
  /** Meine gespeicherten Adressen (nur eigene, nie fremde). */
  getMyAddresses(): Promise<Address[]>
  createAddress(data: NewAddress): Promise<Address>
  getUser(id: string): Promise<User | null>
  getReviews(userId: string): Promise<Review[]>
  getUserInteraction(userId: string): Promise<UserInteraction>
  /** Bewertung anlegen oder ändern (Upsert). Rating wird danach neu berechnet. */
  submitReview(data: NewReview): Promise<SubmitReviewResult>
  reportUser(data: NewReport): Promise<Report>

  // Chats
  getChats(): Promise<Chat[]>
  getChat(id: string): Promise<Chat | null>
  /** Tauschanfrage: öffnet (oder findet) den Chat zu einem Inserat. */
  startChat(listingId: string): Promise<Chat>
  getMessages(chatId: string): Promise<Message[]>
  sendMessage(chatId: string, text: string): Promise<Message>
  /** Live-Updates (Supabase: Realtime). Gibt eine Abmelde-Funktion zurück. */
  subscribeToMessages(chatId: string, onMessage: (msg: Message) => void): () => void

  // Swipe-to-Swap
  /** Fremde, aktive Offering-Inserate im Radius, noch nicht geswiped. Passende zuerst, dann nach Nähe. */
  getSwipeDeck(opts: SwipeDeckOptions): Promise<Listing[]>
  /** Speichert Like/Pass. Bei gegenseitigem Like: Match + Chat werden angelegt. */
  recordSwipe(listingId: string, direction: SwipeDirection): Promise<RecordSwipeResult>
  /** Macht meinen letzten Swipe rückgängig und gibt das Inserat zurück (oder null). */
  undoLastSwipe(): Promise<Listing | null>
  getMatches(): Promise<Match[]>
  updateSearchRadius(km: number): Promise<User>

  /** Nur Demo/Mock: alle lokalen Änderungen verwerfen. */
  resetDemoData?(): Promise<void>
}

/**
 * Phase 2: Supabase-Adapter. Implementiert denselben DataAdapter-Vertrag wie der Mock.
 * Noch nicht aktiv – siehe src/data/index.ts.
 *
 * Plan:
 * - Tabellen = Struktur von test.json (users, addresses, listings, swipes, matches, chats, messages, reviews)
 * - Joins via select('*, owner:users(*)')
 * - subscribeToMessages -> supabase.channel(...).on('postgres_changes', ...)
 * - Fotos -> Supabase Storage, photo_url = public URL
 *
 * Unten: Stubs für die Swipe- und Adress-Methoden mit dem geplanten SQL.
 */
import type { DataAdapter } from './types'

const todo = (what: string): never => {
  throw new Error(`TODO supabaseAdapter.${what}`)
}

/*
 * -- SQL (Migration) --------------------------------------------------------
 *
 * create extension if not exists cube;
 * create extension if not exists earthdistance;     -- oder PostGIS (geography + ST_DWithin)
 *
 * alter table users add column search_radius_km int not null default 5;
 * alter table users add column last_address_id uuid references addresses(id) on delete set null;
 *
 * create table addresses (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid not null references users(id) on delete cascade,
 *   label text not null, street text not null, postal_code text not null,
 *   district text not null, city text not null,
 *   lat double precision not null, lng double precision not null,
 *   created_at timestamptz not null default now()
 * );
 * -- RLS: nur der Owner darf seine Adressen lesen/schreiben (andere sehen NIE die Adresse)
 * alter table addresses enable row level security;
 * create policy "own addresses" on addresses using (user_id = auth.uid()) with check (user_id = auth.uid());
 *
 * alter table listings add column address_id uuid references addresses(id) on delete set null;
 * -- listings.district/lat/lng bleiben als Snapshot (öffentlich, Pins auf der Karte werden im Client verrauscht)
 *
 * create type swipe_direction as enum ('like', 'pass');
 * create table swipes (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid not null references users(id) on delete cascade,
 *   listing_id uuid not null references listings(id) on delete cascade,
 *   direction swipe_direction not null,
 *   created_at timestamptz not null default now(),
 *   unique (user_id, listing_id)                    -- upsert: pass → like möglich
 * );
 *
 * create table matches (
 *   id uuid primary key default gen_random_uuid(),
 *   user_ids uuid[] not null,                       -- genau 2
 *   listing_ids uuid[] not null,                    -- [mein Like, ihr Like]
 *   chat_id uuid not null references chats(id) on delete cascade,
 *   created_at timestamptz not null default now()
 * );
 * create index on matches using gin (user_ids);
 *
 * -- Bewertungen: eine pro Paar, änderbar. Nur nach gemeinsamem Chat (Check im RPC oder per Policy).
 * alter table reviews add constraint reviews_rating_range check (rating between 1 and 5);
 * alter table reviews add constraint reviews_once unique (reviewer_id, reviewee_id);
 * alter table reviews add constraint reviews_not_self check (reviewer_id <> reviewee_id);
 * -- rating_avg / rating_count werden NICHT gespeichert, sondern berechnet:
 * create view user_ratings as
 *   select reviewee_id as user_id, round(avg(rating)::numeric, 1) as rating_avg, count(*) as rating_count
 *   from reviews group by reviewee_id;
 * -- users mit Rating: select u.*, coalesce(r.rating_avg, 0), coalesce(r.rating_count, 0) from users u left join user_ratings r on r.user_id = u.id
 *
 * -- Meldungen: alle dürfen einfügen, niemand außer dem Team darf lesen
 * create type report_reason as enum ('no_show', 'scam', 'offensive', 'fake_listing', 'other');
 * create table reports (
 *   id uuid primary key default gen_random_uuid(),
 *   reporter_id uuid not null references users(id) on delete cascade,
 *   reported_user_id uuid not null references users(id) on delete cascade,
 *   reason report_reason not null,
 *   details text not null default '',
 *   created_at timestamptz not null default now()
 * );
 * alter table reports enable row level security;
 * create policy "insert own reports" on reports for insert with check (reporter_id = auth.uid());
 * create policy "see own reports" on reports for select using (reporter_id = auth.uid());
 */

export const supabaseSwipeStubs: Pick<
  DataAdapter,
  | 'getSwipeDeck'
  | 'recordSwipe'
  | 'undoLastSwipe'
  | 'getMatches'
  | 'updateSearchRadius'
  | 'getMyAddresses'
  | 'createAddress'
  | 'getUserInteraction'
  | 'submitReview'
  | 'reportUser'
  | 'updateProfile'
> = {
  /*
   * select l.*, earth_distance(ll_to_earth(me.lat, me.lng), ll_to_earth(l.lat, l.lng)) / 1000 as distance_km
   * from listings l, users me
   * where me.id = auth.uid() and l.user_id <> me.id and l.status = 'active' and l.type = 'offer'
   *   and earth_box(ll_to_earth(me.lat, me.lng), :radius_km * 1000) @> ll_to_earth(l.lat, l.lng)
   *   and not exists (select 1 from swipes s where s.user_id = me.id and s.listing_id = l.id
   *                   and (s.direction = 'like' or not :include_passed))
   * order by <passt zu meinem Looking for> desc, distance_km;
   * -> am besten als RPC: supabase.rpc('swipe_deck', { radius_km, include_passed })
   */
  async getSwipeDeck() {
    return todo('getSwipeDeck')
  },

  /*
   * insert into swipes (user_id, listing_id, direction) values (auth.uid(), :listing_id, :direction)
   * on conflict (user_id, listing_id) do update set direction = excluded.direction, created_at = now();
   * Match-Check im selben RPC (oder Trigger): hat der Owner eins meiner aktiven Listings geliked
   * und gibt es noch kein Match zwischen uns → chats + matches anlegen, XP gutschreiben.
   */
  async recordSwipe() {
    return todo('recordSwipe')
  },

  /* delete from swipes where id = (select id from swipes where user_id = auth.uid() order by created_at desc limit 1)
   * + evtl. ausgelöstes Match/Chat löschen (RPC). */
  async undoLastSwipe() {
    return todo('undoLastSwipe')
  },

  /* select *, listings:listings!inner(*) from matches where auth.uid() = any(user_ids) order by created_at desc */
  async getMatches() {
    return todo('getMatches')
  },

  /* update users set search_radius_km = :km where id = auth.uid() returning * */
  async updateSearchRadius() {
    return todo('updateSearchRadius')
  },

  /* select * from addresses where user_id = auth.uid() order by created_at  (RLS erzwingt "nur eigene") */
  async getMyAddresses() {
    return todo('getMyAddresses')
  },

  /* insert into addresses (...) values (...) returning *  – Geocoding passiert vorher im Client (src/lib/geocode.ts) */
  async createAddress() {
    return todo('createAddress')
  },

  /* can_rate: exists(select 1 from chats where auth.uid() = any(participant_ids) and :user_id = any(participant_ids))
   * my_review: select * from reviews where reviewer_id = auth.uid() and reviewee_id = :user_id
   * reported:  exists(select 1 from reports where reporter_id = auth.uid() and reported_user_id = :user_id) */
  async getUserInteraction() {
    return todo('getUserInteraction')
  },

  /* insert into reviews (reviewer_id, reviewee_id, rating, text) values (auth.uid(), ...)
   * on conflict (reviewer_id, reviewee_id) do update set rating = excluded.rating, text = excluded.text, created_at = now()
   * XP nur beim ersten Insert (RPC: xmax = 0 → neu). */
  async submitReview() {
    return todo('submitReview')
  },

  /* Foto: supabase.storage.from('avatars').upload(`${uid}/avatar.jpg`, blob, { upsert: true }) → getPublicUrl
   * update users set name = :name, bio = :bio, avatar_url = :url where id = auth.uid() returning *
   * check constraints: char_length(name) between 2 and 30, char_length(bio) <= 160
   * Erstes-Foto-XP: Tabelle user_rewards (user_id, reward, unique) → insert ... on conflict do nothing */
  async updateProfile() {
    return todo('updateProfile')
  },

  /* insert into reports (reporter_id, reported_user_id, reason, details) values (auth.uid(), ...) returning * */
  async reportUser() {
    return todo('reportUser')
  },
}

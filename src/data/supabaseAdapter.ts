/**
 * Phase 2: Supabase-Adapter. Implementiert denselben DataAdapter-Vertrag wie der Mock.
 * Noch nicht aktiv – siehe src/data/index.ts.
 *
 * Plan:
 * - Tabellen = Struktur von test.json (users, listings, chats, messages, reviews)
 * - Joins via select('*, owner:users(*)')
 * - subscribeToMessages -> supabase.channel(...).on('postgres_changes', ...)
 * - Fotos -> Supabase Storage, photo_url = public URL
 */
export {}

/**
 * Einziger Zugang der UI zu Daten. Adapter tauschen = eine Zeile ändern.
 */
import { mockAdapter } from './mockAdapter'
// import { supabaseAdapter } from './supabaseAdapter'

export const api = mockAdapter
// export const api = supabaseAdapter

export * from './types'

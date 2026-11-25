import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type User } from '@/data'

interface Ctx { me: User | null; loading: boolean; refresh: () => Promise<void> }
const CurrentUserContext = createContext<Ctx>({ me: null, loading: true, refresh: async () => {} })

/** Eingeloggte Person (Mock: User 1, später Supabase Auth). */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setMe(await api.getCurrentUser())
    setLoading(false)
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh])
  return <CurrentUserContext.Provider value={{ me, loading, refresh }}>{children}</CurrentUserContext.Provider>
}

export const useCurrentUser = () => useContext(CurrentUserContext)

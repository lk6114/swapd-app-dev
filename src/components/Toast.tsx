import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ToastKind = 'reward' | 'info'
interface ToastItem { id: number; text: string; kind: ToastKind }

const ToastContext = createContext<(text: string, kind?: ToastKind) => void>(() => {})

/** Kleine Meldungen. "reward" = Belohnung (gold, nur für XP). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const show = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setItems((t) => [...t, { id, text, kind }])
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pop animate-[toast-in_.25s_ease-out] rounded-full px-5 py-2.5 font-display font-bold',
              t.kind === 'reward' ? 'bg-gold text-ink' : 'bg-ink text-white',
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

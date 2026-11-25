import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function ScreenHeader({ title, back, right }: { title?: ReactNode; back?: boolean; right?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="pt-safe sticky top-0 z-20 bg-surface/90 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-4">
        {back && (
          <button
            onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5"
            aria-label="Back"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
        )}
        <div className="min-w-0 flex-1 truncate font-display text-xl font-bold">{title}</div>
        {right}
      </div>
    </header>
  )
}

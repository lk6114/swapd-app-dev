import { NavLink, useNavigate } from 'react-router-dom'
import { Compass, Layers, MessageCircle, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const item = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex flex-1 flex-col items-center gap-0.5 pt-2 text-[11px] font-bold transition-colors',
    isActive ? 'text-ink' : 'text-ink-muted/70',
  )

export function BottomNav() {
  const navigate = useNavigate()
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white">
      <div className="mx-auto flex h-16 max-w-lg items-start">
        <NavLink to="/" end className={item}>
          <Layers size={24} strokeWidth={2} /> Swipe
        </NavLink>
        <NavLink to="/explore" className={item}>
          <Compass size={24} strokeWidth={2} /> Explore
        </NavLink>
        <div className="flex flex-1 justify-center">
          <button
            onClick={() => navigate('/new')}
            aria-label="New listing"
            className="pop -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-pink text-white"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>
        <NavLink to="/chats" className={item}>
          <MessageCircle size={24} strokeWidth={2} /> Chats
        </NavLink>
        <NavLink to="/profile" className={item}>
          <User size={24} strokeWidth={2} /> Profile
        </NavLink>
      </div>
    </nav>
  )
}

import type { User } from '@/data'
import { cn } from '@/lib/utils'

const sizes = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-base', lg: 'h-20 w-20 text-3xl' }

export function Avatar({ user, size = 'md', className }: { user?: User; size?: keyof typeof sizes; className?: string }) {
  const initial = user?.name?.[0]?.toUpperCase() ?? '?'
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink-tint font-display font-extrabold text-pink',
        sizes[size],
        className,
      )}
    >
      {user?.avatar_url ? <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" /> : initial}
    </div>
  )
}

import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Badges = Pills. Gold nur für Belohnungen/XP. */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
  {
    variants: {
      variant: {
        offer: 'bg-pink-tint text-pink',
        search: 'bg-green-tint text-ink',
        neutral: 'bg-white text-ink-muted border border-line',
        reward: 'bg-gold text-ink',
        ink: 'bg-ink text-white',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

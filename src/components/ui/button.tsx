import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** CD-Regeln: Pink = Aktion (weiße Schrift), Grün = Match (immer Ink-Schrift). */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-bold select-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'pop bg-pink text-white',
        match: 'pop bg-green text-ink',
        outline: 'pop bg-white text-ink',
        ghost: 'text-ink hover:bg-ink/5 active:bg-ink/10',
      },
      size: {
        sm: 'h-9 rounded-full px-4 text-sm',
        md: 'h-12 rounded-full px-6 text-base',
        lg: 'h-14 rounded-full px-8 text-lg',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = 'Button'

export { buttonVariants }

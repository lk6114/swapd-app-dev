import type { ReactNode } from 'react'

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-tint text-pink">{icon}</div>
      <h2 className="text-xl">{title}</h2>
      {text && <p className="mt-1 text-ink-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

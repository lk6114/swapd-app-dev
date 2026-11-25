import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

/** Rahmen für Screens mit Bottom-Navigation. Mobile-first, auf Desktop zentriert. */
export function AppLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-24">
      <Outlet />
      <BottomNav />
    </div>
  )
}

/** Rahmen für Vollbild-Screens ohne Bottom-Nav (Detail, Chat, Formular). */
export function PlainLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <Outlet />
    </div>
  )
}

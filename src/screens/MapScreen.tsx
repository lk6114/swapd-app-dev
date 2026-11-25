import { Map } from 'lucide-react'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/EmptyState'

/** Platzhalter: MapLibre vs. Leaflet ist noch offen (README, Offene Fragen). */
export function MapScreen() {
  return (
    <>
      <ScreenHeader title="Map" />
      <EmptyState icon={<Map size={28} />} title="Map is coming soon" text="See swaps around your Kiez on a map." />
    </>
  )
}

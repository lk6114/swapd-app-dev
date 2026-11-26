import { useRef, useState, type PointerEvent } from 'react'
import type { Listing, SwipeDirection } from '@/data'
import { SwipeCard } from './SwipeCard'

const SWIPE_DISTANCE = 100 // px, ab hier zählt das Loslassen als Swipe
const FLICK_SPEED = 0.6 // px/ms, schneller Wisch zählt auch bei kurzer Strecke
const TAP_SLOP = 6 // px, darunter ist es ein Tap
const MAX_ROTATION = 15 // Grad

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

interface Props {
  items: Listing[]
  /** Karte, die gerade rausfliegt (nach Button, Taste oder Loslassen). */
  exiting: { id: string; dir: SwipeDirection } | null
  reducedMotion: boolean
  onSwipe: (dir: SwipeDirection) => void
  onTap: (listing: Listing) => void
}

/** Kartenstapel: oberste Karte ist ziehbar, dahinter 2 Karten leicht verkleinert. */
export function SwipeDeck({ items, exiting, reducedMotion, onSwipe, onTap }: Props) {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const start = useRef<{ x: number; y: number; t: number } | null>(null)

  const top = items[0]
  const visible = items.slice(0, 3)

  function down(e: PointerEvent<HTMLDivElement>) {
    if (exiting || e.button > 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    setDrag({ x: 0, y: 0, active: true })
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!start.current) return
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true })
  }

  function up(e: PointerEvent<HTMLDivElement>) {
    const s = start.current
    start.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    const speed = Math.abs(dx) / Math.max(1, performance.now() - s.t)
    setDrag({ x: 0, y: 0, active: false })
    if (Math.abs(dx) > SWIPE_DISTANCE || (Math.abs(dx) > 40 && speed > FLICK_SPEED)) {
      onSwipe(dx > 0 ? 'like' : 'pass')
    } else if (Math.hypot(dx, dy) < TAP_SLOP && top) {
      onTap(top)
    }
  }

  function cancel() {
    start.current = null
    setDrag({ x: 0, y: 0, active: false })
  }

  const progress = clamp(Math.abs(drag.x) / SWIPE_DISTANCE, 0, 1)

  return (
    <div className="relative h-full w-full">
      {visible
        .map((l, i) => {
          const isTop = i === 0
          const isExiting = isTop && exiting?.id === l.id
          let transform: string
          let opacity = 1
          let transition = 'transform 280ms cubic-bezier(.2,.8,.3,1), opacity 220ms ease-out'

          if (isTop) {
            if (isExiting) {
              const sign = exiting!.dir === 'like' ? 1 : -1
              if (reducedMotion) {
                transform = 'none'
                opacity = 0
              } else {
                transform = `translate(${sign * 140}%, ${drag.y}px) rotate(${sign * 22}deg)`
              }
            } else {
              const rot = reducedMotion ? 0 : clamp(drag.x / 18, -MAX_ROTATION, MAX_ROTATION)
              transform = `translate(${drag.x}px, ${drag.y * 0.25}px) rotate(${rot}deg)`
              if (drag.active) transition = 'none'
            }
          } else {
            if (reducedMotion) {
              // Ohne Bewegung: nächste Karte liegt direkt darunter, Rest unsichtbar
              transform = 'none'
              opacity = i === 1 ? 1 : 0
            } else {
              // Karten dahinter rücken beim Ziehen etwas nach vorne
              const advance = exiting ? 1 : drag.active ? progress : 0
              const step = Math.max(0, i - advance)
              transform = `translateY(${step * 14}px) scale(${1 - 0.05 * step})`
            }
          }

          const like = isTop ? (isExiting ? (exiting!.dir === 'like' ? 1 : 0) : clamp(drag.x / SWIPE_DISTANCE, 0, 1)) : 0
          const pass = isTop ? (isExiting ? (exiting!.dir === 'pass' ? 1 : 0) : clamp(-drag.x / SWIPE_DISTANCE, 0, 1)) : 0

          return (
            <div
              key={l.id}
              className="absolute inset-0 touch-none select-none"
              style={{ transform, opacity, transition, zIndex: 10 - i, cursor: isTop ? 'grab' : undefined }}
              aria-hidden={!isTop}
              onPointerDown={isTop ? down : undefined}
              onPointerMove={isTop ? move : undefined}
              onPointerUp={isTop ? up : undefined}
              onPointerCancel={isTop ? cancel : undefined}
              onDragStart={(e) => e.preventDefault()}
            >
              <SwipeCard listing={l} like={like} pass={pass} />
            </div>
          )
        })
        .reverse()}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { api, type Review, type SubmitReviewResult, type User } from '@/data'
import { cn } from '@/lib/utils'
import { Sheet } from './ui/sheet'
import { Button } from './ui/button'
import { Label, Textarea } from './ui/input'

const LABELS = ['', 'Not great', 'Okay', 'Good', 'Great', 'Swap hero!']

/** Person bewerten (1–5 Sterne + optional Text). Bestehende Bewertung wird bearbeitet. */
export function RateSheet({
  open,
  onClose,
  user,
  existing,
  onDone,
}: {
  open: boolean
  onClose: () => void
  user: User
  existing: Review | null
  onDone: (res: SubmitReviewResult) => void
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState(existing?.text ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setRating(existing?.rating ?? 0)
    setText(existing?.text ?? '')
    setError(null)
    setSaving(false)
  }, [open, existing])

  async function submit() {
    if (!rating || saving) return
    setSaving(true)
    setError(null)
    try {
      onDone(await api.submitReview({ reviewee_id: user.id, rating, text }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSaving(false)
    }
  }

  const shown = hover || rating

  return (
    <Sheet open={open} onClose={onClose} title={existing ? `Edit your rating` : `Rate ${user.name}`}>
      <p className="mb-4 text-sm text-ink-muted">How was swapping with {user.name}?</p>

      <div role="radiogroup" aria-label="Stars" className="flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i}
            aria-label={`${i} star${i > 1 ? 's' : ''}`}
            onClick={() => setRating(i)}
            onMouseEnter={() => setHover(i)}
            className="flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-90"
          >
            <Star
              size={36}
              strokeWidth={2}
              className={cn('transition-colors', i <= shown ? 'fill-gold text-ink' : 'text-ink/25')}
            />
          </button>
        ))}
      </div>
      <p className="mt-1 h-6 text-center font-display text-lg font-bold">{LABELS[shown]}</p>

      <div className="mt-4">
        <Label htmlFor="review-text">Anything to add? <span className="font-normal text-ink-muted">(optional)</span></Label>
        <Textarea
          id="review-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="On time? Item as described?"
          maxLength={300}
          className="min-h-20"
        />
      </div>

      {error && <p className="mt-3 text-sm font-bold" role="alert">{error}</p>}

      <Button className="mt-5 w-full" size="lg" onClick={submit} disabled={!rating || saving}>
        {saving ? 'Saving…' : existing ? 'Update rating' : 'Post rating'}
      </Button>
    </Sheet>
  )
}

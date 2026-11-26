import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { api, REPORT_REASONS, type ReportReason, type User } from '@/data'
import { cn } from '@/lib/utils'
import { Sheet } from './ui/sheet'
import { Button } from './ui/button'
import { Label, Textarea } from './ui/input'

const REASON_LABEL: Record<ReportReason, string> = {
  no_show: 'Didn’t show up',
  scam: 'Scam or spam',
  offensive: 'Rude or offensive',
  fake_listing: 'Fake listing',
  other: 'Something else',
}

/** Person melden. Die gemeldete Person erfährt nichts davon. */
export function ReportSheet({
  open,
  onClose,
  user,
  onDone,
}: {
  open: boolean
  onClose: () => void
  user: User
  onDone: () => void
}) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setReason(null)
    setDetails('')
    setError(null)
    setSaving(false)
  }, [open])

  const needsDetails = reason === 'other'
  const canSend = !!reason && (!needsDetails || details.trim().length >= 5) && !saving

  async function submit() {
    if (!canSend) return
    setSaving(true)
    setError(null)
    try {
      await api.reportUser({ reported_user_id: user.id, reason: reason!, details })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Report ${user.name}`}>
      <p className="mb-4 text-sm text-ink-muted">What happened? {user.name} won’t know it was you.</p>

      <div role="radiogroup" aria-label="Reason" className="space-y-2">
        {REPORT_REASONS.map((r) => {
          const active = reason === r
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setReason(r)}
              className={cn(
                'flex h-12 w-full items-center justify-between rounded-md border-2 bg-white px-4 text-left font-bold transition-colors',
                active ? 'border-ink' : 'border-line hover:border-ink/40',
              )}
            >
              {REASON_LABEL[r]}
              {active && <Check size={18} strokeWidth={2.5} />}
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        <Label htmlFor="report-details">
          Details {!needsDetails && <span className="font-normal text-ink-muted">(optional)</span>}
        </Label>
        <Textarea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Tell us a bit more…"
          maxLength={500}
          className="min-h-20"
        />
      </div>

      {error && <p className="mt-3 text-sm font-bold" role="alert">{error}</p>}

      <Button className="mt-5 w-full" size="lg" onClick={submit} disabled={!canSend}>
        {saving ? 'Sending…' : 'Send report'}
      </Button>
    </Sheet>
  )
}

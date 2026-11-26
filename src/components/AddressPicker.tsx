import { useEffect, useState } from 'react'
import { AlertCircle, Check, Lock, MapPin, Plus } from 'lucide-react'
import { api, type Address } from '@/data'
import { geocodeAddress } from '@/lib/geocode'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Input, Label } from './ui/input'
import { Skeleton } from './ui/skeleton'

interface Props {
  value: string | null
  onChange: (addressId: string) => void
  /** Vorauswahl: zuletzt benutzte Adresse. */
  defaultId?: string | null
}

/** Abholort wählen: gespeicherte Adresse oder neue anlegen. */
export function AddressPicker({ value, onChange, defaultId }: Props) {
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoadError(false)
    try {
      const list = await api.getMyAddresses()
      setAddresses(list)
      if (!list.length) setAdding(true)
      else if (!value) onChange((list.find((a) => a.id === defaultId) ?? list[list.length - 1]).id)
    } catch {
      setLoadError(true)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <Label>Pickup spot</Label>
      <p className="-mt-1 mb-3 flex items-center gap-1.5 text-xs text-ink-muted">
        <Lock size={12} strokeWidth={2} /> Others only see your district and the distance.
      </p>

      {loadError ? (
        <div className="rounded-md border border-line bg-white p-4 text-sm">
          Couldn’t load your addresses.{' '}
          <button type="button" onClick={load} className="font-bold underline">
            Try again
          </button>
        </div>
      ) : !addresses ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-2" role="radiogroup" aria-label="Pickup spot">
          {addresses.map((a) => {
            const active = value === a.id
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(a.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md border-2 bg-white p-3 text-left transition-colors',
                  active ? 'border-ink' : 'border-line hover:border-ink/40',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    active ? 'bg-ink text-white' : 'bg-surface text-ink-muted',
                  )}
                >
                  {active ? <Check size={18} strokeWidth={2.5} /> : <MapPin size={18} strokeWidth={2} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{a.label}</span>
                  <span className="block truncate text-sm text-ink-muted">
                    {a.street}, {a.postal_code} {a.city}
                  </span>
                </span>
              </button>
            )
          })}

          {adding ? (
            <NewAddressForm
              canCancel={addresses.length > 0}
              onCancel={() => setAdding(false)}
              onCreated={(a) => {
                setAddresses((list) => [...(list ?? []), a])
                setAdding(false)
                onChange(a.id)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-ink/30 font-bold text-ink transition-colors hover:border-ink"
            >
              <Plus size={18} strokeWidth={2} /> Add new address
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function NewAddressForm({
  canCancel,
  onCancel,
  onCreated,
}: {
  canCancel: boolean
  onCancel: () => void
  onCreated: (a: Address) => void
}) {
  const [label, setLabel] = useState('')
  const [street, setStreet] = useState('')
  const [postal, setPostal] = useState('')
  const [city, setCity] = useState('Stuttgart')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = street.trim().length >= 3 && /^\d{5}$/.test(postal.trim()) && city.trim().length >= 2

  // Kein <form>: wir stecken schon im Inserat-Formular (verschachtelte Forms sind ungültig).
  async function save() {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      const input = { street: street.trim(), postal_code: postal.trim(), city: city.trim() }
      const geo = await geocodeAddress(input)
      if (!geo) {
        setError('We couldn’t find that address. Check street, number and postcode.')
        setSaving(false)
        return
      }
      const created = await api.createAddress({ ...input, ...geo, label: label.trim() || 'Home' })
      onCreated(created)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div
      className="space-y-3 rounded-md border-2 border-ink bg-white p-4"
      onKeyDown={(e) => {
        // Enter speichert die Adresse statt das ganze Inserat abzuschicken
        if (e.key === 'Enter') {
          e.preventDefault()
          save()
        }
      }}
    >
      <div>
        <Label htmlFor="addr-label">Name it</Label>
        <Input id="addr-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Home, Campus" maxLength={30} />
      </div>
      <div>
        <Label htmlFor="addr-street">Street & number</Label>
        <Input id="addr-street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Allmandring 10" autoComplete="address-line1" />
      </div>
      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <div>
          <Label htmlFor="addr-postal">Postcode</Label>
          <Input id="addr-postal" value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="70569" inputMode="numeric" maxLength={5} autoComplete="postal-code" />
        </div>
        <div>
          <Label htmlFor="addr-city">City</Label>
          <Input id="addr-city" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
        </div>
      </div>
      {error && (
        <p className="flex items-start gap-1.5 text-sm font-bold" role="alert">
          <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={save} disabled={!valid || saving}>
          {saving ? 'Finding it…' : 'Save address'}
        </Button>
        {canCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

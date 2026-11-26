import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, X } from 'lucide-react'
import { api, CATEGORIES, CONDITIONS, type Category, type Condition, type ListingType } from '@/data'
import { CATEGORY_LABEL, CONDITION_LABEL } from '@/lib/format'
import { resizeImage } from '@/lib/image'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useCurrentUser } from '@/components/CurrentUser'
import { useToast } from '@/components/Toast'
import { CategoryIcon } from '@/components/CategoryIcon'
import { AddressPicker } from '@/components/AddressPicker'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function NewListingScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const { me, refresh } = useCurrentUser()
  const fileRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState<ListingType>('offer')
  const [photo, setPhoto] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [condition, setCondition] = useState<Condition>('good')
  const [description, setDescription] = useState('')
  const [addressId, setAddressId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const canSubmit = title.trim().length >= 3 && category && addressId && !saving

  async function pickPhoto(file?: File) {
    if (!file) return
    try {
      setPhoto(await resizeImage(file))
    } catch {
      toast('Could not read that photo')
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    try {
      const { listing, xp_earned } = await api.createListing({
        type,
        title: title.trim(),
        description: description.trim(),
        category: category!,
        condition,
        photo_url: photo,
        address_id: addressId!,
      })
      await refresh()
      toast(`+${xp_earned} XP · You're live! 🎉`, 'reward')
      navigate(`/listing/${listing.id}`, { replace: true })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="pb-28">
      <ScreenHeader back title="New listing" />

      <div className="space-y-6 px-4 pt-2">
        <div className="grid grid-cols-2 rounded-full border-2 border-ink bg-white p-1">
          {(['offer', 'search'] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={cn('h-9 rounded-full text-sm font-bold', type === t ? 'bg-ink text-white' : 'text-ink-muted')}
            >
              {t === 'offer' ? 'I’m offering' : 'I’m looking for'}
            </button>
          ))}
        </div>

        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          {photo ? (
            <div className="relative overflow-hidden rounded-md">
              <img src={photo} alt="Preview" className="aspect-[4/3] w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white"
                aria-label="Remove photo"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-ink/30 bg-white text-ink-muted transition-colors hover:border-ink"
            >
              <Camera size={36} strokeWidth={2} />
              <span className="font-bold text-ink">Add a photo</span>
              <Badge variant="reward">+10 XP</Badge>
            </button>
          )}
        </div>

        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'offer' ? 'e.g. Monstera cutting' : 'e.g. Cast iron pan'}
            maxLength={60}
          />
        </div>

        <div>
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                <CategoryIcon category={c} size={16} /> {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <Label>Condition</Label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <Chip key={c} active={condition === c} onClick={() => setCondition(c)}>
                {CONDITION_LABEL[c]}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Size, story, what you’d swap it for…"
            maxLength={500}
          />
        </div>

        {me && <AddressPicker value={addressId} onChange={setAddressId} defaultId={me.last_address_id} />}
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-lg p-4">
          <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
            {saving ? 'Posting…' : 'Post listing'}
          </Button>
        </div>
      </div>
    </form>
  )
}

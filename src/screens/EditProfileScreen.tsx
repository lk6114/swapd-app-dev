import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Camera, Trash2 } from 'lucide-react'
import { api, BIO_MAX, NAME_MAX, NAME_MIN, type ProfileUpdate } from '@/data'
import { resizeImage } from '@/lib/image'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Avatar } from '@/components/Avatar'
import { useCurrentUser } from '@/components/CurrentUser'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Profil bearbeiten: Name, Foto, Bio. */
export function EditProfileScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const { me, refresh } = useCurrentUser()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Formular einmalig mit den aktuellen Werten füllen
  useEffect(() => {
    if (me && !ready) {
      setName(me.name)
      setBio(me.bio)
      setAvatar(me.avatar_url)
      setReady(true)
    }
  }, [me, ready])

  if (!me || !ready) {
    return (
      <>
        <ScreenHeader back title="Edit profile" />
        <div className="space-y-5 p-4">
          <Skeleton className="mx-auto h-28 w-28 rounded-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </>
    )
  }

  const trimmedName = name.trim().replace(/\s+/g, ' ')
  const nameOk = trimmedName.length >= NAME_MIN && trimmedName.length <= NAME_MAX
  const bioOk = bio.trim().length <= BIO_MAX

  const changes: ProfileUpdate = {}
  if (trimmedName !== me.name) changes.name = trimmedName
  if (bio.trim() !== me.bio) changes.bio = bio
  if (avatar !== me.avatar_url) changes.avatar_url = avatar
  const dirty = Object.keys(changes).length > 0
  const canSave = dirty && nameOk && bioOk && !saving

  async function pickPhoto(file?: File) {
    if (!file) return
    try {
      setAvatar(await resizeImage(file, 400, 0.85))
    } catch {
      toast('Could not read that photo')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const { xp_earned } = await api.updateProfile(changes)
      await refresh()
      toast(xp_earned ? `+${xp_earned} XP – looking good!` : 'Profile saved', xp_earned ? 'reward' : 'info')
      navigate('/profile', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  // Vorschau mit den aktuellen Formularwerten
  const preview = { ...me, name: trimmedName || me.name, avatar_url: avatar }

  return (
    <form onSubmit={save} className="pb-28">
      <ScreenHeader back title="Edit profile" />

      <div className="space-y-6 px-4 pt-2">
        <div className="flex flex-col items-center">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative rounded-full"
            aria-label={avatar ? 'Change photo' : 'Add photo'}
          >
            <Avatar user={preview} className="h-28 w-28 text-5xl" />
            <span className="pop absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink">
              <Camera size={18} strokeWidth={2} />
            </span>
          </button>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {avatar ? 'Change photo' : 'Add photo'}
            </Button>
            {avatar && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAvatar(null)}>
                <Trash2 size={16} strokeWidth={2} /> Remove
              </Button>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            aria-invalid={!nameOk}
            className={cn(!nameOk && 'border-ink')}
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            {nameOk ? 'This is how others see you in chats and on listings.' : `Use ${NAME_MIN}–${NAME_MAX} characters.`}
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="bio">Bio</Label>
            <span className={cn('text-xs', bioOk ? 'text-ink-muted' : 'font-bold text-ink')}>
              {bio.trim().length}/{BIO_MAX}
            </span>
          </div>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX + 20}
            placeholder="What do you swap? Plants, books, kids stuff…"
            className="min-h-24"
          />
        </div>

        {error && (
          <p className="flex items-start gap-1.5 text-sm font-bold" role="alert">
            <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-lg p-4">
          <Button type="submit" size="lg" className="w-full" disabled={!canSave}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}

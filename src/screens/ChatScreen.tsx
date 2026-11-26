import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, SendHorizontal } from 'lucide-react'
import { Stars } from '@/components/Stars'
import { api, type Message } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { formatTime } from '@/lib/format'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Avatar } from '@/components/Avatar'
import { ListingPhoto } from '@/components/ListingPhoto'
import { TypeBadge } from '@/components/TypeBadge'
import { useCurrentUser } from '@/components/CurrentUser'
import { cn } from '@/lib/utils'

export function ChatScreen() {
  const { id = '' } = useParams()
  const { me } = useCurrentUser()
  const { data: chat } = useAsync(() => api.getChat(id), [id])
  const { data: messages, loading, setData: setMessages } = useAsync(() => api.getMessages(id), [id])
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Live-Nachrichten (Mock: Fake-Antworten, später Supabase Realtime)
  useEffect(() => {
    return api.subscribeToMessages(id, (msg) =>
      setMessages((prev) => (prev?.some((m) => m.id === msg.id) ? prev : [...(prev ?? []), msg])),
    )
  }, [id, setMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages?.length])

  async function send(e: FormEvent) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setText('')
    const msg = await api.sendMessage(id, t)
    setMessages((prev: Message[] | undefined) => [...(prev ?? []), msg])
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <ScreenHeader
        back
        title={
          chat?.other_user ? (
            <Link
              to={`/users/${chat.other_user.id}`}
              className="-my-1 flex items-center gap-2 rounded-full py-1 pr-2 hover:bg-ink/5"
              aria-label={`Open ${chat.other_user.name}'s profile`}
            >
              <Avatar user={chat.other_user} size="sm" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate">{chat.other_user.name}</span>
                <span className="flex items-center gap-1 font-sans text-xs font-normal text-ink-muted">
                  {chat.other_user.rating_count > 0 ? (
                    <>
                      <Stars value={chat.other_user.rating_avg} size={10} /> {chat.other_user.rating_avg.toFixed(1)}
                    </>
                  ) : (
                    'No ratings yet'
                  )}
                  <span aria-hidden>·</span> View profile
                </span>
              </span>
              <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-ink-muted" />
            </Link>
          ) : (
            <span className="flex items-center gap-2">
              <Avatar size="sm" />
              <span className="truncate">…</span>
            </span>
          )
        }
      />

      {chat?.listing && (
        <Link
          to={`/listing/${chat.listing.id}`}
          className="mx-4 mb-2 flex items-center gap-3 rounded-md border border-line bg-white p-2 pr-3"
        >
          <ListingPhoto listing={chat.listing} className="h-12 w-12 rounded-sm" iconSize={20} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{chat.listing.title}</p>
            <TypeBadge type={chat.listing.type} className="mt-0.5" />
          </div>
        </Link>
      )}

      <main className="flex-1 space-y-2 px-4 py-3">
        {loading && <p className="text-center text-sm text-ink-muted">Loading…</p>}
        {messages?.length === 0 && (
          <p className="py-8 text-center text-ink-muted">Say hi and propose a swap 👋</p>
        )}
        {messages?.map((m) => {
          const mine = m.sender_id === me?.id
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[78%] rounded-md px-4 py-2.5',
                  mine ? 'rounded-br-sm bg-pink text-white' : 'rounded-bl-sm border border-line bg-white text-ink',
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={cn('mt-0.5 text-right text-[10px]', mine ? 'text-white/75' : 'text-ink-muted')}>
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </main>

      <form onSubmit={send} className="pb-safe sticky bottom-0 border-t border-line bg-white">
        <div className="flex items-center gap-2 p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message…"
            className="h-11 flex-1 rounded-full border-2 border-line bg-surface px-4 outline-none focus:border-ink"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Send"
            className="pop flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink text-white disabled:opacity-40"
          >
            <SendHorizontal size={20} strokeWidth={2.25} />
          </button>
        </div>
      </form>
    </div>
  )
}

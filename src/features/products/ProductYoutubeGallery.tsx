import { useEffect, useState } from 'react'
import { Section } from './form/Field'
import type { StoreProductYoutubeVideo } from '../../types/db'
import { fetchYoutubeVideos, addYoutubeVideo, removeYoutubeVideo } from './youtubeVideos'
import { parseYoutubeId, youtubeThumb, youtubeWatchUrl } from '../../lib/youtube'
import { usePrompt, useAlert, useConfirm } from '../../components/DialogProvider'
import { YouTubeIcon, PlayIcon, TrashIcon } from '../../components/icons'

/**
 * Vídeos do YouTube já salvos (produto existente) — contraparte em modo
 * edição do bloco de vídeos pendentes em `PendingMedia.tsx`. Mesmo padrão de
 * `ProductMediaGallery.tsx` (carrega, some no hover pra apagar).
 */
export function ProductYoutubeGallery({ productId }: { productId: string }) {
  const [videos, setVideos] = useState<StoreProductYoutubeVideo[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prompt = usePrompt()
  const alert = useAlert()
  const confirm = useConfirm()

  const load = () => {
    fetchYoutubeVideos(productId)
      .then(setVideos)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }

  useEffect(load, [productId])

  const handleAdd = async () => {
    const input = await prompt('Link do vídeo do YouTube')
    if (input === null) return
    const youtubeId = parseYoutubeId(input)
    if (!youtubeId) {
      await alert('Link do YouTube inválido.')
      return
    }
    if (videos.some((v) => v.youtube_id === youtubeId)) {
      await alert('Este vídeo já está na lista.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await addYoutubeVideo(productId, youtubeId, null, videos.length)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (video: StoreProductYoutubeVideo) => {
    if (!(await confirm('Remover este vídeo? Essa ação não pode ser desfeita.', { danger: true }))) return
    await removeYoutubeVideo(video.id)
    load()
  }

  if (videos.length === 0 && !busy) {
    return (
      <Section title="Vídeos do YouTube" icon={<YouTubeIcon />}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-400">Nenhum vídeo vinculado.</p>
          <button type="button" onClick={() => void handleAdd()} className="btn-secondary gap-1.5">
            <YouTubeIcon /> Vincular
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </Section>
    )
  }

  return (
    <Section title="Vídeos do YouTube" icon={<YouTubeIcon />}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-400">{videos.length} vídeo(s).</p>
        <button type="button" onClick={() => void handleAdd()} disabled={busy} className="btn-secondary gap-1.5">
          <YouTubeIcon /> {busy ? 'Vinculando…' : 'Vincular'}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {videos.map((v) => (
          <a
            key={v.id}
            href={youtubeWatchUrl(v.youtube_id)}
            target="_blank"
            rel="noreferrer"
            className="group relative block overflow-hidden rounded-lg border border-stone-800"
          >
            <img src={youtubeThumb(v.youtube_id)} alt={v.title ?? ''} className="aspect-square w-full object-cover" />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl text-white/90 drop-shadow">
              <PlayIcon />
            </span>
            <button
              type="button"
              aria-label="Remover"
              onClick={(e) => {
                e.preventDefault()
                void handleRemove(v)
              }}
              className="absolute top-1 right-1 rounded bg-black/70 p-1 text-red-300 opacity-0 transition group-hover:opacity-100"
            >
              <TrashIcon />
            </button>
          </a>
        ))}
      </div>
    </Section>
  )
}

import { useEffect, useState, type ChangeEvent } from 'react'
import { Section } from './Field'
import { TrashIcon, YouTubeIcon, PlayIcon, PhotoIcon } from '../../../components/icons'
import { usePrompt, useAlert } from '../../../components/DialogProvider'
import { parseYoutubeId, youtubeThumb } from '../../../lib/youtube'

/**
 * Fotos, vídeos e vídeos do YouTube escolhidos ANTES de o produto existir:
 * ficam só em memória (com preview local) e sobem/gravam depois que
 * `createProduct` grava a linha — mesmo padrão do `PendingMedia` do
 * formulário de espécime do catálogo pessoal.
 */
export function PendingMedia({
  files,
  onChange,
  youtube,
  onYoutubeChange,
}: {
  files: File[]
  onChange: (files: File[]) => void
  youtube: string[]
  onYoutubeChange: (ids: string[]) => void
}) {
  const prompt = usePrompt()
  const alert = useAlert()
  const [previews, setPreviews] = useState<string[]>([])

  // objectURL precisa ser revogado, senão o blob fica retido enquanto a aba viver.
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  const handleAdd = (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? [])
    if (chosen.length > 0) onChange([...files, ...chosen])
    e.target.value = ''
  }

  const addYoutube = async () => {
    const input = await prompt('Link do vídeo do YouTube')
    if (input === null) return
    const youtubeId = parseYoutubeId(input)
    if (!youtubeId) {
      await alert('Link do YouTube inválido.')
      return
    }
    if (youtube.includes(youtubeId)) {
      await alert('Este vídeo já está na lista.')
      return
    }
    onYoutubeChange([...youtube, youtubeId])
  }

  const total = files.length + youtube.length

  return (
    <Section title="Fotos e vídeos" icon={<PhotoIcon />}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-400">
          {total === 0 ? 'Nenhum arquivo escolhido.' : `${total} item(ns) — enviados ao salvar.`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addYoutube}
            title="Vincular vídeo do YouTube"
            aria-label="Vincular vídeo do YouTube"
            className="btn-secondary"
          >
            <YouTubeIcon />
          </button>
          <label className="btn-secondary cursor-pointer">
            Adicionar
            <input type="file" accept="image/*,video/*" multiple onChange={handleAdd} className="hidden" />
          </label>
        </div>
      </div>

      {total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="group relative overflow-hidden rounded-lg border border-stone-800"
            >
              {file.type.startsWith('video/') ? (
                <video src={previews[i]} className="aspect-square w-full object-cover" />
              ) : (
                <img src={previews[i]} alt={file.name} className="aspect-square w-full object-cover" />
              )}
              <button
                type="button"
                aria-label="Remover"
                onClick={() => onChange(files.filter((_, index) => index !== i))}
                className="absolute top-1 right-1 rounded bg-black/70 p-1 text-red-300 opacity-0 transition group-hover:opacity-100"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          {youtube.map((youtubeId) => (
            <div key={youtubeId} className="group relative overflow-hidden rounded-lg border border-stone-800">
              <img src={youtubeThumb(youtubeId)} alt="" className="aspect-square w-full object-cover" />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl text-white/90 drop-shadow">
                <PlayIcon />
              </span>
              <span className="pointer-events-none absolute top-1 left-1 inline-flex items-center rounded bg-red-700/90 px-1 text-white">
                <YouTubeIcon />
              </span>
              <button
                type="button"
                aria-label="Remover"
                onClick={() => onYoutubeChange(youtube.filter((v) => v !== youtubeId))}
                className="absolute top-1 right-1 rounded bg-black/70 p-1 text-red-300 opacity-0 transition group-hover:opacity-100"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

import { useEffect, useState, type ChangeEvent } from 'react'
import type { StoreProductMedia } from '../../types/db'
import { fetchProductMedia, uploadProductMedia, deleteProductMedia } from './api'
import { mediaSignedUrl } from '../../lib/r2Storage'
import { useConfirm } from '../../components/DialogProvider'
import { PhotoIcon } from '../../components/icons'

export function ProductMediaGallery({ productId }: { productId: string }) {
  const [media, setMedia] = useState<StoreProductMedia[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirm = useConfirm()

  const load = () => {
    fetchProductMedia(productId)
      .then(async (items) => {
        setMedia(items)
        // Bucket é privado: cada arquivo precisa de uma URL assinada pra ser
        // exibido, e elas expiram — por isso resolvidas a cada carregamento.
        const entries = await Promise.all(
          items.map(async (m) => [m.id, await mediaSignedUrl(m.bucket, m.storage_path).catch(() => '')] as const),
        )
        setUrls(Object.fromEntries(entries))
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }

  useEffect(load, [productId])

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      for (const file of files) await uploadProductMedia(productId, file)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (item: StoreProductMedia) => {
    if (!(await confirm('Apagar este arquivo? Essa ação não pode ser desfeita.', { danger: true }))) return
    await deleteProductMedia(item)
    load()
  }

  return (
    <section className="space-y-3 rounded-lg border border-stone-800 p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium text-stone-200">
          <span className="text-stone-400">
            <PhotoIcon />
          </span>
          Fotos e vídeos
        </h2>
        <label className="btn-secondary cursor-pointer">
          {busy ? 'Enviando…' : 'Adicionar'}
          <input type="file" accept="image/*,video/*" multiple onChange={handleUpload} disabled={busy} className="hidden" />
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {media.length === 0 && <p className="text-sm text-stone-400">Nenhuma foto ou vídeo ainda.</p>}

      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m) => (
            <div key={m.id} className="group relative overflow-hidden rounded-lg border border-stone-800">
              {m.kind === 'video' ? (
                <video src={urls[m.id]} controls className="aspect-square w-full object-cover" />
              ) : (
                <img src={urls[m.id]} alt={m.caption ?? ''} className="aspect-square w-full object-cover" />
              )}
              {m.bucket === 'media' && (
                <span
                  title="Foto original da coleção pessoal — apagar aqui só remove o vínculo, não o arquivo"
                  className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-stone-300"
                >
                  Do catálogo
                </span>
              )}
              <button
                type="button"
                onClick={() => void handleDelete(m)}
                className="absolute top-1 right-1 rounded bg-black/70 px-2 py-1 text-xs text-red-300 opacity-0 transition group-hover:opacity-100"
              >
                Apagar
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

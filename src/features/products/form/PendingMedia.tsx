import { useEffect, useState, type ChangeEvent } from 'react'
import { Section } from './Field'
import { TrashIcon } from '../../../components/icons'

/**
 * Fotos e vídeos escolhidos ANTES de o produto existir: ficam só em memória
 * (com preview local) e sobem depois que `createProduct` grava a linha — mesmo
 * padrão do `PendingMedia` do formulário de espécime do catálogo pessoal.
 */
export function PendingMedia({
  files,
  onChange,
}: {
  files: File[]
  onChange: (files: File[]) => void
}) {
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

  return (
    <Section title="Fotos e vídeos">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-400">
          {files.length === 0 ? 'Nenhum arquivo escolhido.' : `${files.length} arquivo(s) — enviados ao salvar.`}
        </p>
        <label className="btn-secondary cursor-pointer">
          Adicionar
          <input type="file" accept="image/*,video/*" multiple onChange={handleAdd} className="hidden" />
        </label>
      </div>

      {files.length > 0 && (
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
        </div>
      )}
    </Section>
  )
}

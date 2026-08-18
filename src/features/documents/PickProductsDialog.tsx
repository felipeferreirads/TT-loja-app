import { useEffect, useMemo, useState } from 'react'
import { ITEM_KIND_LABELS, type StoreProduct } from '../../types/db'
import { fetchProducts } from '../products/api'
import { CloseIcon, SearchIcon } from '../../components/icons'

/** Modal de seleção de produtos para vincular a um documento. */
export function PickProductsDialog({
  excludeIds,
  onCancel,
  onConfirm,
}: {
  excludeIds: string[]
  onCancel: () => void
  onConfirm: (ids: string[]) => void
}) {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  const visible = useMemo(() => {
    const exclude = new Set(excludeIds)
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (exclude.has(p.id)) return false
      if (!q) return true
      return [p.name, p.sku, p.minerals?.[0]?.name].some((v) => v?.toLowerCase().includes(q))
    })
  }, [products, excludeIds, query])

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[80dvh] w-full max-w-lg flex-col rounded-xl border border-stone-800 bg-stone-900">
        <header className="flex items-center justify-between border-b border-stone-800 p-4">
          <h2 className="font-medium text-stone-100">Vincular produtos</h2>
          <button type="button" onClick={onCancel} aria-label="Fechar" className="tap-icon">
            <CloseIcon />
          </button>
        </header>

        <div className="border-b border-stone-800 p-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, SKU ou espécie…"
              className="input pl-10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {error && <p className="p-2 text-sm text-red-400">{error}</p>}
          {!error && visible.length === 0 && <p className="p-2 text-sm text-stone-400">Nenhum produto encontrado.</p>}
          {visible.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-stone-800"
            >
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => toggle(p.id)}
                className="accent-amber-600"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-stone-100">{p.name}</span>
                <span className="block truncate text-xs text-stone-500">
                  {ITEM_KIND_LABELS[p.kind]}
                  {p.sku ? ` · ${p.sku}` : ''}
                </span>
              </span>
            </label>
          ))}
        </div>

        <footer className="flex justify-end gap-2 border-t border-stone-800 p-3">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            className="btn-primary"
          >
            Vincular{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </footer>
      </div>
    </div>
  )
}

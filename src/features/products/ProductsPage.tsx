import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ITEM_KIND_LABELS, type StoreItemKind, type StoreProduct } from '../../types/db'
import { fetchProducts, deleteProduct, fetchCoverUrls } from './api'
import { ProductCard } from './ProductCard'
import { formatMoney, stripAccents } from '../../lib/format'
import { useConfirm } from '../../components/DialogProvider'
import { SearchField } from '../../components/SearchField'
import { GridViewIcon, ListViewIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/icons'
import { SortControl } from '../../components/SortControl'

type ViewMode = 'grid' | 'list'
const VIEW_STORAGE_KEY = 'tt_loja_products_view'

const KIND_FILTERS = Object.entries(ITEM_KIND_LABELS) as [StoreItemKind, string][]

type ProductSortField = 'name' | 'sale_price' | 'stock_quantity' | 'created_at'

const PRODUCT_SORT_OPTIONS: { value: ProductSortField; label: string }[] = [
  { value: 'name', label: 'Nome' },
  { value: 'sale_price', label: 'Preço' },
  { value: 'stock_quantity', label: 'Estoque' },
  { value: 'created_at', label: 'Data de criação' },
]

export function ProductsPage() {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null) ?? 'grid',
  )
  // Busca e filtro moram na query string pra sobreviverem ao "voltar" depois
  // de abrir um produto — mesmo padrão da Coleção no catálogo pessoal.
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const kindFilter = params.get('tipo') as StoreItemKind | null
  const sortField = (params.get('ordenar') as ProductSortField | null) ?? 'name'
  const sortDir = (params.get('dir') as 'asc' | 'desc' | null) ?? 'asc'

  const confirm = useConfirm()
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    fetchProducts()
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
    fetchCoverUrls().then(setCoverUrls).catch(() => {})
  }

  useEffect(load, [])

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const chooseView = (next: ViewMode) => {
    setView(next)
    localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  const visible = useMemo(() => {
    const q = stripAccents(search.trim())
    const filtered = products.filter((p) => {
      if (kindFilter && p.kind !== kindFilter) return false
      if (!q) return true
      return [p.name, p.sku, p.species, p.variety, p.origin, p.formula].some(
        (v) => v && stripAccents(v).includes(q),
      )
    })
    return [...filtered].sort((a, b) => {
      let diff: number
      if (sortField === 'name') diff = a.name.localeCompare(b.name, 'pt-BR')
      else if (sortField === 'created_at') diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else diff = a[sortField] - b[sortField]
      return sortDir === 'asc' ? diff : -diff
    })
  }, [products, search, kindFilter, sortField, sortDir])

  const handleDelete = async (product: StoreProduct) => {
    if (!(await confirm(`Apagar "${product.name}"? Essa ação não pode ser desfeita.`, { danger: true }))) return
    await deleteProduct(product.id)
    load()
  }

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-100">Produtos</h1>
        <Link to="/produtos/novo" className="btn-primary inline-flex items-center gap-1.5">
          <PlusIcon className="h-4 w-4" />
          Novo produto
        </Link>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-xl flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          <SearchField
            value={search}
            onCommit={(v) => setParam('q', v || null)}
            placeholder="Buscar por nome, SKU, espécie, localidade…"
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SortControl
            value={sortField}
            onChange={(v) => setParam('ordenar', v === 'name' ? null : v)}
            options={PRODUCT_SORT_OPTIONS}
            dir={sortDir}
            onToggleDir={() => setParam('dir', sortDir === 'asc' ? 'desc' : null)}
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => chooseView('grid')}
              aria-label="Visualizar em grade"
              className={`tap-icon ${view === 'grid' ? 'text-amber-400' : ''}`}
            >
              <GridViewIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => chooseView('list')}
              aria-label="Visualizar em lista"
              className={`tap-icon ${view === 'list' ? 'text-amber-400' : ''}`}
            >
              <ListViewIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="no-scrollbar mb-4 flex items-center gap-1 overflow-x-auto text-sm">
        <KindChip active={!kindFilter} onClick={() => setParam('tipo', null)} label="Todos" />
        {KIND_FILTERS.map(([value, label]) => (
          <KindChip
            key={value}
            active={kindFilter === value}
            onClick={() => setParam('tipo', kindFilter === value ? null : value)}
            label={label}
          />
        ))}
      </div>

      {loading && <p className="text-sm text-stone-400">Carregando…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && visible.length === 0 && (
        <p className="text-sm text-stone-400">
          {products.length === 0 ? 'Nenhum produto cadastrado ainda.' : 'Nenhum produto encontrado.'}
        </p>
      )}

      {visible.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} coverUrl={coverUrls[p.id]} />
          ))}
        </div>
      )}

      {visible.length > 0 && view === 'list' && (
        <div className="overflow-x-auto rounded-lg border border-stone-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-900 text-stone-400">
              <tr>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Espécie</th>
                <th className="px-3 py-2 font-medium">Estoque</th>
                <th className="px-3 py-2 font-medium">Preço</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {visible.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/produtos/${p.id}`)}
                  className="cursor-pointer transition hover:bg-stone-900"
                >
                  <td className="px-3 py-2 text-stone-100">{p.name}</td>
                  <td className="px-3 py-2 text-stone-400">{ITEM_KIND_LABELS[p.kind]}</td>
                  <td className="px-3 py-2 text-stone-400">{p.species ?? '—'}</td>
                  <td className="px-3 py-2 text-stone-400">{p.stock_quantity}</td>
                  <td className="px-3 py-2 text-stone-400">{formatMoney(p.sale_price)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      aria-label="Apagar"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDelete(p)
                      }}
                      className="tap-icon hover:text-red-400"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function KindChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-9 shrink-0 items-center rounded-full px-4 transition ${
        active ? 'bg-stone-800 text-amber-400' : 'text-stone-400 hover:text-stone-100'
      }`}
    >
      {label}
    </button>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ITEM_KIND_LABELS, type StoreItemKind, type StoreProduct } from '../../types/db'
import { fetchProducts, deleteProduct, fetchCoverUrls } from './api'
import { ProductCard } from './ProductCard'
import { formatMoney, stripAccents } from '../../lib/format'
import { useConfirm } from '../../components/DialogProvider'
import { useToast } from '../../components/ToastProvider'
import { SearchField } from '../../components/SearchField'
import { EmptyState } from '../../components/EmptyState'
import {
  GridDenseIcon,
  GridLargeIcon,
  GridViewIcon,
  ImportIcon,
  ListViewIcon,
  PlusIcon,
  QrCodeIcon,
  ChevronDownIcon,
  SpecimenIcon,
  TrashIcon,
  WarningIcon,
} from '../../components/icons'
import { SortControl } from '../../components/SortControl'
import { ExportMenu } from './export/ExportMenu'
import { ImportFromCollectionDialog } from './ImportFromCollectionDialog'

// 3 densidades de grade + lista — mesmo padrão do catálogo pessoal
// (SpecimenToolbar.tsx: `MOBILE_VIEW_MODES`), simplificado sem o slider de
// desktop (a loja não tem coleções grandes o bastante pra justificar xs/xl).
type ViewMode = 'list' | 'grid-sm' | 'grid-md' | 'grid-lg'
const VIEW_STORAGE_KEY = 'tt_loja_products_view'
const VIEW_MODES: { value: ViewMode; icon: typeof ListViewIcon; label: string }[] = [
  { value: 'list', icon: ListViewIcon, label: 'Visualizar em lista' },
  { value: 'grid-sm', icon: GridDenseIcon, label: 'Grade densa' },
  { value: 'grid-md', icon: GridViewIcon, label: 'Grade média' },
  { value: 'grid-lg', icon: GridLargeIcon, label: 'Grade grande' },
]
// `repeat(auto-fill, minmax(...))` — mesmos valores do catálogo pessoal
// (`GRID_CLASSES` em SpecimenToolbar.tsx), pro card manter largura-alvo
// constante em vez de esticar num monitor largo.
const GRID_CLASSES: Record<Exclude<ViewMode, 'list'>, string> = {
  'grid-sm': 'grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2',
  'grid-md': 'grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3',
  'grid-lg': 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4',
}
function loadView(): ViewMode {
  const saved = localStorage.getItem(VIEW_STORAGE_KEY)
  if (saved === 'grid') return 'grid-md' // migração do valor antigo (só grade/lista)
  return (['list', 'grid-sm', 'grid-md', 'grid-lg'] as ViewMode[]).includes(saved as ViewMode)
    ? (saved as ViewMode)
    : 'grid-md'
}

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
  const [view, setView] = useState<ViewMode>(loadView)
  const [importing, setImporting] = useState(false)
  // No mobile, os chips de tipo viram uma caixa de seleção: só a pílula do
  // tipo atual aparece, e expande as demais em coluna abaixo ao tocar —
  // mesmo padrão do catálogo pessoal (SpecimenToolbar.tsx).
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const typeMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!typeMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) setTypeMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [typeMenuOpen])
  // Busca e filtro moram na query string pra sobreviverem ao "voltar" depois
  // de abrir um produto — mesmo padrão da Coleção no catálogo pessoal.
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const kindFilter = params.get('tipo') as StoreItemKind | null
  const lowStockOnly = params.get('baixo') === '1'
  const sortField = (params.get('ordenar') as ProductSortField | null) ?? 'name'
  const sortDir = (params.get('dir') as 'asc' | 'desc' | null) ?? 'asc'

  const confirm = useConfirm()
  const toast = useToast()
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
      if (lowStockOnly && !(p.min_stock != null && p.stock_quantity <= p.min_stock)) return false
      if (!q) return true
      return [p.name, p.sku, p.origin, ...(p.minerals ?? []).map((m) => m.name)].some(
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
  }, [products, search, kindFilter, lowStockOnly, sortField, sortDir])

  const handleDelete = async (product: StoreProduct) => {
    if (!(await confirm(`Mover "${product.name}" para a lixeira? Pode ser restaurado por 15 dias.`))) return
    await deleteProduct(product.id)
    toast.success(`"${product.name}" movido para a lixeira.`)
    load()
  }

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-100">Produtos</h1>
        <div className="flex items-center gap-2">
          <Link to="/escanear" className="btn-secondary" title="Escanear QR" aria-label="Escanear QR">
            <QrCodeIcon className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => setImporting(true)} className="btn-secondary inline-flex items-center gap-1.5">
            <ImportIcon className="h-4 w-4" />
            Importar da coleção
          </button>
          <ExportMenu products={visible} filename="produtos" />
          <Link to="/produtos/novo" className="btn-primary inline-flex items-center gap-1.5">
            <PlusIcon className="h-4 w-4" />
            Novo produto
          </Link>
        </div>
      </header>

      <div className="mb-3">
        <SearchField
          value={search}
          onCommit={(v) => setParam('q', v || null)}
          placeholder="Buscar por nome, SKU, espécie, localidade…"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Mobile: caixa de seleção expansível — só a pílula do tipo atual
            aparece (largura pelo conteúdo, lado a lado com os outros
            controles), e expande as demais em coluna abaixo ao tocar. */}
        <div ref={typeMenuRef} className="relative order-1 shrink-0 sm:hidden">
          <button
            type="button"
            onClick={() => setTypeMenuOpen((v) => !v)}
            aria-expanded={typeMenuOpen}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-amber-600 px-3 text-sm whitespace-nowrap text-white transition hover:bg-amber-500"
          >
            {kindFilter ? ITEM_KIND_LABELS[kindFilter] : 'Todos'}
            <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${typeMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {typeMenuOpen && (
            <div className="absolute z-10 mt-1 flex w-max min-w-full flex-col gap-1 rounded-xl border border-stone-800 bg-stone-900 p-1.5 shadow-xl shadow-black/30">
              {([['', 'Todos'] as [string, string]].concat(KIND_FILTERS) as [string, string][])
                .filter(([value]) => value !== (kindFilter ?? ''))
                .map(([value, label]) => (
                  <button
                    key={value || 'all'}
                    onClick={() => {
                      setParam('tipo', value || null)
                      setTypeMenuOpen(false)
                    }}
                    className="inline-flex min-h-8 items-center rounded-full bg-stone-800 px-3 text-left text-sm whitespace-nowrap text-stone-300 transition hover:bg-stone-700"
                  >
                    {label}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Desktop: fileira de chips rolável */}
        <div className="no-scrollbar order-1 hidden justify-start gap-2 overflow-x-auto pb-1 text-sm sm:flex sm:w-auto sm:flex-1">
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

        {/* "Estoque baixo" é um filtro independente (não faz parte do grupo
            de tipo, que é seleção única) — fica fora da caixa de seleção. */}
        <KindChip
          active={lowStockOnly}
          onClick={() => setParam('baixo', lowStockOnly ? null : '1')}
          label="Estoque baixo"
          icon={WarningIcon}
          className="order-1"
        />

        <div className="order-2 ml-auto flex flex-wrap items-center gap-2 sm:ml-0 sm:flex-nowrap">
          <SortControl
            value={sortField}
            onChange={(v) => setParam('ordenar', v === 'name' ? null : v)}
            options={PRODUCT_SORT_OPTIONS}
            dir={sortDir}
            onToggleDir={() => setParam('dir', sortDir === 'asc' ? 'desc' : null)}
          />
          <div className="flex shrink-0 overflow-hidden rounded-full bg-stone-800">
            {VIEW_MODES.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => chooseView(v.value)}
                aria-label={v.label}
                title={v.label}
                className={`inline-flex h-8 items-center px-2.5 text-sm transition sm:h-7 ${
                  view === v.value ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-700'
                }`}
              >
                <v.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-stone-400">Carregando…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && visible.length === 0 && (
        <EmptyState
          icon={SpecimenIcon}
          title={products.length === 0 ? 'Nenhum produto cadastrado ainda' : 'Nenhum produto encontrado'}
          description={products.length === 0 ? 'Cadastre o primeiro produto ou importe da coleção pessoal.' : undefined}
        />
      )}

      {visible.length > 0 && view !== 'list' && (
        <div className={GRID_CLASSES[view]}>
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
                  <td className="px-3 py-2 text-stone-100">
                    {p.lot_suffix && <span className="mr-1.5 font-mono text-xs text-amber-500">#{p.lot_suffix}</span>}
                    {p.name}
                    {p.is_lot && <span className="ml-1.5 text-xs text-stone-500">(lote)</span>}
                  </td>
                  <td className="px-3 py-2 text-stone-400">{ITEM_KIND_LABELS[p.kind]}</td>
                  <td className="px-3 py-2 text-stone-400">{p.minerals?.[0]?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-stone-400">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        p.stock_quantity <= 0
                          ? 'text-red-400'
                          : p.min_stock != null && p.stock_quantity <= p.min_stock
                            ? 'text-amber-500'
                            : ''
                      }`}
                    >
                      {p.min_stock != null && p.stock_quantity <= p.min_stock && p.stock_quantity > 0 && (
                        <WarningIcon className="h-3.5 w-3.5" />
                      )}
                      {p.stock_quantity}
                    </span>
                  </td>
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

      {importing && (
        <ImportFromCollectionDialog
          onCancel={() => setImporting(false)}
          onDone={() => {
            setImporting(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function KindChip({
  active,
  onClick,
  label,
  icon: Icon,
  className = '',
}: {
  active: boolean
  onClick: () => void
  label: string
  icon?: typeof WarningIcon
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-3 text-sm whitespace-nowrap transition ${className} ${
        active ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  )
}

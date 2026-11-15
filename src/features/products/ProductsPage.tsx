import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ITEM_KIND_LABELS, type SizeClass, type StoreItemKind, type StoreProduct } from '../../types/db'
import { deleteProducts, restoreProducts, updateProducts } from './api'
import { useCoverUrls, useProducts } from './queries'
import { ProductCard } from './ProductCard'
import { countryName, formatMoney } from '../../lib/format'
import { useConfirm } from '../../components/DialogProvider'
import { useToast } from '../../components/ToastProvider'
import { SearchField } from '../../components/SearchField'
import { EmptyState } from '../../components/EmptyState'
import {
  CardIcon,
  CopyIcon,
  FreezeColumnsIcon,
  GlobeIcon,
  GridDenseIcon,
  GridLargeIcon,
  GridViewIcon,
  ImportIcon,
  LabelIcon,
  ListViewIcon,
  PackageIcon,
  PhotoIcon,
  PlusIcon,
  QrCodeIcon,
  SelectIcon,
  SpecimenIcon,
  SpreadsheetIcon,
  TagIcon,
  TrashIcon,
  TruckIcon,
  WarningIcon,
} from '../../components/icons'
import { ExportMenu } from './export/ExportMenu'
import { downloadCsv, toCsv } from './export/csv'
import { ImportFromCollectionDialog } from './ImportFromCollectionDialog'
import { BulkPriceDialog } from './BulkPriceDialog'
import { BulkSelectionBar, type BulkAction } from '../../components/BulkSelectionBar'
import { useRowSelection } from '../../lib/useRowSelection'
import { useIsMobile } from '../../lib/useIsMobile'
import { ActionMenu } from '../../components/ActionMenu'
import { ExpandablePillSelect } from '../../components/ExpandablePillSelect'
import { FilterChip } from '../../components/FilterChip'
import { FilterPill, FilterSection, ListToolbar, useFilterSections } from '../../components/ListToolbar'
import { fetchSuppliers } from '../suppliers/api'
import { SIZE_CLASS_LABELS, SIZE_CLASS_VALUES, effectiveSizeClass } from './sizeClass'
import {
  COLUMN_BY_KEY,
  MAX_FROZEN_COLS,
  loadColumns,
  loadFrozen,
  loadWidths,
  rawValue,
  saveColumns,
  saveFrozen,
  saveWidths,
  sortKey,
  speciesOf,
  type ColumnContext,
} from './list/columns'
import { ColumnPicker } from './list/ColumnPicker'
import { ProductSheet, type SortRule } from './list/ProductSheet'
import {
  FILTER_PARAM_KEYS,
  PRODUCT_SORT_OPTIONS,
  compareBy,
  countActive,
  defaultSortDir,
  matchesFilters,
  readFilters,
  writeParam,
  type LotFilter,
  type ProductSortField,
  type PublishedFilter,
  type StockFilter,
} from './list/productFilters'
import { usePersistedSort } from '../../lib/usePersistedSort'
import { LabelsDialog } from './labels/LabelsDialog'
import { SocialCardDialog } from './social/SocialCardDialog'

// 3 densidades de grade + lista — mesmo padrão do catálogo pessoal
// (SpecimenToolbar.tsx: `MOBILE_VIEW_MODES`).
type ViewMode = 'list' | 'grid-sm' | 'grid-md' | 'grid-lg'
const VIEW_STORAGE_KEY = 'tt_loja_products_view'
const GRID_MODE_KEY = 'tt_loja_products_grid_mode'
const VIEW_MODES: { value: ViewMode; icon: typeof ListViewIcon; label: string }[] = [
  { value: 'list', icon: ListViewIcon, label: 'Lista' },
  { value: 'grid-sm', icon: GridDenseIcon, label: 'Grade densa' },
  { value: 'grid-md', icon: GridViewIcon, label: 'Grade média' },
  { value: 'grid-lg', icon: GridLargeIcon, label: 'Grade grande' },
]
// `repeat(auto-fill, minmax(...))` — mesmos valores do catálogo pessoal (`GRID_CLASSES`).
const GRID_CLASSES: Record<Exclude<ViewMode, 'list'>, string> = {
  'grid-sm': 'grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2',
  'grid-md': 'grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3',
  'grid-lg': 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4',
}
function loadView(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    if (saved === 'grid') return 'grid-md'
    return (['list', 'grid-sm', 'grid-md', 'grid-lg'] as ViewMode[]).includes(saved as ViewMode) ? (saved as ViewMode) : 'grid-md'
  } catch {
    return 'grid-md'
  }
}

const TYPE_OPTIONS = [{ value: '', label: 'Todos' }, ...(Object.entries(ITEM_KIND_LABELS) as [StoreItemKind, string][]).map(([value, label]) => ({ value, label }))]
const SORT_FIELDS = PRODUCT_SORT_OPTIONS.map((o) => o.value)

type SectionKey = 'stock' | 'published' | 'lot' | 'species' | 'country' | 'size' | 'supplier' | 'price'

// Referências estáveis enquanto o cache carrega.
const EMPTY_PRODUCTS: StoreProduct[] = []
const EMPTY_COVERS: Record<string, string> = {}

export function ProductsPage() {
  const productsQuery = useProducts()
  const products = productsQuery.data ?? EMPTY_PRODUCTS
  const coverUrls = useCoverUrls().data ?? EMPTY_COVERS
  const { data: suppliers } = useQuery({ queryKey: ['store-suppliers'], queryFn: fetchSuppliers })
  const loading = productsQuery.isPending
  const error = productsQuery.error ? (productsQuery.error instanceof Error ? productsQuery.error.message : String(productsQuery.error)) : null
  const isMobile = useIsMobile()

  const [view, setView] = useState<ViewMode>(loadView)
  const [gridMode, setGridMode] = useState(() => {
    try {
      return localStorage.getItem(GRID_MODE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [columns, setColumns] = useState(loadColumns)
  const [widths, setWidths] = useState(loadWidths)
  const [frozen, setFrozen] = useState(loadFrozen)
  const [columnSort, setColumnSort] = useState<SortRule[]>([])
  const [findOpen, setFindOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pricing, setPricing] = useState(false)
  const [labelsFor, setLabelsFor] = useState<StoreProduct[] | null>(null)
  const [socialFor, setSocialFor] = useState<StoreProduct | null>(null)
  const sel = useRowSelection()

  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => readFilters(params), [params])
  const setParam = (key: string, value: string | string[] | number | null) => setParams(writeParam(params, key, value), { replace: true })
  const sort = usePersistedSort<ProductSortField>('tt_loja_products_sort', SORT_FIELDS, { field: 'name', dir: 'asc' }, defaultSortDir)

  const confirm = useConfirm()
  const toast = useToast()
  const navigate = useNavigate()

  const supplierNames = useMemo(() => new Map((suppliers ?? []).map((s) => [s.id, s.name])), [suppliers])
  const ctx: ColumnContext = useMemo(() => ({ supplierNames }), [supplierNames])

  const chooseView = (next: ViewMode) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      /* só não persiste */
    }
  }
  const toggleGridMode = () => {
    setGridMode((v) => {
      try {
        localStorage.setItem(GRID_MODE_KEY, v ? '0' : '1')
      } catch {
        /* só não persiste */
      }
      return !v
    })
  }

  const visible = useMemo(() => {
    const filtered = products.filter((p) => matchesFilters(p, filters, supplierNames))
    // Ordenação pela coluna (lista) vence a da pílula, como na Coleção.
    if (view === 'list' && columnSort.length > 0) {
      const cols = columnSort.map((s) => ({ col: COLUMN_BY_KEY.get(s.key), dir: s.dir })).filter((x) => x.col)
      return [...filtered].sort((a, b) => {
        for (const { col, dir } of cols) {
          const va = sortKey(col!, a, ctx)
          const vb = sortKey(col!, b, ctx)
          if (va === vb) continue
          const diff = va < vb ? -1 : 1
          return dir === 'asc' ? diff : -diff
        }
        return 0
      })
    }
    return [...filtered].sort((a, b) => {
      const diff = compareBy(sort.field, a, b)
      return sort.dir === 'asc' ? diff : -diff
    })
  }, [products, filters, supplierNames, view, columnSort, sort.field, sort.dir, ctx])

  // Item filtrado/apagado sai da seleção (contagem honesta).
  const { prune } = sel
  useEffect(() => {
    prune(new Set(visible.map((p) => p.id)))
  }, [visible, prune])

  const selectedProducts = useMemo(() => visible.filter((p) => sel.selected.has(p.id)), [visible, sel.selected])
  const allPublished = selectedProducts.length > 0 && selectedProducts.every((p) => p.ecommerce_published)

  // ── Opções do painel de filtros (com contagem, sobre a lista inteira) ────
  const speciesChoices = useMemo(() => countBy(products, speciesOf), [products])
  const countryChoices = useMemo(() => countBy(products, (p) => p.origin_country ?? ''), [products])
  const supplierChoices = useMemo(() => countBy(products, (p) => p.supplier_id ?? ''), [products])
  const sizeChoices = useMemo(() => countBy(products, (p) => effectiveSizeClass(p) ?? ''), [products])

  const activeFilters = countActive(filters)
  const clearFilters = () => {
    const next = new URLSearchParams(params)
    for (const k of FILTER_PARAM_KEYS) next.delete(k)
    setParams(next, { replace: true })
  }
  const panel = useFilterSections<SectionKey>(
    [
      filters.stock && 'stock',
      filters.published && 'published',
      filters.lot && 'lot',
      filters.species.length > 0 && 'species',
      filters.countries.length > 0 && 'country',
      filters.sizes.length > 0 && 'size',
      filters.suppliers.length > 0 && 'supplier',
      (filters.priceMin != null || filters.priceMax != null) && 'price',
    ].filter(Boolean) as SectionKey[],
  )
  const toggleIn = (key: string, current: string[], value: string) =>
    setParam(key, current.includes(value) ? current.filter((v) => v !== value) : [...current, value])

  // ── Ações em massa ───────────────────────────────────────────────────────
  const bulkDelete = async () => {
    const n = selectedProducts.length
    if (!(await confirm(`Mover ${n} ${n === 1 ? 'produto' : 'produtos'} para a lixeira? Os itens excluídos ficam na lixeira por 15 dias e podem ser restaurados.`))) return
    const ids = selectedProducts.map((p) => p.id)
    try {
      await deleteProducts(ids)
      toast.success(`${n} ${n === 1 ? 'produto movido' : 'produtos movidos'} para a lixeira.`, {
        action: {
          label: 'Desfazer',
          onClick: async () => {
            try {
              await restoreProducts(ids)
              toast.success(`${n} ${n === 1 ? 'produto restaurado' : 'produtos restaurados'}.`)
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Não foi possível desfazer.')
            }
          },
        },
      })
      sel.cancel()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir.')
    }
  }

  const bulkPublish = async () => {
    const publish = !allPublished
    try {
      await updateProducts(selectedProducts.map((p) => p.id), { ecommerce_published: publish })
      toast.success(publish ? 'Publicado na loja online.' : 'Removido da loja online.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar.')
    }
  }

  // Ordem = prioridade: venda, preço, etiquetas, cartão, publicar, excluir (destrutiva por último).
  const bulkActions: BulkAction[] = [
    { key: 'sale', label: 'Criar venda', icon: <PackageIcon />, onClick: () => navigate('/vendas', { state: { prefillProductIds: sel.ids } }) },
    { key: 'price', label: 'Alterar preço', icon: <TagIcon />, onClick: () => setPricing(true) },
    { key: 'labels', label: 'Etiquetas de preço', icon: <LabelIcon />, onClick: () => setLabelsFor(selectedProducts) },
    {
      key: 'social',
      label: 'Cartão para redes sociais',
      icon: <CardIcon />,
      onClick: () => selectedProducts[0] && setSocialFor(selectedProducts[0]),
      disabled: selectedProducts.length !== 1,
    },
    { key: 'publish', label: allPublished ? 'Remover da loja online' : 'Publicar na loja online', icon: <GlobeIcon />, onClick: () => void bulkPublish() },
    { key: 'delete', label: 'Excluir', icon: <TrashIcon />, onClick: () => void bulkDelete(), danger: true },
  ]

  /** Planilha (CSV) com as colunas visíveis da lista, na ordem e com o filtro da tela. */
  const exportVisibleColumns = () => {
    const cols = columns.map((k) => COLUMN_BY_KEY.get(k)).filter((c) => c && c.key !== 'foto')
    const rows = visible.map((p) => cols.map((c) => rawValue(c!, p, ctx)))
    downloadCsv('produtos-lista.csv', toCsv(cols.map((c) => c!.label), rows, ';'))
  }

  const isList = view === 'list'
  const showSheet = isList && !isMobile
  const narrowed = visible.length !== products.length

  return (
    <div className="space-y-4">
      {/* Título e busca/filtros alinhados à largura do cabeçalho, como na Coleção. */}
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-stone-100">
            Produtos{' '}
            {products.length > 0 && (
              <span className="text-sm font-normal text-stone-500">({narrowed ? `${visible.length} de ${products.length}` : products.length})</span>
            )}
          </h1>
          <div className="flex gap-2">
            {showSheet && (
              <button
                type="button"
                onClick={toggleGridMode}
                aria-pressed={gridMode}
                className={`${gridMode ? 'btn-primary' : 'btn-secondary'} h-9 min-h-9 gap-1.5 py-0`}
                title="Modo planilha: selecionar, copiar, colar e editar várias células"
              >
                <SpreadsheetIcon />
                Modo planilha
              </button>
            )}
            {!sel.selecting && visible.length > 0 && (
              <button
                type="button"
                onClick={() => sel.start()}
                className="btn-secondary h-9 min-h-9 w-9 px-0 py-0"
                title="Selecionar vários (no celular, toque e segure num item)"
                aria-label="Selecionar vários"
              >
                <SelectIcon />
              </button>
            )}
            <Link to="/escanear" className="btn-secondary h-9 min-h-9 w-9 px-0 py-0" title="Escanear etiqueta QR" aria-label="Escanear etiqueta QR">
              <QrCodeIcon />
            </Link>
            <ExportMenu
              products={visible}
              filename="produtos"
              extraItems={isList ? [{ label: 'Planilha das colunas visíveis', icon: <SpreadsheetIcon />, onClick: exportVisibleColumns }] : []}
            />
            <ActionMenu
              label="Criar"
              buttonClassName="btn-primary inline-flex h-9 min-h-9 w-9 items-center justify-center px-0 py-0"
              items={[
                { label: 'Novo produto', icon: <PlusIcon />, to: '/produtos/novo' },
                { label: 'Importar da coleção', icon: <ImportIcon />, onClick: () => setImporting(true) },
              ]}
            >
              <PlusIcon />
            </ActionMenu>
          </div>
        </div>

        <SearchField
          value={filters.search}
          onCommit={(v) => setParam('q', v || null)}
          className="border-stone-700/80 bg-stone-950/70 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
          placeholder="Buscar por nome, SKU, espécie, localidade, fornecedor…"
        />

        <ListToolbar
          summary={
            <div className="flex items-center gap-2">
              <ExpandablePillSelect
                className="shrink-0 sm:hidden"
                value={filters.kind ?? ''}
                options={TYPE_OPTIONS}
                onChange={(v) => setParam('tipo', v || null)}
              />
              <div className="no-scrollbar hidden gap-2 overflow-x-auto pb-1 sm:flex">
                {TYPE_OPTIONS.map((o) => (
                  <button
                    key={o.value || 'all'}
                    type="button"
                    onClick={() => setParam('tipo', o.value || null)}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm whitespace-nowrap transition ${
                      (filters.kind ?? '') === o.value ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          }
          sort={{
            options: PRODUCT_SORT_OPTIONS,
            value: sort.field,
            dir: sort.dir,
            onChangeField: (v) => {
              setColumnSort([])
              sort.changeField(v as ProductSortField)
            },
            onToggleDir: () => {
              setColumnSort([])
              sort.toggleDir()
            },
          }}
          activeFilters={activeFilters}
          onClearFilters={clearFilters}
          trailing={
            <>
              {showSheet && columns.length > 1 && (
                <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-stone-700 bg-stone-800 p-0.5" title="Colunas fixas à esquerda">
                  <FreezeColumnsIcon className="mx-1.5 shrink-0 text-sm text-stone-400" />
                  {Array.from({ length: MAX_FROZEN_COLS + 1 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setFrozen(n)
                        saveFrozen(n)
                      }}
                      aria-pressed={frozen === n}
                      className={`min-h-6 rounded-full px-2 text-xs font-medium whitespace-nowrap transition ${
                        frozen === n ? 'bg-amber-600 text-white' : 'text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      {n === 0 ? 'Nenhuma' : n}
                    </button>
                  ))}
                </div>
              )}
              {showSheet && (
                <ColumnPicker
                  columns={columns}
                  onChange={(c) => {
                    setColumns(c)
                    saveColumns(c)
                  }}
                  onResetWidths={
                    Object.keys(widths).length > 0
                      ? () => {
                          setWidths({})
                          saveWidths({})
                        }
                      : undefined
                  }
                />
              )}
              <div className="flex shrink-0 overflow-hidden rounded-full bg-stone-800">
                {VIEW_MODES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => chooseView(v.value)}
                    aria-label={v.label}
                    title={v.label}
                    aria-pressed={view === v.value}
                    className={`inline-flex h-8 items-center px-2.5 text-sm transition sm:h-7 ${
                      view === v.value ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-700'
                    }`}
                  >
                    <v.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </>
          }
          quickFilters={null}
          chips={
            <>
              <FilterChip label="Estoque" icon={WarningIcon} active={!!filters.stock} open={panel.isOpen('stock')} onClick={() => panel.toggle('stock')} />
              <FilterChip label="Loja online" icon={GlobeIcon} active={!!filters.published} open={panel.isOpen('published')} onClick={() => panel.toggle('published')} />
              <FilterChip label="Espécie" icon={SpecimenIcon} active={filters.species.length > 0} open={panel.isOpen('species')} onClick={() => panel.toggle('species')} />
              <FilterChip label="País" icon={GlobeIcon} active={filters.countries.length > 0} open={panel.isOpen('country')} onClick={() => panel.toggle('country')} />
              <FilterChip label="Preço" icon={TagIcon} active={filters.priceMin != null || filters.priceMax != null} open={panel.isOpen('price')} onClick={() => panel.toggle('price')} />
              <FilterChip label="Tamanho" icon={GridViewIcon} active={filters.sizes.length > 0} open={panel.isOpen('size')} onClick={() => panel.toggle('size')} />
              <FilterChip label="Lote" icon={CopyIcon} active={!!filters.lot} open={panel.isOpen('lot')} onClick={() => panel.toggle('lot')} />
              {supplierChoices.some(([k]) => k) && (
                <FilterChip label="Fornecedor" icon={TruckIcon} active={filters.suppliers.length > 0} open={panel.isOpen('supplier')} onClick={() => panel.toggle('supplier')} />
              )}
            </>
          }
          sections={
            <>
              {panel.isOpen('stock') && (
                <FilterSection title="Estoque">
                  <PillGroup<StockFilter>
                    value={filters.stock}
                    onChange={(v) => setParam('estoque', v)}
                    options={[
                      ['in', 'Em estoque'],
                      ['out', 'Sem estoque'],
                      ['low', 'Estoque baixo'],
                    ]}
                  />
                </FilterSection>
              )}
              {panel.isOpen('published') && (
                <FilterSection title="Loja online">
                  <PillGroup<PublishedFilter>
                    value={filters.published}
                    onChange={(v) => setParam('publicado', v)}
                    options={[
                      ['yes', 'Publicados'],
                      ['no', 'Não publicados'],
                    ]}
                  />
                </FilterSection>
              )}
              {panel.isOpen('lot') && (
                <FilterSection title="Lote">
                  <PillGroup<LotFilter>
                    value={filters.lot}
                    onChange={(v) => setParam('lote', v)}
                    options={[
                      ['lot', 'Lotes'],
                      ['piece', 'Peças de lote'],
                      ['single', 'Itens avulsos'],
                    ]}
                  />
                </FilterSection>
              )}
              {panel.isOpen('species') && (
                <FilterSection title="Espécie">
                  <CountedPills
                    choices={speciesChoices}
                    selected={filters.species}
                    label={(k) => k || 'Sem espécie'}
                    onToggle={(k) => toggleIn('especie', filters.species, k)}
                  />
                </FilterSection>
              )}
              {panel.isOpen('country') && (
                <FilterSection title="País de origem">
                  <CountedPills
                    choices={countryChoices}
                    selected={filters.countries}
                    label={(k) => (k ? countryName(k) : 'Sem país')}
                    onToggle={(k) => toggleIn('pais', filters.countries, k)}
                  />
                </FilterSection>
              )}
              {panel.isOpen('size') && (
                <FilterSection title="Classe de tamanho">
                  <CountedPills
                    choices={SIZE_CLASS_VALUES.map((c) => [c, sizeChoices.find(([k]) => k === c)?.[1] ?? 0] as [string, number]).filter(([, n]) => n > 0)}
                    selected={filters.sizes}
                    label={(k) => SIZE_CLASS_LABELS[k as SizeClass] ?? k}
                    onToggle={(k) => toggleIn('tamanho', filters.sizes, k)}
                  />
                </FilterSection>
              )}
              {panel.isOpen('supplier') && (
                <FilterSection title="Fornecedor">
                  <CountedPills
                    choices={supplierChoices.filter(([k]) => k)}
                    selected={filters.suppliers}
                    label={(k) => supplierNames.get(k) ?? 'Fornecedor removido'}
                    onToggle={(k) => toggleIn('fornecedor', filters.suppliers, k)}
                  />
                </FilterSection>
              )}
              {panel.isOpen('price') && (
                <FilterSection title="Preço de venda (R$)">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriceInput label="Mínimo" value={filters.priceMin} onCommit={(v) => setParam('min', v)} />
                    <span className="text-stone-500">até</span>
                    <PriceInput label="Máximo" value={filters.priceMax} onCommit={(v) => setParam('max', v)} />
                  </div>
                </FilterSection>
              )}
            </>
          }
        />
      </div>

      {loading && <p className="py-12 text-center text-stone-500">Carregando…</p>}
      {error && <p className="py-12 text-center text-red-400">{error}</p>}

      {!loading && !error && visible.length === 0 && (
        <EmptyState
          icon={SpecimenIcon}
          title={products.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
          description={products.length === 0 ? 'Cadastre o primeiro produto ou importe itens da coleção pessoal.' : 'Ajuste a busca ou os filtros.'}
        />
      )}

      {visible.length > 0 && !isList && (
        <div className={GRID_CLASSES[view]}>
          {visible.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              coverUrl={coverUrls[p.id]}
              selection={sel.selecting ? { selected: sel.selected.has(p.id), onToggle: () => sel.toggle(p.id) } : undefined}
              onLongPress={() => sel.start(p.id)}
            />
          ))}
        </div>
      )}

      {visible.length > 0 && showSheet && (
        <ProductSheet
          rows={visible}
          columns={columns}
          onColumnsChange={(c) => {
            setColumns(c)
            saveColumns(c)
          }}
          widths={widths}
          onWidthsChange={(w, persist) => {
            setWidths(w)
            if (persist) saveWidths(w)
          }}
          frozen={frozen}
          gridMode={gridMode}
          ctx={ctx}
          coverUrls={coverUrls}
          sort={columnSort}
          onSortChange={setColumnSort}
          rowSelection={
            sel.selecting
              ? { active: true, selected: sel.selected, toggle: sel.toggle, setAll: (ids) => (ids.length ? sel.selectAll(ids) : sel.clear()) }
              : null
          }
          onOpen={(id) => navigate(`/produtos/${id}`)}
          findOpen={findOpen}
          onFindOpenChange={setFindOpen}
        />
      )}

      {visible.length > 0 && isList && isMobile && (
        <ul className="divide-y divide-stone-800 overflow-hidden rounded-lg border border-stone-800">
          {visible.map((p) => (
            <MobileRow
              key={p.id}
              product={p}
              coverUrl={coverUrls[p.id]}
              selected={sel.selecting ? sel.selected.has(p.id) : undefined}
              onClick={() => (sel.selecting ? sel.toggle(p.id) : navigate(`/produtos/${p.id}`))}
            />
          ))}
        </ul>
      )}

      {sel.selecting && (
        // `sticky` dentro do <main> (que é quem rola): a barra fica no rodapé da área de conteúdo.
        <div className="sticky bottom-2 z-30 mt-4">
          <BulkSelectionBar
            count={sel.selected.size}
            actions={bulkActions}
            onClear={sel.clear}
            onCancel={sel.cancel}
            selectAll={sel.selected.size < visible.length ? { label: 'Selecionar todos', onClick: () => sel.selectAll(visible.map((p) => p.id)) } : null}
            mobilePinned={['sale', 'labels', 'delete']}
          />
        </div>
      )}

      {pricing && (
        <BulkPriceDialog
          products={selectedProducts}
          onClose={() => setPricing(false)}
          onDone={() => {
            setPricing(false)
            toast.success('Preços atualizados.')
            sel.cancel()
          }}
        />
      )}
      {labelsFor && <LabelsDialog products={labelsFor} onClose={() => setLabelsFor(null)} />}
      {socialFor && <SocialCardDialog product={socialFor} coverUrl={coverUrls[socialFor.id]} onClose={() => setSocialFor(null)} />}
      {importing && <ImportFromCollectionDialog onCancel={() => setImporting(false)} onDone={() => setImporting(false)} />}
    </div>
  )
}

/** Contagem por chave, da mais frequente para a menos. */
function countBy(products: StoreProduct[], key: (p: StoreProduct) => string): [string, number][] {
  const m = new Map<string, number>()
  for (const p of products) m.set(key(p), (m.get(key(p)) ?? 0) + 1)
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
}

function PillGroup<T extends string>({ value, onChange, options }: { value: T | ''; onChange: (v: T | '') => void; options: [T, string][] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <FilterPill key={v} active={value === v} onClick={() => onChange(value === v ? '' : v)}>
          {label}
        </FilterPill>
      ))}
    </div>
  )
}

function CountedPills({
  choices,
  selected,
  label,
  onToggle,
}: {
  choices: [string, number][]
  selected: string[]
  label: (key: string) => string
  onToggle: (key: string) => void
}) {
  if (choices.length === 0) return <p className="text-xs text-stone-500">Nenhuma opção na lista atual.</p>
  return (
    <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
      {choices.map(([k, n]) => (
        <FilterPill key={k || '__none'} active={selected.includes(k)} onClick={() => onToggle(k)}>
          {label(k)}
          <span className="text-xs opacity-70">{n}</span>
        </FilterPill>
      ))}
    </div>
  )
}

function PriceInput({ label, value, onCommit }: { label: string; value: number | null; onCommit: (v: number | null) => void }) {
  const [text, setText] = useState(value == null ? '' : String(value))
  useEffect(() => setText(value == null ? '' : String(value)), [value])
  const commit = () => {
    const t = text.trim().replace(',', '.')
    const n = t === '' ? null : Number(t)
    onCommit(n != null && Number.isFinite(n) ? n : null)
  }
  return (
    <input
      inputMode="decimal"
      value={text}
      placeholder={label}
      aria-label={label}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      className="input min-h-9 w-32 py-1"
    />
  )
}

/** Linha da lista no celular — foto, nome, tipo/espécie, preço e estoque. */
function MobileRow({ product: p, coverUrl, selected, onClick }: { product: StoreProduct; coverUrl?: string; selected?: boolean; onClick: () => void }) {
  const out = p.stock_quantity <= 0
  const low = !out && p.min_stock != null && p.stock_quantity <= p.min_stock
  return (
    <li>
      <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-stone-900 ${selected ? 'bg-amber-950' : ''}`}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-stone-900">
          {coverUrl ? <img src={coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <PhotoIcon className="h-5 w-5 text-stone-700" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-stone-100">
            {p.lot_suffix && <span className="mr-1 font-mono text-xs text-amber-500">#{p.lot_suffix}</span>}
            {p.name}
          </span>
          <span className="block truncate text-xs text-stone-500">{[ITEM_KIND_LABELS[p.kind], speciesOf(p)].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="shrink-0 text-right text-xs">
          <span className="block text-stone-200">{formatMoney(p.sale_price)}</span>
          <span className={`inline-flex items-center gap-1 ${out ? 'text-red-400' : low ? 'text-amber-500' : 'text-stone-500'}`}>
            {low && <WarningIcon className="h-3 w-3" />}
            {p.stock_quantity} un.
          </span>
        </span>
      </button>
    </li>
  )
}

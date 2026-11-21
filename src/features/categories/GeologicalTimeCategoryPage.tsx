import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { GeologicalTime, StoreProduct } from '../../types/db'
import {
  fetchGeologicalTime,
  formatAgeRange,
  GEO_TIME_STALE_TIME,
  geoTimeName,
  geoTimeRangeIds,
  RANK_COLUMN,
  RANK_LABEL,
} from '../../lib/geologicalTime'
import { assignTimeRows } from '../../lib/geologicalTimeChart'
import { GeologicalTimeChart } from '../../components/GeologicalTimeChart'
import { useLocalToggle } from '../../lib/useLocalToggle'
import { ProductsPage } from '../products/ProductsPage'
import { useProducts } from '../products/queries'
import { Breadcrumb } from './Breadcrumb'
import { itemsLabel } from './CategoriesPage'

// "Escala de Tempo Geológica" — gráfico ICS inteiro numa página
// (/categorias/tempo-geologico); clicar num bloco em destaque abre os produtos
// daquela classificação ou de descendentes. Mesma tela do catálogo; o gráfico é
// o componente compartilhado (components/GeologicalTimeChart.tsx).

const ROOT = { label: 'Categorias', to: '/categorias' }
const TITLE = 'Escala de Tempo Geológica'
const EMPTY: StoreProduct[] = []

/** Produtos de cada nó, somados aos ancestrais (faixa início–fim incluída). */
function buildTimeItems(products: StoreProduct[], all: GeologicalTime[]): Map<string, StoreProduct[]> {
  const byId = new Set(all.map((n) => n.id))
  const items = new Map<string, StoreProduct[]>()
  for (const p of products) {
    if (p.kind !== 'fossil' || !p.geological_time_id) continue
    for (const id of geoTimeRangeIds(all, p.geological_time_id, p.geological_time_end_id)) {
      if (!byId.has(id)) continue
      if (!items.has(id)) items.set(id, [])
      items.get(id)!.push(p)
    }
  }
  return items
}

export function GeologicalTimeCategoryPage() {
  const { nodeId } = useParams<{ nodeId?: string }>()
  const { data, isLoading: loadingProducts } = useProducts()
  const { data: all, isLoading: loadingTime } = useQuery({ queryKey: ['geological-time'], queryFn: fetchGeologicalTime, staleTime: GEO_TIME_STALE_TIME })
  const products = data ?? EMPTY

  if (loadingProducts || loadingTime || !all) return <p className="py-12 text-center text-stone-500">Carregando…</p>
  return nodeId ? <TimeNodeView all={all} products={products} nodeId={nodeId} /> : <TimeScaleRootView all={all} products={products} />
}

function TogglePill({ label, title, active, onClick }: { label: string; title: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? 'border-amber-600 bg-amber-600/20 text-amber-300' : 'border-stone-700 bg-stone-800 text-stone-400 hover:bg-stone-700'
      }`}
    >
      {label}
    </button>
  )
}

function TimeScaleRootView({ all, products }: { all: GeologicalTime[]; products: StoreProduct[] }) {
  const navigate = useNavigate()
  const [showSubepoch, setShowSubepoch] = useLocalToggle('tt_loja_timescale_subepoch', true)
  const [showAndar, setShowAndar] = useLocalToggle('tt_loja_timescale_andar', true)
  const [horizontal, setHorizontal] = useLocalToggle('tt_loja_timescale_horizontal', false)
  const maxColumn = showAndar ? RANK_COLUMN.age : showSubepoch ? RANK_COLUMN.subepoch : RANK_COLUMN.epoch

  const { ranges, totalRows } = useMemo(() => assignTimeRows(all, maxColumn), [all, maxColumn])
  const itemsByNode = useMemo(() => buildTimeItems(products, all), [products, all])
  const countByNode = useMemo(() => new Map([...itemsByNode].map(([id, list]) => [id, list.length])), [itemsByNode])

  return (
    <div className={horizontal ? 'w-full space-y-4' : 'mx-auto w-full max-w-[96rem] space-y-4'}>
      <Breadcrumb items={[ROOT, { label: TITLE }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-stone-100">{TITLE}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <TogglePill
            label="Subépoca"
            title='Só existe no Cenozoico (ex.: "Mioceno Superior").'
            active={showSubepoch}
            onClick={() => {
              const v = !showSubepoch
              setShowSubepoch(v)
              if (!v) setShowAndar(false)
            }}
          />
          <TogglePill
            label="Estágio / Andar"
            title="Ao ocultar, a Idade (Ma) passa a mostrar a Subépoca, ou a Época se essa também estiver oculta."
            active={showAndar}
            onClick={() => {
              const v = !showAndar
              setShowAndar(v)
              if (v) setShowSubepoch(true)
            }}
          />
          <TogglePill
            label="Horizontal"
            title="Ranks nas linhas, tempo da esquerda para a direita."
            active={horizontal}
            onClick={() => setHorizontal(!horizontal)}
          />
        </div>
      </div>
      <p className="text-sm text-stone-500">Blocos em destaque têm ao menos um fóssil classificado. Selecione um bloco em destaque para ver os produtos.</p>
      <div className="rounded-xl border border-stone-800 bg-stone-900 p-2">
        <div className="overflow-x-auto">
          <GeologicalTimeChart<GeologicalTime>
            all={all}
            ranges={ranges}
            totalRows={totalRows}
            countByNode={countByNode}
            maxColumn={maxColumn}
            horizontal={horizontal}
            onNodeClick={(id) => navigate(`/categorias/tempo-geologico/${id}`)}
            nodeName={geoTimeName}
            rankLabels={RANK_LABEL}
            ageHeader="Idade (Ma)"
            formatAge={formatAgeRange}
          />
        </div>
      </div>
    </div>
  )
}

function TimeNodeView({ all, products, nodeId }: { all: GeologicalTime[]; products: StoreProduct[]; nodeId: string }) {
  const itemsByNode = useMemo(() => buildTimeItems(products, all), [products, all])
  const node = all.find((n) => n.id === nodeId)
  const items = itemsByNode.get(nodeId) ?? EMPTY
  if (!node) return <p className="py-12 text-center text-stone-500">Classificação não encontrada.</p>
  return (
    <ProductsPage
      scope={items}
      above={<Breadcrumb items={[ROOT, { label: TITLE, to: '/categorias/tempo-geologico' }, { label: geoTimeName(node) }]} />}
      title={
        <span className="inline-flex items-center gap-2">
          {geoTimeName(node)}
          <span className="text-sm font-normal text-stone-500">
            ({RANK_LABEL[node.rank]} · {formatAgeRange(node)}) · {itemsLabel(items.length)}
          </span>
        </span>
      }
      emptyMessage="Nenhum produto nesta classificação."
    />
  )
}

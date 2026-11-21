import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { StoreProduct } from '../../types/db'
import { CHEMICAL_ELEMENTS, elementName } from '../../data/chemicalElements'
import { parseChromophoreElements, parseFormulaElements } from '../../lib/chemicalFormula'
import { PeriodicTableControls, PeriodicTableGrid, type PeriodicTableLabels } from '../../components/PeriodicTable'
import { useLocalToggle } from '../../lib/useLocalToggle'
import { ProductsPage } from '../products/ProductsPage'
import { useProducts } from '../products/queries'
import { Breadcrumb } from './Breadcrumb'
import { itemsLabel } from './CategoriesPage'

// "Tabela Periódica" — elementos presentes nos minerais dos produtos (fórmula
// de cada mineral da amostra e, opcionalmente, o cromóforo). Mesma tela de
// `ChemistryCategoryPage.tsx` do catálogo; a grade é o componente compartilhado
// (components/PeriodicTable.tsx). Diferença: a fórmula vem do próprio mineral
// do produto (preenchido pelo Atlas Mineral), sem nova consulta ao catálogo.

const ROOT = { label: 'Categorias', to: '/categorias' }
const TITLE = 'Tabela Periódica'
const EMPTY: StoreProduct[] = []

const LABELS: PeriodicTableLabels = {
  title: TITLE,
  expand: 'Ampliar',
  fitToScreen: 'Ajustar à tela',
  fullscreen: 'Tela cheia',
  closeFullscreen: 'Fechar tela cheia',
  atomicNumber: 'Número atômico',
  noItems: 'Nenhum item',
  viewItems: 'Ver itens',
  close: 'Fechar',
  tapHint: 'Toque num elemento para ver os detalhes',
}

/** Minerais considerados: só os principais quando pedido (e o produto tiver algum marcado). */
function mineralsConsidered(p: StoreProduct, mainOnly: boolean) {
  const all = (p.minerals ?? []).filter((m) => m.name?.trim() || m.formula?.trim())
  if (!mainOnly) return all
  const main = all.filter((m) => m.is_main)
  return main.length > 0 ? main : all
}

function buildElementMap(products: StoreProduct[], includeChromophore: boolean, mainOnly: boolean): Map<string, StoreProduct[]> {
  const byElement = new Map<string, StoreProduct[]>()
  for (const p of products) {
    const elements = new Set<string>()
    for (const m of mineralsConsidered(p, mainOnly)) {
      for (const el of parseFormulaElements(m.formula)) elements.add(el)
      if (includeChromophore) for (const el of parseChromophoreElements(m.chromophore)) elements.add(el)
    }
    for (const el of elements) {
      const arr = byElement.get(el)
      if (arr) arr.push(p)
      else byElement.set(el, [p])
    }
  }
  return byElement
}

export function ChemistryCategoryPage() {
  const { symbol } = useParams<{ symbol?: string }>()
  const { data, isLoading } = useProducts()
  const products = data ?? EMPTY
  const [includeChromophore, setIncludeChromophore] = useState(true)
  const [mainOnly, setMainOnly] = useLocalToggle('tt_loja_main_minerals_only', false)
  const byElement = useMemo(() => buildElementMap(products, includeChromophore, mainOnly), [products, includeChromophore, mainOnly])

  if (isLoading) return <p className="py-12 text-center text-stone-500">Carregando…</p>

  if (symbol) {
    const items = byElement.get(symbol) ?? EMPTY
    const name = elementName(symbol, 'pt')
    return (
      <ProductsPage
        scope={items}
        above={<Breadcrumb items={[ROOT, { label: TITLE, to: '/categorias/quimica' }, { label: `${name} (${symbol})` }]} />}
        title={
          <span className="inline-flex items-center gap-2">
            {name} <span className="text-base font-normal text-stone-500">({symbol})</span>
            <span className="text-sm font-normal text-stone-500">({itemsLabel(items.length)})</span>
          </span>
        }
        emptyMessage="Nenhum produto com este elemento."
      />
    )
  }

  const countBySymbol = new Map([...byElement].map(([s, items]) => [s, items.length] as const))
  return (
    <div className="mx-auto w-full max-w-[96rem] space-y-4">
      <Breadcrumb items={[ROOT, { label: TITLE }]} />
      <h1 className="text-xl font-bold text-stone-100">
        {TITLE}{' '}
        <span className="text-sm font-normal text-stone-500">
          ({byElement.size}/{CHEMICAL_ELEMENTS.length})
        </span>
      </h1>
      <p className="text-sm text-stone-500">Os elementos em destaque estão em pelo menos um mineral dos produtos. Escolha um para ver os produtos.</p>
      <div className="flex flex-wrap items-center gap-2">
        <PeriodicTableControls labels={LABELS} />
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMainOnly(!mainOnly)}
            title="Considera só os minerais marcados como principais em cada item. Itens sem mineral principal indicado continuam contando por todos os seus minerais."
            aria-pressed={mainOnly}
            className={`rounded-full px-3 py-1 text-xs whitespace-nowrap transition ${
              mainOnly ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            Apenas principais
          </button>
          <button
            type="button"
            onClick={() => setIncludeChromophore(!includeChromophore)}
            title={
              includeChromophore
                ? 'Exclui elementos citados como cromóforo (causa da cor), mostrando só os presentes na fórmula química'
                : 'Inclui elementos citados como cromóforo (causa da cor), além dos presentes na fórmula química'
            }
            aria-pressed={includeChromophore}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition ${
              includeChromophore ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            {includeChromophore ? 'Excluir cromóforos' : 'Incluir cromóforos'}
          </button>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[92rem] rounded-xl border border-stone-800 bg-stone-900 p-3">
        <div className="overflow-x-auto p-1">
          <PeriodicTableGrid
            countBySymbol={countBySymbol}
            lang="pt"
            minColRem={3.25}
            itemLabelSingular="item"
            itemLabelPlural="itens"
            linkTo={(s) => `/categorias/quimica/${s}`}
            fullscreenTitle={TITLE}
            externalControls
            labels={LABELS}
          />
        </div>
      </div>
    </div>
  )
}

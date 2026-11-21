import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { StoreProduct } from '../../types/db'
import { countryName, flagUrl } from '../../lib/format'
import { fetchSubdivisions, subdivisionFlagUrl } from '../../lib/subdivisionReference'
import { ContinentMap } from '../../components/ContinentMap'
import { GeoTile } from '../../components/GeoTile'
import { Flag } from '../../components/Flag'
import { ProductsPage } from '../products/ProductsPage'
import { useProducts } from '../products/queries'
import { Breadcrumb } from './Breadcrumb'
import { buildGeoTree, CONTINENTS, COUNTRY_CONTINENT, countCountries, countryTotal, type ContinentKey, type GeoCountryNode } from './geoCategories'
import { itemsLabel } from './CategoriesPage'

// "Distribuição Geográfica" — raiz (mapa + continentes) → continente (países)
// → país (produtos daquele país, com filtro por estado). Mesma estrutura de
// `GeoCategoryPage.tsx` do catálogo; mapa e cartões são os componentes
// compartilhados (components/ContinentMap.tsx, components/GeoTile.tsx).

const ROOT = { label: 'Categorias', to: '/categorias' }
const GEO = { label: 'Distribuição Geográfica', to: '/categorias/localizacao' }
const EMPTY: StoreProduct[] = []

const MAP_LABELS = {
  loading: 'Carregando mapa…',
  ariaLabel: 'Mapa dos produtos por país',
  zoomIn: 'Aumentar zoom',
  zoomOut: 'Diminuir zoom',
  tapHint: 'Toque num país para ver os detalhes. Toque novamente para abrir.',
  open: 'Abrir',
  noItems: 'Nenhum item',
  itemSingular: 'item',
  itemPlural: 'itens',
  close: 'Fechar',
  fullscreen: 'Tela cheia',
  title: 'Mapa dos produtos',
  closeFullscreen: 'Fechar tela cheia',
}

export function GeoCategoryPage() {
  const { continent, country } = useParams<{ continent?: string; country?: string }>()
  const { data, isLoading } = useProducts()
  const products = data ?? EMPTY
  const tree = useMemo(() => buildGeoTree(products), [products])

  if (isLoading) return <p className="py-12 text-center text-stone-500">Carregando…</p>
  if (continent && country) {
    return <GeoCountryView key={country.toUpperCase()} continent={continent as ContinentKey} tree={tree} countryCode={country.toUpperCase()} />
  }
  if (continent) return <GeoContinentView continentKey={continent as ContinentKey} tree={tree} />
  return <GeoRootView tree={tree} />
}

function GeoRootView({ tree }: { tree: ReturnType<typeof buildGeoTree> }) {
  const navigate = useNavigate()
  const countryItemCounts = useMemo(() => new Map(tree.flatMap((c) => c.countries.map((cc) => [cc.code, cc.items.length] as const))), [tree])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <Breadcrumb items={[ROOT, { label: GEO.label }]} />
      <h1 className="text-xl font-bold text-stone-100">
        Distribuição Geográfica{' '}
        <span className="text-sm font-normal text-stone-500">
          ({countCountries(countryItemCounts.keys())}/{countryTotal()})
        </span>
      </h1>
      {tree.length === 0 ? (
        <p className="py-12 text-center text-stone-500">Nenhum produto com país de origem informado.</p>
      ) : (
        <>
          <ContinentMap
            countryItemCounts={countryItemCounts}
            labels={MAP_LABELS}
            onCountryClick={(code) => {
              const continent = COUNTRY_CONTINENT[code]
              if (continent) navigate(`/categorias/localizacao/${continent}/${code}`)
            }}
          />
          <div className="flex flex-wrap justify-center gap-3 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {tree.map((c) => (
              <div key={c.key} className="w-[calc((100%-1.5rem)/3)] sm:w-auto">
                <GeoTile to={`/categorias/localizacao/${c.key}`} imageSrc={c.icon} square label={c.label} countLabel={itemsLabel(c.itemCount)} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function GeoContinentView({ continentKey, tree }: { continentKey: ContinentKey; tree: ReturnType<typeof buildGeoTree> }) {
  const continent = tree.find((c) => c.key === continentKey) ?? CONTINENTS.find((c) => c.key === continentKey)
  const countries = tree.find((c) => c.key === continentKey)?.countries ?? []
  if (!continent) return <p className="py-12 text-center text-stone-500">Continente não encontrado.</p>

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <Breadcrumb items={[ROOT, GEO, { label: continent.label }]} />
      <h1 className="text-xl font-bold text-stone-100">
        {continent.label}{' '}
        <span className="text-sm font-normal text-stone-500">
          ({countCountries(countries.map((c) => c.code))}/{countryTotal(continentKey)})
        </span>
      </h1>
      {countries.length === 0 ? (
        <p className="py-12 text-center text-stone-500">Nenhum produto deste continente.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {countries.map((c) => (
            <GeoTile
              key={c.code}
              to={`/categorias/localizacao/${continentKey}/${c.code}`}
              imageSrc={flagUrl(c.code) ?? ''}
              countryCode={c.code}
              label={countryName(c.code).replace(/\bRepública\b/, 'Rep.')}
              countLabel={itemsLabel(c.items.length)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GeoCountryView({ continent, tree, countryCode }: { continent: ContinentKey; tree: ReturnType<typeof buildGeoTree>; countryCode: string }) {
  const continentNode = tree.find((c) => c.key === continent) ?? CONTINENTS.find((c) => c.key === continent)
  const countryNode: GeoCountryNode | undefined = tree.find((c) => c.key === continent)?.countries.find((c) => c.code === countryCode)
  const items = countryNode?.items ?? EMPTY

  // Estado/província (ISO 3166-2 gravado em `origin_state`): filtro por chip, só com 2 ou mais estados.
  const itemsByState = useMemo(() => {
    const map = new Map<string, StoreProduct[]>()
    for (const p of items) {
      if (!p.origin_state) continue
      const arr = map.get(p.origin_state)
      if (arr) arr.push(p)
      else map.set(p.origin_state, [p])
    }
    return map
  }, [items])
  const { data: subdivisions = [] } = useQuery({
    queryKey: ['subdivisions', countryCode],
    queryFn: () => fetchSubdivisions(countryCode),
    staleTime: Infinity,
  })
  const stateChips = useMemo(
    () =>
      [...itemsByState.entries()]
        .map(([iso, its]) => {
          const option = subdivisions.find((o) => o.isoCode === iso)
          return { iso, label: option?.name ?? iso, flag: subdivisionFlagUrl(option?.flagFile), count: its.length }
        })
        .sort((a, b) => b.count - a.count),
    [itemsByState, subdivisions],
  )
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const scoped = selectedState ? (itemsByState.get(selectedState) ?? EMPTY) : items

  if (!continentNode) return <p className="py-12 text-center text-stone-500">Continente não encontrado.</p>

  return (
    <ProductsPage
      scope={scoped}
      above={
        <>
          <Breadcrumb items={[ROOT, GEO, { label: continentNode.label, to: `/categorias/localizacao/${continent}` }, { label: countryName(countryCode) }]} />
          {stateChips.length >= 2 && (
            <div className="flex flex-wrap gap-1.5">
              {stateChips.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => setSelectedState((cur) => (cur === c.iso ? null : c.iso))}
                  aria-pressed={selectedState === c.iso}
                  className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs whitespace-nowrap transition ${
                    selectedState === c.iso ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {c.flag && <img src={c.flag} alt="" className="mr-1 h-3 w-auto rounded-[2px]" />}
                  {c.label} <span className={`ml-1 ${selectedState === c.iso ? 'text-amber-100' : 'opacity-70'}`}>({c.count})</span>
                </button>
              ))}
            </div>
          )}
        </>
      }
      title={
        <span className="inline-flex items-center gap-2">
          <Flag code={countryCode} className="h-5 w-7 rounded" />
          {countryName(countryCode)} <span className="text-sm font-normal text-stone-500">({itemsLabel(items.length)})</span>
        </span>
      }
      emptyMessage="Nenhum produto deste país."
    />
  )
}

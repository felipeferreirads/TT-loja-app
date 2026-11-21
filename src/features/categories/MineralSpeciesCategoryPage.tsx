import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { StoreProduct } from '../../types/db'
import { supabase } from '../../lib/supabase'
import { useLocalToggle } from '../../lib/useLocalToggle'
import { CategoryIcon, GridDenseIcon, GridLargeIcon, GridViewIcon, ListViewIcon } from '../../components/icons'
import { ProductsPage } from '../products/ProductsPage'
import { useCoverUrls, useProducts } from '../products/queries'
import { Breadcrumb } from './Breadcrumb'
import { derivedCoverUrl, itemsLabel } from './CategoriesPage'

// "Espécie Mineral" — uma entrada por espécie/variedade presente nos minerais
// dos produtos (`store_product_minerals`), com a opção de agrupar as
// variedades na espécie-mãe (Atlas Mineral, `minerals_reference`). Mesma tela
// de `MineralSpeciesCategoryPage.tsx` do catálogo (pílulas, lista ou grade em
// 3 tamanhos, busca); a capa é a foto do primeiro produto da espécie.

const ROOT = { label: 'Categorias', to: '/categorias' }
const TITLE = 'Espécie Mineral'
const EMPTY: StoreProduct[] = []
const EMPTY_COVERS: Record<string, string> = {}

type DisplayMode = 'list' | 'sm' | 'md' | 'lg'
const DISPLAY_MODES: { value: DisplayMode; icon: (props: { className?: string }) => React.ReactElement; label: string }[] = [
  { value: 'list', icon: ListViewIcon, label: 'Lista' },
  { value: 'sm', icon: GridDenseIcon, label: 'Grade pequena' },
  { value: 'md', icon: GridViewIcon, label: 'Grade média' },
  { value: 'lg', icon: GridLargeIcon, label: 'Grade grande' },
]
const GRID_SIZE_CLASSES: Record<Exclude<DisplayMode, 'list'>, string> = {
  sm: 'grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8',
  md: 'grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  lg: 'grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}
const MODE_KEY = 'tt_loja_mineral_species_view'

interface SpeciesNode {
  key: string
  label: string
  items: StoreProduct[]
}

interface RefRow {
  id: string
  kind: string
  parent_id: string | null
  name_pt: string | null
  name_en: string
}

const normKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** Linhas do Atlas Mineral dos minerais em uso + as espécies-mãe das variedades. */
async function fetchReferenceRows(ids: string[]): Promise<Map<string, RefRow>> {
  const map = new Map<string, RefRow>()
  const load = async (list: string[]) => {
    for (let i = 0; i < list.length; i += 150) {
      const { data, error } = await supabase.from('minerals_reference').select('id, kind, parent_id, name_pt, name_en').in('id', list.slice(i, i + 150))
      if (error) throw new Error(`Não foi possível carregar o Atlas Mineral: ${error.message}`)
      for (const r of data as RefRow[]) map.set(r.id, r)
    }
  }
  await load(ids)
  const parents = [...new Set([...map.values()].map((r) => r.parent_id).filter((id): id is string => !!id && !map.has(id)))]
  if (parents.length > 0) await load(parents)
  return map
}

function buildSpeciesTree(products: StoreProduct[], refs: Map<string, RefRow> | undefined, collapseVarieties: boolean, mainOnly: boolean, sortAlpha: boolean): SpeciesNode[] {
  const byKey = new Map<string, SpeciesNode>()
  for (const p of products) {
    const all = (p.minerals ?? []).filter((m) => m.name?.trim())
    const main = all.filter((m) => m.is_main)
    const considered = mainOnly && main.length > 0 ? main : all
    const seen = new Set<string>()
    for (const m of considered) {
      let ref = m.mineral_reference_id ? refs?.get(m.mineral_reference_id) : undefined
      if (collapseVarieties && ref?.kind === 'variety' && ref.parent_id) ref = refs?.get(ref.parent_id) ?? ref
      const label = ref ? ref.name_pt || ref.name_en : m.name!.trim()
      const key = ref ? ref.id : `n:${normKey(label)}`
      if (seen.has(key)) continue
      seen.add(key)
      const node = byKey.get(key)
      if (node) node.items.push(p)
      else byKey.set(key, { key, label, items: [p] })
    }
  }
  const nodes = [...byKey.values()]
  return sortAlpha
    ? nodes.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    : nodes.sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label, 'pt-BR'))
}

function OptionChip({ active, onClick, label, title }: { active: boolean; onClick: () => void; label: string; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs whitespace-nowrap transition ${active ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}
    >
      {label}
    </button>
  )
}

export function MineralSpeciesCategoryPage() {
  const { key } = useParams<{ key?: string }>()
  const { data, isLoading } = useProducts()
  const products = data ?? EMPTY
  const coverUrls = useCoverUrls().data ?? EMPTY_COVERS
  const [collapseVarieties, setCollapseVarieties] = useLocalToggle('tt_loja_species_collapse', false)
  const [mainOnly, setMainOnly] = useLocalToggle('tt_loja_main_minerals_only', false)
  const [sortAlpha, setSortAlpha] = useLocalToggle('tt_loja_species_alpha', false)

  const refIds = useMemo(
    () => [...new Set(products.flatMap((p) => (p.minerals ?? []).map((m) => m.mineral_reference_id).filter((id): id is string => !!id)))].sort(),
    [products],
  )
  const { data: refs, isLoading: loadingRefs } = useQuery({
    queryKey: ['loja-species-refs', refIds],
    queryFn: () => fetchReferenceRows(refIds),
    enabled: refIds.length > 0,
    staleTime: 60 * 60_000,
  })
  const tree = useMemo(() => buildSpeciesTree(products, refs, collapseVarieties, mainOnly, sortAlpha), [products, refs, collapseVarieties, mainOnly, sortAlpha])

  if (isLoading || (refIds.length > 0 && loadingRefs)) return <p className="py-12 text-center text-stone-500">Carregando…</p>

  if (key) {
    const node = tree.find((n) => n.key === key)
    if (!node) return <p className="py-12 text-center text-stone-500">Espécie não encontrada.</p>
    return (
      <ProductsPage
        scope={node.items}
        above={<Breadcrumb items={[ROOT, { label: TITLE, to: '/categorias/especie-mineral' }, { label: node.label }]} />}
        title={
          <span className="inline-flex items-center gap-2">
            {node.label} <span className="text-sm font-normal text-stone-500">({itemsLabel(node.items.length)})</span>
          </span>
        }
        emptyMessage="Nenhum produto desta espécie."
      />
    )
  }

  return (
    <SpeciesRootView
      tree={tree}
      coverUrls={coverUrls}
      chips={[
        {
          active: collapseVarieties,
          onClick: () => setCollapseVarieties(!collapseVarieties),
          label: collapseVarieties ? 'Desagrupar variedades' : 'Agrupar variedades',
          title: collapseVarieties ? 'Desagrupar variedades da espécie-mãe' : 'Agrupar variedades na espécie-mãe',
        },
        {
          active: mainOnly,
          onClick: () => setMainOnly(!mainOnly),
          label: 'Apenas principais',
          title: 'Considera só os minerais marcados como principais em cada item. Itens sem mineral principal indicado continuam contando por todos os seus minerais.',
        },
        { active: sortAlpha, onClick: () => setSortAlpha(!sortAlpha), label: 'A → Z', title: 'Ordenar em ordem alfabética' },
      ]}
    />
  )
}

function SpeciesRootView({
  tree,
  coverUrls,
  chips,
}: {
  tree: SpeciesNode[]
  coverUrls: Record<string, string>
  chips: { active: boolean; onClick: () => void; label: string; title: string }[]
}) {
  const [search, setSearch] = useState('')
  const [mode, setModeState] = useState<DisplayMode>(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY) as DisplayMode | null
      return saved && DISPLAY_MODES.some((m) => m.value === saved) ? saved : 'md'
    } catch {
      return 'md'
    }
  })
  const setMode = (m: DisplayMode) => {
    setModeState(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      /* só não persiste */
    }
  }
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? tree.filter((n) => n.label.toLowerCase().includes(q)) : tree
  }, [tree, search])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <Breadcrumb items={[ROOT, { label: TITLE }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-100">
          {TITLE} <span className="text-sm font-normal text-stone-500">({tree.length})</span>
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <OptionChip key={c.label} {...c} />
          ))}
          <div className="flex shrink-0 overflow-hidden rounded-full bg-stone-800">
            {DISPLAY_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                title={m.label}
                aria-label={m.label}
                aria-pressed={mode === m.value}
                className={`inline-flex min-h-11 items-center px-2.5 text-sm transition sm:h-7 sm:min-h-0 sm:py-0 ${
                  mode === m.value ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-700'
                }`}
              >
                <m.icon />
              </button>
            ))}
          </div>
        </div>
      </div>

      <input type="search" placeholder="Buscar espécie pelo nome…" value={search} onChange={(e) => setSearch(e.target.value)} className="input" />

      {tree.length === 0 ? (
        <p className="py-12 text-center text-stone-500">Nenhum produto com mineral identificado.</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-stone-500">Nenhuma espécie encontrada com esse filtro.</p>
      ) : mode === 'list' ? (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))' }}>
          {filtered.map((node) => (
            <Link
              key={node.key}
              to={`/categorias/especie-mineral/${node.key}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-stone-900 px-3 py-2 transition hover:bg-stone-800"
            >
              <span className="truncate text-sm font-medium text-stone-100">{node.label}</span>
              <span className="shrink-0 text-xs text-stone-500">{itemsLabel(node.items.length)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className={`grid ${GRID_SIZE_CLASSES[mode]}`}>
          {filtered.map((node) => {
            const url = derivedCoverUrl(node.items, coverUrls, null)
            return (
              <Link
                key={node.key}
                to={`/categorias/especie-mineral/${node.key}`}
                className="block overflow-hidden rounded-xl bg-stone-900 transition hover:bg-stone-800"
              >
                <div className="aspect-square bg-stone-800">
                  {url ? (
                    <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl opacity-40">
                      <CategoryIcon />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="leading-snug font-bold break-words text-stone-100">{node.label}</p>
                  <p className="text-xs text-stone-500">{itemsLabel(node.items.length)}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

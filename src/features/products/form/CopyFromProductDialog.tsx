import { useMemo, useState } from 'react'
import { ITEM_KIND_LABELS, type StoreProduct } from '../../../types/db'
import { stripAccents } from '../../../lib/format'
import { useCoverUrls, useProducts } from '../queries'
import { fetchFossilSpecies } from '../api'
import { CheckIcon, CloseIcon, PhotoIcon, SearchIcon } from '../../../components/icons'
import { speciesOf } from '../list/columns'
import { toDraft, type Draft } from './draft'
import { mineralRowToDraft, type MineralRowDraft } from './MineralsInSampleSection'
import { rockRowToDraft, type RockRowDraft } from './rockFields'
import { fossilSpeciesToDraft, type FossilSpeciesDraft } from './FossilTaxonomySection'

/**
 * Copiar de outro produto — mesmo papel do "Copiar de outro item" do
 * catálogo pessoal (`CopyFromSpecimenDialog.tsx`): escolher um produto e os
 * grupos de campos; os valores entram no formulário (nada é gravado até o
 * "Salvar"). Nome, SKU, estoque e lote nunca são copiados — identificam a peça.
 */

interface CopyGroup {
  key: string
  label: string
  fields: string[]
}

const GROUPS: CopyGroup[] = [
  { key: 'kind', label: 'Tipo de item', fields: ['kind'] },
  { key: 'prices', label: 'Preços (venda e custo)', fields: ['sale_price', 'cost_price', 'min_stock'] },
  { key: 'origin', label: 'Localidade (país, estado e origem)', fields: ['origin', 'origin_country', 'origin_state', 'origin_short'] },
  { key: 'physical', label: 'Peso, dimensões e tamanho', fields: ['weight_g', 'weight_ct', 'dimensions', 'size_class'] },
  {
    key: 'appearance',
    label: 'Cor e propriedades especiais',
    fields: ['color', 'color_secondary', 'special_properties', 'uv_color', 'phosphorescence_color', 'iridescence_color', 'play_of_color'],
  },
  { key: 'crystal', label: 'Características cristalográficas', fields: ['crystal_features'] },
  { key: 'treatment', label: 'Tratamento', fields: ['treatment'] },
  { key: 'gem', label: 'Lapidação (gema)', fields: ['is_gem', 'cut_type', 'gem_shape', 'gem_cut_style', 'cut_name'] },
  { key: 'fossil', label: 'Restauração e matriz do fóssil', fields: ['fossil_restoration', 'fossil_host_rock'] },
  {
    key: 'meteorite',
    label: 'Classificação do meteorito',
    fields: [
      'met_category', 'met_class', 'met_group', 'met_type', 'met_structure', 'met_material', 'met_shock', 'met_weathering',
      'met_age', 'met_fall_observed', 'met_fall_date', 'met_found_date', 'met_total_mass', 'met_parent_body',
    ],
  },
  { key: 'jewelry', label: 'Dados da joia', fields: ['jwl_material', 'jwl_stone', 'jwl_size', 'jwl_clasp', 'jwl_finish', 'jwl_adjustable'] },
  { key: 'supplier', label: 'Fornecedor, código e data de aquisição', fields: ['supplier_id', 'supplier_code', 'acquisition_date'] },
  {
    key: 'ecommerce',
    label: 'Loja online (categoria, tags, frete, embalagem)',
    fields: [
      'ecommerce_category_path', 'ecommerce_google_category', 'ecommerce_tags', 'ecommerce_free_shipping', 'ecommerce_published',
      'ecommerce_package_height_cm', 'ecommerce_package_width_cm', 'ecommerce_package_length_cm',
    ],
  },
  { key: 'fiscal', label: 'Dados fiscais (origem, tipo, NCM, CEST)', fields: ['tax_origin', 'fiscal_type', 'ncm', 'cest'] },
  { key: 'notes', label: 'Observações', fields: ['notes'] },
]
const LIST_GROUPS = [
  { key: 'minerals', label: 'Minerais da amostra' },
  { key: 'rocks', label: 'Rochas da amostra' },
  { key: 'fossilSpecies', label: 'Espécies e taxonomia do fóssil' },
] as const
type ListGroupKey = (typeof LIST_GROUPS)[number]['key']

const DEFAULT_ON = new Set(['origin', 'physical', 'appearance', 'crystal', 'treatment', 'gem', 'fossil', 'meteorite', 'jewelry', 'ecommerce', 'fiscal', 'minerals', 'rocks', 'fossilSpecies'])

export interface CopyResult {
  values: Draft
  minerals?: MineralRowDraft[]
  rocks?: RockRowDraft[]
  fossilSpecies?: FossilSpeciesDraft[]
}

/** Linha copiada vira linha NOVA (sem id/key do produto de origem). */
const fresh = <T extends { key: string; id?: string }>(row: T): T => ({ ...row, id: undefined, key: crypto.randomUUID() })

export function CopyFromProductDialog({
  currentId,
  onApply,
  onClose,
}: {
  currentId: string | null
  onApply: (result: CopyResult) => void
  onClose: () => void
}) {
  const products = useProducts().data ?? []
  const covers = useCoverUrls().data ?? {}
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<StoreProduct | null>(null)
  const [groups, setGroups] = useState<Set<string>>(() => new Set(DEFAULT_ON))
  const [busy, setBusy] = useState(false)

  const results = useMemo(() => {
    const q = stripAccents(query.trim())
    return products
      .filter((p) => p.id !== currentId)
      .filter((p) => !q || [p.name, p.sku, speciesOf(p), p.origin].some((v) => v && stripAccents(v).includes(q)))
      .slice(0, 50)
  }, [products, query, currentId])

  const toggle = (k: string) =>
    setGroups((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  // Só oferece os grupos que o produto de origem tem preenchidos.
  const sourceDraft = useMemo(() => (source ? toDraft(source) : null), [source])
  const available = (g: CopyGroup) => !!sourceDraft && g.fields.some((f) => (sourceDraft[f] ?? '') !== '' && sourceDraft[f] !== 'false')
  const listAvailable = (k: ListGroupKey) =>
    !!source && (k === 'minerals' ? (source.minerals?.length ?? 0) > 0 : k === 'rocks' ? (source.rocks?.length ?? 0) > 0 : source.kind === 'fossil')

  const apply = async () => {
    if (!source || !sourceDraft) return
    setBusy(true)
    try {
      const values: Draft = {}
      for (const g of GROUPS) {
        if (!groups.has(g.key) || !available(g)) continue
        for (const f of g.fields) values[f] = sourceDraft[f] ?? ''
      }
      const result: CopyResult = { values }
      if (groups.has('minerals') && listAvailable('minerals')) result.minerals = (source.minerals ?? []).map(mineralRowToDraft).map(fresh)
      if (groups.has('rocks') && listAvailable('rocks')) result.rocks = (source.rocks ?? []).map(rockRowToDraft).map(fresh)
      if (groups.has('fossilSpecies') && listAvailable('fossilSpecies')) {
        const rows = await fetchFossilSpecies(source.id)
        if (rows.length > 0) result.fossilSpecies = rows.map(fossilSpeciesToDraft).map(fresh)
      }
      onApply(result)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-title"
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-xl bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-800 p-5 pb-4">
          <div>
            <h2 id="copy-title" className="text-lg font-bold text-stone-100">
              Copiar de outro produto
            </h2>
            <p className="mt-1 text-xs text-stone-500">Os campos escolhidos substituem os do formulário. Nada é gravado até salvar.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="tap-icon text-stone-400 hover:text-stone-200">
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!source ? (
            <div className="space-y-3">
              <label className="relative block">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-500" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome, SKU, espécie ou localidade"
                  className="input pl-9"
                />
              </label>
              <ul className="divide-y divide-stone-800 overflow-hidden rounded-lg border border-stone-800">
                {results.length === 0 && <li className="px-3 py-4 text-center text-sm text-stone-500">Nenhum produto encontrado.</li>}
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setSource(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-stone-800">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-stone-950">
                        {covers[p.id] ? <img src={covers[p.id]} alt="" className="h-full w-full object-cover" /> : <PhotoIcon className="text-stone-700" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-stone-100">{p.name}</span>
                        <span className="block truncate text-xs text-stone-500">
                          {[ITEM_KIND_LABELS[p.kind], speciesOf(p), p.sku].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 rounded-lg bg-stone-950 px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-stone-200">{source.name}</span>
                <button type="button" onClick={() => setSource(null)} className="shrink-0 text-xs text-amber-500 hover:underline">
                  Trocar produto
                </button>
              </div>
              <p className="text-xs font-medium text-stone-400">Campos a copiar</p>
              <div className="space-y-1">
                {[...GROUPS.map((g) => ({ key: g.key, label: g.label, ok: available(g) })), ...LIST_GROUPS.map((g) => ({ key: g.key, label: g.label, ok: listAvailable(g.key) }))]
                  .filter((g) => g.ok)
                  .map((g) => {
                    const checked = groups.has(g.key)
                    return (
                      <button
                        key={g.key}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => toggle(g.key)}
                        className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm text-stone-200 transition hover:bg-stone-800"
                      >
                        <span
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                            checked ? 'border-amber-500 bg-amber-600 text-white' : 'border-stone-600 text-transparent'
                          }`}
                        >
                          <CheckIcon />
                        </span>
                        {g.label}
                      </button>
                    )
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-800 p-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={() => void apply()} disabled={!source || busy} className="btn-primary">
            {busy ? 'Copiando…' : 'Copiar campos'}
          </button>
        </div>
      </div>
    </div>
  )
}

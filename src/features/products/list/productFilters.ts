// Filtros da lista de Produtos — estado na query string (sobrevive ao "voltar"
// depois de abrir um produto, mesmo padrão da Coleção). Cada filtro é uma
// seção do painel (ListToolbar); o tipo continua nos chips da barra.

import type { SizeClass, StoreItemKind, StoreProduct } from '../../../types/db'
import { stripAccents } from '../../../lib/format'
import { effectiveSizeClass } from '../sizeClass'
import { marginPct, speciesOf } from './columns'

export type StockFilter = '' | 'in' | 'out' | 'low'
export type PublishedFilter = '' | 'yes' | 'no'
export type LotFilter = '' | 'lot' | 'piece' | 'single'

export interface ProductFilters {
  search: string
  kind: StoreItemKind | null
  stock: StockFilter
  published: PublishedFilter
  lot: LotFilter
  species: string[]
  countries: string[]
  sizes: SizeClass[]
  suppliers: string[]
  priceMin: number | null
  priceMax: number | null
}

const list = (v: string | null) => (v ? v.split('|').filter(Boolean) : [])
const numOrNull = (v: string | null) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)

export function readFilters(params: URLSearchParams): ProductFilters {
  // `baixo=1` é o link antigo ("Estoque baixo"), usado pelo Início.
  const stock = (params.get('estoque') as StockFilter | null) ?? (params.get('baixo') === '1' ? 'low' : '')
  return {
    search: params.get('q') ?? '',
    kind: params.get('tipo') as StoreItemKind | null,
    stock,
    published: (params.get('publicado') as PublishedFilter | null) ?? '',
    lot: (params.get('lote') as LotFilter | null) ?? '',
    species: list(params.get('especie')),
    countries: list(params.get('pais')),
    sizes: list(params.get('tamanho')) as SizeClass[],
    suppliers: list(params.get('fornecedor')),
    priceMin: numOrNull(params.get('min')),
    priceMax: numOrNull(params.get('max')),
  }
}

/** Grava um filtro na query string (valor vazio/lista vazia remove o parâmetro). */
export function writeParam(params: URLSearchParams, key: string, value: string | string[] | number | null): URLSearchParams {
  const next = new URLSearchParams(params)
  if (key === 'estoque') next.delete('baixo')
  const text = Array.isArray(value) ? value.join('|') : value == null ? '' : String(value)
  if (text) next.set(key, text)
  else next.delete(key)
  return next
}

export const FILTER_PARAM_KEYS = ['estoque', 'baixo', 'publicado', 'lote', 'especie', 'pais', 'tamanho', 'fornecedor', 'min', 'max']

/** Quantos filtros do painel estão ativos (o tipo e a busca ficam de fora, como na Coleção). */
export function countActive(f: ProductFilters): number {
  return [
    f.stock !== '',
    f.published !== '',
    f.lot !== '',
    f.species.length > 0,
    f.countries.length > 0,
    f.sizes.length > 0,
    f.suppliers.length > 0,
    f.priceMin != null || f.priceMax != null,
  ].filter(Boolean).length
}

export function matchesFilters(p: StoreProduct, f: ProductFilters, supplierNames: Map<string, string>): boolean {
  if (f.kind && p.kind !== f.kind) return false
  if (f.stock === 'in' && p.stock_quantity <= 0) return false
  if (f.stock === 'out' && p.stock_quantity > 0) return false
  if (f.stock === 'low' && !(p.min_stock != null && p.stock_quantity <= p.min_stock)) return false
  if (f.published === 'yes' && !p.ecommerce_published) return false
  if (f.published === 'no' && p.ecommerce_published) return false
  if (f.lot === 'lot' && !p.is_lot) return false
  if (f.lot === 'piece' && !p.parent_id) return false
  if (f.lot === 'single' && (p.is_lot || p.parent_id)) return false
  if (f.species.length > 0 && !f.species.includes(speciesOf(p))) return false
  if (f.countries.length > 0 && !f.countries.includes(p.origin_country ?? '')) return false
  if (f.sizes.length > 0) {
    const c = effectiveSizeClass(p)
    if (!c || !f.sizes.includes(c)) return false
  }
  if (f.suppliers.length > 0 && !f.suppliers.includes(p.supplier_id ?? '')) return false
  if (f.priceMin != null && p.sale_price < f.priceMin) return false
  if (f.priceMax != null && p.sale_price > f.priceMax) return false
  const q = stripAccents(f.search.trim())
  if (!q) return true
  const haystack = [
    p.name,
    p.sku,
    p.origin,
    p.origin_short,
    p.species_or_type,
    p.ecommerce_tags,
    p.supplier_code,
    p.supplier_id ? supplierNames.get(p.supplier_id) : null,
    ...(p.minerals ?? []).map((m) => m.name),
    ...(p.rocks ?? []).map((r) => r.name),
  ]
  // Vários termos: todos precisam aparecer (em qualquer campo).
  return q.split(/\s+/).every((term) => haystack.some((v) => v && stripAccents(v).includes(term)))
}

export type ProductSortField = 'name' | 'sale_price' | 'cost_price' | 'margin' | 'stock_quantity' | 'weight_g' | 'created_at'

export const PRODUCT_SORT_OPTIONS: { value: ProductSortField; label: string; ascLabel: string; descLabel: string }[] = [
  { value: 'name', label: 'Nome', ascLabel: 'A a Z', descLabel: 'Z a A' },
  { value: 'sale_price', label: 'Preço de venda', ascLabel: 'menor primeiro', descLabel: 'maior primeiro' },
  { value: 'cost_price', label: 'Preço de custo', ascLabel: 'menor primeiro', descLabel: 'maior primeiro' },
  { value: 'margin', label: 'Margem', ascLabel: 'menor primeiro', descLabel: 'maior primeiro' },
  { value: 'stock_quantity', label: 'Estoque', ascLabel: 'menor primeiro', descLabel: 'maior primeiro' },
  { value: 'weight_g', label: 'Peso', ascLabel: 'mais leve primeiro', descLabel: 'mais pesado primeiro' },
  { value: 'created_at', label: 'Data de criação', ascLabel: 'mais antigos primeiro', descLabel: 'mais recentes primeiro' },
]

export const defaultSortDir = (f: ProductSortField): 'asc' | 'desc' =>
  f === 'name' ? 'asc' : f === 'created_at' ? 'desc' : 'asc'

/** Nulos por último na ordem crescente, sem NaN (−∞ − −∞) quebrando o sort. */
const cmpNullable = (a: number | null | undefined, b: number | null | undefined) =>
  a == null ? (b == null ? 0 : -1) : b == null ? 1 : a - b

export function compareBy(field: ProductSortField, a: StoreProduct, b: StoreProduct): number {
  switch (field) {
    case 'name':
      return a.name.localeCompare(b.name, 'pt-BR')
    case 'created_at':
      return a.created_at.localeCompare(b.created_at)
    case 'margin':
      return cmpNullable(marginPct(a), marginPct(b))
    case 'cost_price':
      return cmpNullable(a.cost_price, b.cost_price)
    case 'weight_g':
      return cmpNullable(a.weight_g, b.weight_g)
    default:
      return a[field] - b[field]
  }
}

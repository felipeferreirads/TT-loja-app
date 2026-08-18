import type { StoreProduct, StoreProductInput } from '../../../types/db'
import type { MineralAutoInfo } from '../../../lib/mineralReference'

/** Todos os campos do formulário viram string; a conversão pro tipo real
 *  acontece só em `toInput`. */
export type Draft = Record<string, string>

/** Campos preenchíveis pelo catálogo de minerais — a ordem é a de exibição. */
export const AUTO_FIELDS: (keyof MineralAutoInfo)[] = [
  'formula',
  'formula_name',
  'mineral_class',
  'group_name',
  'color_cause',
  'chromophore',
  'hardness',
  'tenacity',
  'cleavage',
  'fracture',
  'streak',
  'density',
  'crystal_system',
  'luster',
  'transparency',
  'refractive_index',
]

export const AUTO_FIELD_LABELS: Record<keyof MineralAutoInfo, string> = {
  name: 'Nome',
  formula: 'Fórmula',
  formula_name: 'Nome da fórmula',
  mineral_class: 'Classe',
  group_name: 'Grupo',
  color_cause: 'Origem da cor',
  chromophore: 'Cromóforo',
  hardness: 'Dureza (Mohs)',
  tenacity: 'Tenacidade',
  cleavage: 'Clivagem',
  fracture: 'Fratura',
  streak: 'Traço',
  density: 'Densidade',
  crystal_system: 'Sistema cristalino',
  luster: 'Brilho',
  transparency: 'Transparência',
  refractive_index: 'Índice de refração',
}

const TEXT_FIELDS = [
  'name', 'sku', 'notes',
  'species', 'variety', 'origin_country', 'origin_state', 'origin', 'dimensions', 'color',
  'gem_cut',
  'popular_name', 'phylum', 'taxon_class', 'taxon_order', 'family', 'formation', 'period_era', 'age',
  'met_class', 'met_type_group', 'met_structure',
  ...AUTO_FIELDS,
] as const

export const NUMERIC_FIELDS = new Set(['cost_price', 'sale_price', 'stock_quantity', 'weight_g', 'weight_ct'])

export function toDraft(p: StoreProduct | null): Draft {
  const d: Draft = {}
  for (const f of [...TEXT_FIELDS, ...NUMERIC_FIELDS]) {
    const value = p ? (p as unknown as Record<string, unknown>)[f] : null
    d[f] = value == null ? '' : String(value)
  }
  d.kind = p?.kind ?? 'mineral'
  if (!p) d.stock_quantity = '0'
  return d
}

export function toInput(d: Draft, autoFields: string[], mineralReferenceId: string | null): StoreProductInput {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(d)) {
    const value = raw.trim()
    if (NUMERIC_FIELDS.has(key)) out[key] = value === '' ? null : Number(value)
    else out[key] = value === '' ? null : value
  }
  out.name = d.name.trim()
  out.sale_price = Number(d.sale_price) || 0
  out.stock_quantity = Number(d.stock_quantity) || 0
  out.auto_fields = autoFields
  out.mineral_reference_id = mineralReferenceId
  return out as StoreProductInput
}

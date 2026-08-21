import type { StoreProduct, StoreProductInput } from '../../../types/db'

/** Todos os campos do formulário viram string; a conversão pro tipo real
 *  acontece só em `toInput`. */
export type Draft = Record<string, string>

const TEXT_FIELDS = [
  'name', 'sku', 'notes',
  'parent_id', 'lot_suffix',
  'origin_country', 'origin_state', 'origin', 'dimensions',
  'color', 'color_secondary', 'special_properties', 'uv_color', 'iridescence_color', 'play_of_color',
  'gem_cut', 'cut_type', 'gem_shape', 'gem_cut_style', 'cut_name', 'gem_treatment',
  'met_class', 'met_type_group', 'met_structure', 'met_shock', 'met_weathering', 'met_material', 'met_total_mass',
  'met_category', 'met_group', 'met_type', 'met_age', 'met_fall_observed', 'met_fall_date', 'met_found_date',
  'met_largest_fragment', 'met_largest_fragment_dimensions', 'met_crust_fusion', 'met_weathering_specimen',
  'met_acid_etched', 'met_magnetism', 'met_individual_fragment', 'met_end_cut', 'met_chondrules_visible',
  'met_metal_matrix_visible', 'met_olivine_visible', 'met_polished', 'met_cut_sliced', 'met_polished_window',
  'ecommerce_slug', 'ecommerce_description', 'ecommerce_category_path', 'ecommerce_google_category',
  'ecommerce_tags', 'ecommerce_seo_title', 'ecommerce_seo_description',
] as const

export const NUMERIC_FIELDS = new Set([
  'cost_price', 'sale_price', 'stock_quantity', 'min_stock', 'weight_g', 'weight_ct',
  'ecommerce_package_height_cm', 'ecommerce_package_width_cm', 'ecommerce_package_length_cm',
])

/** Campos booleanos do draft: viajam como string 'true'/'false' até `toInput`. */
export const BOOLEAN_FIELDS = new Set(['ecommerce_free_shipping', 'ecommerce_published', 'is_gem', 'is_lot', 'is_lot_summary'])

export function toDraft(p: StoreProduct | null): Draft {
  const d: Draft = {}
  for (const f of [...TEXT_FIELDS, ...NUMERIC_FIELDS, ...BOOLEAN_FIELDS]) {
    const value = p ? (p as unknown as Record<string, unknown>)[f] : null
    d[f] = value == null ? '' : String(value)
  }
  d.kind = p?.kind ?? 'mineral'
  if (!p) {
    d.stock_quantity = '0'
    d.ecommerce_published = 'true'
    d.ecommerce_free_shipping = 'false'
  }
  return d
}

export function toInput(d: Draft): StoreProductInput {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(d)) {
    const value = raw.trim()
    if (NUMERIC_FIELDS.has(key)) out[key] = value === '' ? null : Number(value)
    else if (BOOLEAN_FIELDS.has(key)) out[key] = value === 'true'
    else out[key] = value === '' ? null : value
  }
  out.name = d.name.trim()
  out.sale_price = Number(d.sale_price) || 0
  out.stock_quantity = Number(d.stock_quantity) || 0
  return out as StoreProductInput
}

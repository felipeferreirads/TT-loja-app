import type { CustomField, StoreProduct, StoreProductInput } from '../../../types/db'
import { IMPACTITE_HIDDEN_DRAFT_FIELDS, isImpactite } from './rockFields'
import { onlyDigits } from '../fiscal'

/** Todos os campos do formulário viram string; a conversão pro tipo real
 *  acontece só em `toInput`. */
export type Draft = Record<string, string>

const TEXT_FIELDS = [
  'name', 'sku', 'notes',
  'parent_id', 'lot_suffix',
  'origin_country', 'origin_state', 'origin', 'dimensions', 'size_class',
  'color', 'color_secondary', 'special_properties', 'uv_color', 'iridescence_color', 'play_of_color',
  'gem_cut', 'cut_type', 'gem_shape', 'gem_cut_style', 'cut_name', 'gem_treatment',
  'met_class', 'met_type_group', 'met_structure', 'met_shock', 'met_weathering', 'met_material', 'met_total_mass',
  'met_category', 'met_group', 'met_type', 'met_age', 'met_fall_observed', 'met_fall_date', 'met_found_date',
  'met_largest_fragment', 'met_largest_fragment_dimensions', 'met_crust_fusion', 'met_weathering_specimen',
  'met_acid_etched', 'met_magnetism', 'met_individual_fragment', 'met_end_cut', 'met_chondrules_visible',
  'met_metal_matrix_visible', 'met_olivine_visible', 'met_polished', 'met_cut_sliced', 'met_polished_window',
  'met_parent_body',
  'jwl_material', 'jwl_stone', 'jwl_size', 'jwl_clasp', 'jwl_finish', 'jwl_adjustable',
  'ecommerce_slug', 'ecommerce_description', 'ecommerce_category_path', 'ecommerce_google_category',
  'ecommerce_tags', 'ecommerce_seo_title', 'ecommerce_seo_description',
  'fiscal_type', 'ncm', 'cest',
  // 0036 — paridade com o item da coleção.
  'origin_short', 'crystal_features', 'treatment', 'phosphorescence_color',
  'fossil_restoration', 'fossil_host_rock', 'supplier_id', 'supplier_code', 'acquisition_date',
  // 0041 — paridade com o item da coleção.
  'supplier_text', 'supplier_storefront_id', 'geological_time_id', 'geological_time_end_id', 'fossil_age',
] as const

/** Atributos livres do tipo "Outro" (0041): viajam no draft como JSON (lista de {label, value}). */
export const CUSTOM_FIELDS_KEY = 'custom_fields'

export function parseDraftCustomFields(raw: string | undefined): CustomField[] {
  if (!raw) return []
  try {
    const list = JSON.parse(raw) as unknown
    return Array.isArray(list)
      ? list.map((r) => ({ label: String((r as CustomField).label ?? ''), value: String((r as CustomField).value ?? '') }))
      : []
  } catch {
    return []
  }
}

/** Linhas sem rótulo nem valor são descartadas; lista vazia vira null (mesma regra do catálogo). */
export function cleanCustomFields(rows: CustomField[]): CustomField[] | null {
  const out = rows
    .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
    .filter((r) => r.label !== '' || r.value !== '')
  return out.length > 0 ? out : null
}

export const NUMERIC_FIELDS = new Set([
  'cost_price', 'cost_usd', 'cost_exchange_rate', 'cost_gross_price', 'cost_gross_usd', 'sale_price', 'stock_quantity', 'min_stock', 'weight_g', 'weight_ct',
  'ecommerce_package_height_cm', 'ecommerce_package_width_cm', 'ecommerce_package_length_cm',
  'tax_origin',
])

/** Campos booleanos do draft: viajam como string 'true'/'false' até `toInput`. */
export const BOOLEAN_FIELDS = new Set([
  'ecommerce_free_shipping', 'ecommerce_published', 'is_gem', 'is_lot', 'is_lot_summary', 'cost_exchange_rate_manual',
])

export function toDraft(p: StoreProduct | null): Draft {
  const d: Draft = {}
  for (const f of [...TEXT_FIELDS, ...NUMERIC_FIELDS, ...BOOLEAN_FIELDS]) {
    const value = p ? (p as unknown as Record<string, unknown>)[f] : null
    d[f] = value == null ? '' : String(value)
  }
  d.kind = p?.kind ?? 'mineral'
  d[CUSTOM_FIELDS_KEY] = JSON.stringify(p?.custom_fields ?? [])
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
    if (key === CUSTOM_FIELDS_KEY) continue
    if (NUMERIC_FIELDS.has(key)) out[key] = value === '' ? null : Number(value)
    else if (BOOLEAN_FIELDS.has(key)) out[key] = value === 'true'
    else out[key] = value === '' ? null : value
  }
  // Impactito (não é meteorito): campos de classificação de meteorito não se aplicam — sem valor "fantasma".
  if (isImpactite(d.met_category)) for (const key of IMPACTITE_HIDDEN_DRAFT_FIELDS) out[key] = null
  // NCM e CEST: gravados só com dígitos (a máscara é só de exibição). Tamanho validado antes, em `validateFiscalDraft`.
  out.ncm = onlyDigits(d.ncm ?? '') || null
  out.cest = onlyDigits(d.cest ?? '') || null
  // Atributos livres só existem no tipo "Outro" (como no catálogo).
  out.custom_fields = d.kind === 'other' ? cleanCustomFields(parseDraftCustomFields(d[CUSTOM_FIELDS_KEY])) : null
  // Fornecedor: texto livre só sem cadastro; loja do fornecedor só com cadastro.
  if (d.supplier_id?.trim()) out.supplier_text = null
  else out.supplier_storefront_id = null
  // Tempo geológico só no fóssil; o fim da faixa exige o início.
  if (d.kind !== 'fossil') {
    out.geological_time_id = null
    out.geological_time_end_id = null
    out.fossil_age = null
  } else if (!d.geological_time_id?.trim()) {
    out.geological_time_end_id = null
  }
  out.name = d.name.trim()
  out.sale_price = Number(d.sale_price) || 0
  out.stock_quantity = Number(d.stock_quantity) || 0
  return out as StoreProductInput
}

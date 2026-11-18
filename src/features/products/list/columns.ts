// Catálogo de colunas do modo lista/planilha de Produtos — mesmo papel de
// `LIST_COLUMNS`/`EDITABLE_FIELDS` em `SpecimenRow.tsx` do catálogo pessoal
// (grupos, largura padrão, valor exibido, valor cru editável e ordenação),
// reescrito para o schema `store_products`. Rótulos em PT fixo (sem i18n).
//
// Campo novo de produto: acrescentar aqui a coluna (e `edit` quando for um
// campo simples editável na célula), no grupo certo.

import { ITEM_KIND_LABELS, type StoreItemKind, type StoreProduct } from '../../../types/db'
import { countryName, countryOptions, formatDate, formatMoney } from '../../../lib/format'
import { SIZE_CLASS_LABELS, SIZE_CLASS_VALUES, effectiveSizeClass, maxDimensionMm, sizeClassRank } from '../sizeClass'
import { COLOR_OPTIONS } from '../colorOptions'
import { CUT_TYPE_OPTIONS, GEM_SHAPE_OPTIONS } from '../form/gemFields'
import { MET_CATEGORIES, MET_SHOCK, MET_WEATHERING } from '../form/meteoriteFields'
import { visibleCrystalFeatures } from '../crystalFeatures'

export type ColumnGroup =
  | 'identificacao'
  | 'comercial'
  | 'origem'
  | 'caracteristicas'
  | 'gema'
  | 'fossil'
  | 'meteorito'
  | 'joia'
  | 'aquisicao'
  | 'ecommerce'
  | 'fiscal'

export const GROUP_LABELS: Record<ColumnGroup, string> = {
  identificacao: 'Identificação',
  comercial: 'Comercial',
  origem: 'Origem',
  caracteristicas: 'Características',
  gema: 'Gema',
  fossil: 'Fóssil',
  meteorito: 'Meteorito',
  joia: 'Joia',
  aquisicao: 'Aquisição',
  ecommerce: 'Loja online',
  fiscal: 'Fiscal',
}

export const GROUP_ORDER = Object.keys(GROUP_LABELS) as ColumnGroup[]

export interface SelectOption {
  value: string
  label: string
}

/** Como a célula é editada no modo planilha. Ausente = coluna só de leitura (derivada). */
export type EditMeta =
  | { type: 'text'; field: keyof StoreProduct; multiline?: boolean }
  | { type: 'number'; field: keyof StoreProduct; integer?: boolean; required?: boolean }
  | { type: 'date'; field: keyof StoreProduct }
  | { type: 'boolean'; field: keyof StoreProduct }
  | { type: 'select'; field: keyof StoreProduct; options: (ctx: ColumnContext) => SelectOption[]; required?: boolean }

/** Dados de fora do produto que algumas colunas precisam (nome do fornecedor). */
export interface ColumnContext {
  supplierNames: Map<string, string>
}

export interface ColumnDef {
  key: string
  label: string
  group: ColumnGroup
  /** Largura padrão em px. */
  width: number
  /** Texto exibido (e copiado). */
  text: (p: StoreProduct, ctx: ColumnContext) => string
  /** Valor de ordenação; padrão = `text`. */
  sort?: (p: StoreProduct, ctx: ColumnContext) => string | number
  numeric?: boolean
  edit?: EditMeta
  /** Coluna que só se aplica a alguns tipos — nos demais a célula fica vazia e não editável. */
  kinds?: StoreItemKind[]
}

const str = (v: unknown): string => (v == null ? '' : String(v))
const opts = (values: readonly string[]): SelectOption[] => values.map((v) => ({ value: v, label: v }))
const yesNo = (v: boolean | null | undefined) => (v ? 'Sim' : 'Não')
const num = (v: number | null | undefined, digits = 2) =>
  v == null ? '' : v.toLocaleString('pt-BR', { maximumFractionDigits: digits })

/** Margem bruta (%) sobre o preço de venda — só com custo e preço > 0. */
export function marginPct(p: StoreProduct): number | null {
  if (!p.cost_price || !p.sale_price) return null
  return ((p.sale_price - p.cost_price) / p.sale_price) * 100
}

/** Espécie exibida: 1º mineral da amostra, senão o texto livre `species_or_type`. */
export const speciesOf = (p: StoreProduct): string => p.minerals?.[0]?.name || p.species_or_type || ''

function textCol(
  key: string,
  label: string,
  group: ColumnGroup,
  field: keyof StoreProduct,
  width = 160,
  extra: Partial<ColumnDef> = {},
): ColumnDef {
  return { key, label, group, width, text: (p) => str(p[field]), edit: { type: 'text', field }, ...extra }
}

function selectCol(
  key: string,
  label: string,
  group: ColumnGroup,
  field: keyof StoreProduct,
  values: readonly string[],
  width = 140,
  extra: Partial<ColumnDef> = {},
): ColumnDef {
  return {
    key,
    label,
    group,
    width,
    text: (p) => str(p[field]),
    edit: { type: 'select', field, options: () => opts(values) },
    ...extra,
  }
}

export const LIST_COLUMNS: ColumnDef[] = [
  // Identificação
  { key: 'foto', label: 'Foto', group: 'identificacao', width: 56, text: () => '' },
  textCol('nome', 'Nome', 'identificacao', 'name', 240, {
    edit: { type: 'text', field: 'name' },
    text: (p) => (p.lot_suffix ? `#${p.lot_suffix} ${p.name}` : p.name),
    sort: (p) => p.name.toLocaleLowerCase('pt-BR'),
  }),
  textCol('sku', 'SKU', 'identificacao', 'sku', 120),
  {
    key: 'tipo',
    label: 'Tipo',
    group: 'identificacao',
    width: 110,
    text: (p) => ITEM_KIND_LABELS[p.kind],
    edit: {
      type: 'select',
      field: 'kind',
      required: true,
      options: () => (Object.entries(ITEM_KIND_LABELS) as [string, string][]).map(([value, label]) => ({ value, label })),
    },
  },
  { key: 'especie', label: 'Espécie', group: 'identificacao', width: 160, text: speciesOf },
  {
    key: 'lote',
    label: 'Lote',
    group: 'identificacao',
    width: 90,
    text: (p) => (p.is_lot ? 'Lote' : p.parent_id ? `Peça ${p.lot_suffix ?? ''}`.trim() : ''),
  },

  // Comercial
  {
    key: 'preco',
    label: 'Preço de venda',
    group: 'comercial',
    width: 120,
    numeric: true,
    text: (p) => formatMoney(p.sale_price),
    sort: (p) => p.sale_price,
    edit: { type: 'number', field: 'sale_price', required: true },
  },
  {
    key: 'custo',
    label: 'Preço de custo',
    group: 'comercial',
    width: 120,
    numeric: true,
    text: (p) => (p.cost_price == null ? '' : formatMoney(p.cost_price)),
    sort: (p) => p.cost_price ?? -Infinity,
    edit: { type: 'number', field: 'cost_price' },
  },
  {
    key: 'margem',
    label: 'Margem',
    group: 'comercial',
    width: 90,
    numeric: true,
    text: (p) => {
      const m = marginPct(p)
      return m == null ? '' : `${m.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`
    },
    sort: (p) => marginPct(p) ?? -Infinity,
  },
  {
    key: 'estoque',
    label: 'Estoque',
    group: 'comercial',
    width: 90,
    numeric: true,
    text: (p) => String(p.stock_quantity),
    sort: (p) => p.stock_quantity,
    edit: { type: 'number', field: 'stock_quantity', integer: true, required: true },
  },
  {
    key: 'estoque_minimo',
    label: 'Alerta de estoque',
    group: 'comercial',
    width: 110,
    numeric: true,
    text: (p) => str(p.min_stock),
    sort: (p) => p.min_stock ?? -Infinity,
    edit: { type: 'number', field: 'min_stock', integer: true },
  },
  {
    key: 'criado_em',
    label: 'Criado em',
    group: 'comercial',
    width: 110,
    text: (p) => formatDate(p.created_at),
    sort: (p) => p.created_at,
  },

  // Origem
  textCol('localidade', 'Localidade', 'origem', 'origin', 220),
  textCol('localidade_resumida', 'Localidade resumida', 'origem', 'origin_short', 180),
  {
    key: 'pais',
    label: 'País',
    group: 'origem',
    width: 140,
    text: (p) => (p.origin_country ? countryName(p.origin_country) : ''),
    edit: { type: 'select', field: 'origin_country', options: () => countryOptions().map((c) => ({ value: c.code, label: c.name })) },
  },
  { key: 'estado', label: 'Estado / Província', group: 'origem', width: 120, text: (p) => str(p.origin_state) },

  // Características
  {
    key: 'peso_g',
    label: 'Peso (g)',
    group: 'caracteristicas',
    width: 90,
    numeric: true,
    text: (p) => num(p.weight_g),
    sort: (p) => p.weight_g ?? -Infinity,
    edit: { type: 'number', field: 'weight_g' },
  },
  {
    key: 'peso_ct',
    label: 'Peso (ct)',
    group: 'caracteristicas',
    width: 90,
    numeric: true,
    text: (p) => num(p.weight_ct),
    sort: (p) => p.weight_ct ?? -Infinity,
    edit: { type: 'number', field: 'weight_ct' },
  },
  // Ordena pela maior medida em mm, não pelo texto ("100 mm" depois de "20 mm").
  textCol('dimensoes', 'Dimensões', 'caracteristicas', 'dimensions', 130, { sort: (p) => maxDimensionMm(p.dimensions) ?? -Infinity }),
  {
    key: 'tamanho',
    label: 'Classe de tamanho',
    group: 'caracteristicas',
    width: 130,
    text: (p) => {
      const c = effectiveSizeClass(p)
      return c ? SIZE_CLASS_LABELS[c] : ''
    },
    // Classe primeiro (é o que a coluna mostra); dentro dela, desempata pela
    // maior medida em mm. Sem classe fica no início.
    sort: (p) => {
      const c = effectiveSizeClass(p)
      if (!c) return -Infinity
      const mm = maxDimensionMm(p.dimensions)
      return sizeClassRank(c) * 1e7 + (mm == null ? 0 : Math.min(mm, 9_999_999))
    },
    edit: { type: 'select', field: 'size_class', options: () => SIZE_CLASS_VALUES.map((c) => ({ value: c, label: SIZE_CLASS_LABELS[c] })) },
  },
  selectCol('cor', 'Cor', 'caracteristicas', 'color', COLOR_OPTIONS, 120),
  textCol('propriedades', 'Propriedades especiais', 'caracteristicas', 'special_properties', 180, { kinds: ['mineral'] }),
  {
    key: 'cristalografia',
    label: 'Características cristalográficas',
    group: 'caracteristicas',
    width: 200,
    kinds: ['mineral'],
    text: (p) => visibleCrystalFeatures(p.crystal_features).join(', '),
  },
  textCol('tratamento', 'Tratamento', 'caracteristicas', 'treatment', 160),
  { key: 'rochas', label: 'Rochas da amostra', group: 'caracteristicas', width: 160, text: (p) => (p.rocks ?? []).map((r) => r.name).filter(Boolean).join(', ') },

  // Gema
  {
    key: 'gema',
    label: 'Lapidado',
    group: 'gema',
    width: 90,
    kinds: ['mineral'],
    text: (p) => yesNo(p.is_gem),
    edit: { type: 'boolean', field: 'is_gem' },
  },
  selectCol('lapidacao', 'Tipo de lapidação', 'gema', 'cut_type', CUT_TYPE_OPTIONS, 130, { kinds: ['mineral'] }),
  selectCol('formato', 'Formato', 'gema', 'gem_shape', GEM_SHAPE_OPTIONS, 120, { kinds: ['mineral'] }),
  textCol('nome_corte', 'Nome do corte', 'gema', 'cut_name', 140, { kinds: ['mineral'] }),

  // Fóssil
  textCol('restauracao', 'Restauração', 'fossil', 'fossil_restoration', 150, { kinds: ['fossil'] }),
  textCol('matriz', 'Rocha hospedeira / Matriz', 'fossil', 'fossil_host_rock', 170, { kinds: ['fossil'] }),

  // Meteorito
  selectCol('met_categoria', 'Categoria', 'meteorito', 'met_category', MET_CATEGORIES, 140, { kinds: ['meteorite'] }),
  textCol('met_classe', 'Classe', 'meteorito', 'met_class', 130, { kinds: ['meteorite'] }),
  textCol('met_grupo', 'Grupo', 'meteorito', 'met_group', 100, { kinds: ['meteorite'] }),
  textCol('met_tipo', 'Tipo petrológico', 'meteorito', 'met_type', 110, { kinds: ['meteorite'] }),
  selectCol('met_choque', 'Choque', 'meteorito', 'met_shock', MET_SHOCK, 90, { kinds: ['meteorite'] }),
  selectCol('met_intemperismo', 'Intemperismo', 'meteorito', 'met_weathering', MET_WEATHERING, 110, { kinds: ['meteorite'] }),
  textCol('met_massa_total', 'Massa total', 'meteorito', 'met_total_mass', 110, { kinds: ['meteorite'] }),

  // Joia
  textCol('joia_material', 'Material', 'joia', 'jwl_material', 130, { kinds: ['jewelry'] }),
  textCol('joia_pedra', 'Pedra', 'joia', 'jwl_stone', 130, { kinds: ['jewelry'] }),
  textCol('joia_tamanho', 'Tamanho', 'joia', 'jwl_size', 100, { kinds: ['jewelry'] }),

  // Aquisição
  {
    key: 'fornecedor',
    label: 'Fornecedor',
    group: 'aquisicao',
    width: 160,
    text: (p, ctx) => (p.supplier_id ? (ctx.supplierNames.get(p.supplier_id) ?? '') : ''),
    edit: {
      type: 'select',
      field: 'supplier_id',
      options: (ctx) => [...ctx.supplierNames].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    },
  },
  textCol('cod_fornecedor', 'Código do fornecedor', 'aquisicao', 'supplier_code', 140),
  {
    key: 'data_aquisicao',
    label: 'Data de aquisição',
    group: 'aquisicao',
    width: 120,
    text: (p) => formatDate(p.acquisition_date),
    sort: (p) => p.acquisition_date ?? '',
    edit: { type: 'date', field: 'acquisition_date' },
  },

  // Loja online
  {
    key: 'publicado',
    label: 'Publicado',
    group: 'ecommerce',
    width: 90,
    text: (p) => yesNo(p.ecommerce_published),
    edit: { type: 'boolean', field: 'ecommerce_published' },
  },
  {
    key: 'frete_gratis',
    label: 'Frete grátis',
    group: 'ecommerce',
    width: 90,
    text: (p) => yesNo(p.ecommerce_free_shipping),
    edit: { type: 'boolean', field: 'ecommerce_free_shipping' },
  },
  textCol('seo_titulo', 'Título para buscadores', 'ecommerce', 'ecommerce_seo_title', 200),
  textCol('tags', 'Tags', 'ecommerce', 'ecommerce_tags', 160),
  textCol('categoria_loja', 'Categoria na loja', 'ecommerce', 'ecommerce_category_path', 180),

  // Fiscal
  textCol('ncm', 'NCM', 'fiscal', 'ncm', 100),
  textCol('cest', 'CEST', 'fiscal', 'cest', 90),

  // Observações
  textCol('notas', 'Observações', 'identificacao', 'notes', 240, { edit: { type: 'text', field: 'notes', multiline: true } }),
]

export const COLUMN_BY_KEY = new Map(LIST_COLUMNS.map((c) => [c.key, c]))

export const DEFAULT_COLUMNS = ['foto', 'nome', 'sku', 'tipo', 'especie', 'localidade', 'estoque', 'preco']

const COLUMNS_KEY = 'tt_loja_list_columns'
const WIDTHS_KEY = 'tt_loja_list_column_widths'
const FROZEN_KEY = 'tt_loja_list_frozen'

export const COL_MIN_WIDTH = 48
export const COL_MAX_WIDTH = 640
export const MAX_FROZEN_COLS = 3

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* sem storage: vale só até recarregar */
  }
}

/** Colunas visíveis, na ordem escolhida (preferência do dispositivo). */
export function loadColumns(): string[] {
  const saved = readJson<unknown>(COLUMNS_KEY, null)
  if (!Array.isArray(saved)) return DEFAULT_COLUMNS
  const valid = saved.filter((k): k is string => typeof k === 'string' && COLUMN_BY_KEY.has(k))
  return valid.length > 0 ? valid : DEFAULT_COLUMNS
}
export const saveColumns = (cols: string[]) => writeJson(COLUMNS_KEY, cols)

export function loadWidths(): Record<string, number> {
  const saved = readJson<Record<string, unknown>>(WIDTHS_KEY, {})
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(saved ?? {})) {
    if (typeof v === 'number' && v >= COL_MIN_WIDTH && v <= COL_MAX_WIDTH && COLUMN_BY_KEY.has(k)) out[k] = v
  }
  return out
}
export const saveWidths = (w: Record<string, number>) => writeJson(WIDTHS_KEY, w)

export function loadFrozen(): number {
  const n = Number(readJson<unknown>(FROZEN_KEY, 0))
  return Number.isInteger(n) && n >= 0 && n <= MAX_FROZEN_COLS ? n : 0
}
export const saveFrozen = (n: number) => writeJson(FROZEN_KEY, n)

/** A célula se aplica a este produto? (coluna restrita a tipos) */
export const appliesTo = (col: ColumnDef, p: StoreProduct) => !col.kinds || col.kinds.includes(p.kind)

/** Valor cru da célula para edição/cópia (o que se digita, não o formatado). */
export function rawValue(col: ColumnDef, p: StoreProduct, ctx: ColumnContext): string {
  const e = col.edit
  if (!e) return col.text(p, ctx)
  const v = p[e.field]
  if (e.type === 'boolean') return v ? 'Sim' : 'Não'
  if (e.type === 'select') {
    if (v == null || v === '') return ''
    const opt = e.options(ctx).find((o) => o.value === v)
    return opt ? opt.label : String(v)
  }
  return v == null ? '' : String(v)
}

export type ParseResult = { ok: true; value: unknown } | { ok: false; error: string }

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

/** Texto digitado/colado → valor da coluna no banco (com validação). */
export function parseCellValue(col: ColumnDef, text: string, ctx: ColumnContext): ParseResult {
  const e = col.edit
  if (!e) return { ok: false, error: 'Coluna somente leitura.' }
  const t = text.trim()
  switch (e.type) {
    case 'text':
      if (e.field === 'name' && !t) return { ok: false, error: 'O nome não pode ficar vazio.' }
      return { ok: true, value: t === '' ? null : t }
    case 'number': {
      if (t === '') return e.required ? { ok: false, error: `${col.label}: informe um número.` } : { ok: true, value: null }
      // Aceita "1.234,56", "1234,56" e "1234.56".
      const cleaned = t.replace(/[R$\s%]/g, '')
      const n = Number(/,\d{1,2}$/.test(cleaned) || cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned)
      if (!Number.isFinite(n)) return { ok: false, error: `${col.label}: "${text}" não é um número.` }
      if (e.integer && !Number.isInteger(n)) return { ok: false, error: `${col.label}: use um número inteiro.` }
      return { ok: true, value: n }
    }
    case 'date': {
      if (t === '') return { ok: true, value: null }
      const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      const iso = br ? `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}` : t
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(iso))) {
        return { ok: false, error: `${col.label}: use a data no formato DD/MM/AAAA.` }
      }
      return { ok: true, value: iso }
    }
    case 'boolean': {
      const n = normalize(t)
      if (['sim', 's', 'true', '1', 'x', 'yes'].includes(n)) return { ok: true, value: true }
      if (['nao', 'n', 'false', '0', '', 'no'].includes(n)) return { ok: true, value: false }
      return { ok: false, error: `${col.label}: use Sim ou Não.` }
    }
    case 'select': {
      if (t === '') return e.required ? { ok: false, error: `${col.label}: escolha um valor.` } : { ok: true, value: null }
      const options = e.options(ctx)
      const n = normalize(t)
      const hit = options.find((o) => normalize(o.label) === n || normalize(o.value) === n)
      if (!hit) return { ok: false, error: `${col.label}: "${text}" não é uma opção válida.` }
      return { ok: true, value: hit.value }
    }
  }
}

export function sortKey(col: ColumnDef, p: StoreProduct, ctx: ColumnContext): string | number {
  if (col.sort) return col.sort(p, ctx)
  return col.text(p, ctx).toLocaleLowerCase('pt-BR')
}

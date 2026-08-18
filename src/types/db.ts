// Tipos TS espelhando 1:1 o schema Postgres do domínio comercial.
// Ver supabase/migrations/.

export type StoreProductDisposition = 'in_stock' | 'sold' | 'returned_to_collection'
export type StorePaymentMethod = 'dinheiro' | 'cartao' | 'pix' | 'outro'
export type StoreCashEntryKind = 'in' | 'out'
export type StoreItemKind = 'mineral' | 'gem' | 'fossil' | 'meteorite' | 'other'
export type StoreCustomerDocType = 'cpf' | 'cnpj'
export type StoreMediaKind = 'image' | 'video'

export const ITEM_KIND_LABELS: Record<StoreItemKind, string> = {
  mineral: 'Mineral',
  gem: 'Gema',
  fossil: 'Fóssil',
  meteorite: 'Meteorito',
  other: 'Outros',
}

export interface StoreProduct {
  id: string
  owner_id: string
  name: string
  kind: StoreItemKind
  species_or_type: string | null
  sku: string | null
  cost_price: number | null
  sale_price: number
  stock_quantity: number
  notes: string | null
  source_specimen_id: string | null
  disposition: StoreProductDisposition

  origin_country: string | null
  /** ISO 3166-2 — ver `subdivisions_reference`. */
  origin_state: string | null
  origin: string | null
  weight_g: number | null
  dimensions: string | null

  color: string | null
  /** Cores além da predominante — texto separado por vírgula, editado via `ColorSwatchMultiSelect` (mesmo padrão de `special_properties`). */
  color_secondary: string | null
  /** "Fluorescência, Magnetismo" — texto separado por vírgula, editado via `MultiTagSelect`. */
  special_properties: string | null
  /** Cor sob luz UV — condicional a "Fluorescência" em Propriedades especiais. */
  uv_color: string | null
  /** Cor(es) de iridescência — condicional a "Iridescência" em Propriedades especiais. Aceita "Espectro completo". */
  iridescence_color: string | null
  /** Cor(es) do jogo de cor — condicional a "Jogo de Cor" em Propriedades especiais. Aceita "Espectro completo". */
  play_of_color: string | null

  /** Minerais da amostra (0015) — ver `store_product_minerals`; o produto pode ter mais de um mineral (Mineral 1, 2, 3...). Vem embutido no SELECT de `store_products`, ordenado por `sort_order`. */
  minerals?: StoreProductMineral[]

  gem_cut: string | null
  weight_ct: number | null

  met_class: string | null
  met_type_group: string | null
  met_structure: string | null
  /** Grau de choque S1..S6 (auditoria de campos, Tarefa 7). */
  met_shock: string | null
  /** Grau de intemperismo W0..W6 (auditoria de campos, Tarefa 7). */
  met_weathering: string | null
  /** Composição (auditoria de campos, Tarefa 7). */
  met_material: string | null
  /** Massa total conhecida da queda/achado (auditoria de campos, Tarefa 7). */
  met_total_mass: string | null

  /** Taxonomia de fóssil MULTI-ESPÉCIE — ver `store_product_fossil_species`;
   *  o produto pode ser um lote com várias espécies. Não vem no SELECT de
   *  `store_products`, é buscado à parte (fetchFossilSpecies). */
  fossil_species?: StoreProductFossilSpecies[]

  /** Etiquetas QR extras vinculadas a este produto (ver `store_product_qr_aliases`). */
  qr_aliases?: StoreProductQrAlias[]

  /** Só existem pra alimentar o export de CSV pra Nuvemshop/Shopify — sem
   *  equivalente no resto do app. Ver `features/products/export/`. */
  ecommerce_slug: string | null
  ecommerce_description: string | null
  ecommerce_category_path: string | null
  ecommerce_google_category: string | null
  ecommerce_tags: string | null
  ecommerce_seo_title: string | null
  ecommerce_seo_description: string | null
  ecommerce_package_height_cm: number | null
  ecommerce_package_width_cm: number | null
  ecommerce_package_length_cm: number | null
  ecommerce_free_shipping: boolean
  ecommerce_published: boolean

  created_at: string
  updated_at: string
}

export type StoreProductInput = Partial<Omit<StoreProduct, 'id' | 'owner_id' | 'created_at' | 'updated_at'>> &
  Pick<StoreProduct, 'name'>

/** Bucket físico do R2 onde o arquivo desta linha vive — ver migration 0017.
 *  'store' = bucket próprio da loja (upload feito aqui). 'media' = bucket do
 *  catálogo pessoal, referenciado por um item importado da coleção
 *  (`importFromCollection.ts`) — só leitura, a loja nunca escreve nem apaga
 *  ali; o objeto pertence ao catálogo pessoal. */
export type StoreMediaBucket = 'store' | 'media'

export interface StoreProductMedia {
  id: string
  owner_id: string
  product_id: string
  kind: StoreMediaKind
  bucket: StoreMediaBucket
  storage_path: string
  caption: string | null
  is_cover: boolean
  sort_order: number
  created_at: string
}

/** Etiqueta QR extra (0010) — mesmo mecanismo de `specimen_qr_aliases` do catálogo pessoal. */
export interface StoreProductQrAlias {
  id: string
  owner_id: string
  product_id: string
  created_at: string
}

/** Vídeo do YouTube vinculado a um produto (0011) — mesmo mecanismo de `specimen_youtube_videos`. */
export interface StoreProductYoutubeVideo {
  id: string
  owner_id: string
  product_id: string
  youtube_id: string
  title: string | null
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Uma espécie de fóssil dentro de um produto (0012) — produto pode ser um lote com várias espécies. */
export interface StoreProductFossilSpecies {
  id: string
  owner_id: string
  product_id: string
  /** Nome científico da espécie (coluna `name` no banco). */
  name: string | null
  popular_name: string | null
  kingdom: string | null
  phylum: string | null
  taxon_class: string | null
  taxon_order: string | null
  family: string | null
  clades: string | null
  taxon_type: string | null
  formation: string | null
  period_era: string | null
  age: string | null
  item_count: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type StoreProductFossilSpeciesInput = Partial<Omit<StoreProductFossilSpecies, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>

/** Um mineral dentro de um produto (0015) — produto pode ter mais de um mineral (Mineral 1, 2, 3...), cada um com sua própria ficha de propriedades e autofill. Mesmo modelo de `specimen_minerals` do catálogo pessoal. */
export interface StoreProductMineral {
  id: string
  owner_id: string
  product_id: string
  name: string | null
  sort_order: number
  /** Linha do catálogo `minerals_reference` que originou o preenchimento deste mineral. */
  mineral_reference_id: string | null
  /** Campos que ainda espelham o catálogo; editar um à mão remove a chave daqui. */
  auto_fields: string[]
  formula: string | null
  formula_name: string | null
  mineral_class: string | null
  group_name: string | null
  color_cause: string | null
  chromophore: string | null
  hardness: string | null
  tenacity: string | null
  cleavage: string | null
  fracture: string | null
  streak: string | null
  density: string | null
  crystal_system: string | null
  luster: string | null
  transparency: string | null
  refractive_index: string | null
  created_at: string
  updated_at: string
}

export type StoreProductMineralInput = Partial<Omit<StoreProductMineral, 'id' | 'owner_id' | 'product_id' | 'created_at' | 'updated_at'>>

export type StoreDocumentKind = 'nota_fiscal' | 'recibo' | 'importacao' | 'certificado' | 'outro'

export const DOCUMENT_KIND_LABELS: Record<StoreDocumentKind, string> = {
  nota_fiscal: 'Nota fiscal',
  recibo: 'Recibo',
  importacao: 'Importação',
  certificado: 'Certificado',
  outro: 'Outro',
}

export interface StoreDocument {
  id: string
  owner_id: string
  kind: StoreDocumentKind
  title: string
  doc_date: string | null
  supplier_id: string | null
  supplier_name: string | null
  number: string | null
  series: string | null
  access_key: string | null
  total_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type StoreDocumentInput = Partial<Omit<StoreDocument, 'id' | 'owner_id' | 'created_at' | 'updated_at'>> &
  Pick<StoreDocument, 'title'>

export interface StoreDocumentFile {
  id: string
  owner_id: string
  document_id: string
  storage_path: string
  file_name: string | null
  caption: string | null
  sort_order: number
  created_at: string
}

export interface StoreCustomer {
  id: string
  owner_id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  doc_type: StoreCustomerDocType | null
  doc_number: string | null
  address_zip: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_district: string | null
  address_city: string | null
  address_state: string | null
  created_at: string
}

export interface StoreSupplier {
  id: string
  owner_id: string
  name: string
  contact: string | null
  notes: string | null
  created_at: string
}

export interface StoreSale {
  id: string
  owner_id: string
  customer_id: string | null
  sale_date: string
  payment_method: StorePaymentMethod
  discount: number
  total: number
  notes: string | null
  created_at: string
}

export interface StoreSaleItem {
  id: string
  owner_id: string
  sale_id: string
  product_id: string | null
  quantity: number
  unit_price: number
  created_at: string
}

export interface StoreCashEntry {
  id: string
  owner_id: string
  entry_date: string
  kind: StoreCashEntryKind
  amount: number
  description: string | null
  /** Se este lançamento veio de um gasto recorrente (0016), não manual. */
  recurring_expense_id: string | null
  created_at: string
}

/** Gasto que se repete todo mês (contabilidade, plataforma de e-commerce,
 *  aluguel...) — 0016. A definição não lança nada sozinha (sem cron); o
 *  dono lança o mês a partir dela em `/caixa`, o que cria uma linha normal
 *  em `store_cash_entries` vinculada de volta por `recurring_expense_id`. */
export interface StoreRecurringExpense {
  id: string
  owner_id: string
  description: string
  amount: number
  day_of_month: number
  active: boolean
  created_at: string
  updated_at: string
}

export type StoreRecurringExpenseInput = Pick<StoreRecurringExpense, 'description' | 'amount'> &
  Partial<Omit<StoreRecurringExpense, 'id' | 'owner_id' | 'created_at' | 'updated_at' | 'description' | 'amount'>>

export interface StoreCompany {
  owner_id: string
  legal_name: string | null
  trade_name: string | null
  cnpj: string | null
  state_registration: string | null
  municipal_registration: string | null
  tax_regime: string | null
  email: string | null
  phone: string | null
  address_zip: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_district: string | null
  address_city: string | null
  address_state: string | null
  notes: string | null
  partner_name: string | null
  partner_nationality: string | null
  partner_marital_status: string | null
  partner_birth_date: string | null
  partner_cpf: string | null
  partner_rg: string | null
  partner_address_zip: string | null
  partner_address_street: string | null
  partner_address_number: string | null
  partner_address_complement: string | null
  partner_address_district: string | null
  partner_address_city: string | null
  partner_address_state: string | null
  created_at: string
  updated_at: string
}

export interface StoreCompanyDocument {
  id: string
  owner_id: string
  title: string
  doc_kind: string | null
  issue_date: string | null
  storage_path: string
  notes: string | null
  created_at: string
}

/** Percentuais como FRAÇÃO (0.3 = 30%), igual à planilha de origem. */
export interface StorePricingSettings {
  owner_id: string
  markup: number
  discount: number
  tax: number
  card_fixed_fee: number
  card_rate: number
  installment3_rate: number
  pix_rate: number
  invoice_fee: number
  updated_at: string
}

export type StorePricingField = keyof Omit<StorePricingSettings, 'owner_id' | 'updated_at'>

/** Opção nomeada pra um campo da calculadora (ex.: "3x Nuvemshop" = 0.0495). */
export interface StorePricingPreset {
  id: string
  owner_id: string
  field: StorePricingField
  label: string
  value: number
  created_at: string
}

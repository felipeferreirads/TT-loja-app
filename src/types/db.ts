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

  species: string | null
  variety: string | null
  origin_country: string | null
  /** ISO 3166-2 — ver `subdivisions_reference`. */
  origin_state: string | null
  origin: string | null
  weight_g: number | null
  dimensions: string | null

  /** Linha do catálogo `minerals_reference` que originou o preenchimento. */
  mineral_reference_id: string | null
  /** Campos que ainda espelham o catálogo; editar à mão remove a chave daqui. */
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
  color: string | null
  luster: string | null
  transparency: string | null
  refractive_index: string | null

  gem_cut: string | null
  weight_ct: number | null

  popular_name: string | null
  phylum: string | null
  taxon_class: string | null
  taxon_order: string | null
  family: string | null
  formation: string | null
  period_era: string | null
  age: string | null

  met_class: string | null
  met_type_group: string | null
  met_structure: string | null

  created_at: string
  updated_at: string
}

export type StoreProductInput = Partial<Omit<StoreProduct, 'id' | 'owner_id' | 'created_at' | 'updated_at'>> &
  Pick<StoreProduct, 'name'>

export interface StoreProductMedia {
  id: string
  owner_id: string
  product_id: string
  kind: StoreMediaKind
  storage_path: string
  caption: string | null
  is_cover: boolean
  sort_order: number
  created_at: string
}

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
  created_at: string
}

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

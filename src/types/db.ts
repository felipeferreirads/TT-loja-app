// Tipos TS espelhando 1:1 o schema Postgres do domínio comercial.
// Ver supabase/migrations/.

export type StoreProductDisposition = 'in_stock' | 'sold' | 'returned_to_collection'
export type StorePaymentMethod = 'cash' | 'card' | 'pix' | 'other'
export type StoreCashEntryKind = 'in' | 'out'
// "Gema" não é mais um kind à parte — virou `is_gem` (checkbox) na própria
// linha de mineral, igual ao catálogo pessoal (migration
// 0018_gem_as_mineral_property.sql).
/** Classe de tamanho (0031), da menor para a maior. */
export type SizeClass = 'micromount' | 'thumbnail' | 'miniature' | 'cabinet' | 'large_cabinet' | 'museum' | 'large'
/** Tipo fiscal do produto (0035): produção própria ou revenda. */
export type StoreFiscalType = 'own_production' | 'resale'
export type StoreItemKind = 'mineral' | 'fossil' | 'meteorite' | 'jewelry' | 'other'
export type StoreCustomerDocType = 'cpf' | 'cnpj'
export type StoreMediaKind = 'image' | 'video'

export const ITEM_KIND_LABELS: Record<StoreItemKind, string> = {
  mineral: 'Mineral',
  fossil: 'Fóssil',
  meteorite: 'Meteorito',
  jewelry: 'Joia',
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
  /** Opt-in — sem valor, o produto nunca aparece como "estoque baixo" (a
   *  maioria das peças é única; só faz sentido pra consumíveis/itens
   *  escolhidos à mão). Ver `ProductCard.tsx`/`DashboardPage.tsx`. */
  min_stock: number | null
  notes: string | null
  source_specimen_id: string | null
  disposition: StoreProductDisposition

  /** Sistema de lotes (0022) — peça = produto completo próprio, copiado do
   *  catálogo pessoal (`parent_id`+`lot_suffix`+`is_lot`/`is_lot_summary`,
   *  ver `features/products/lots.ts`). `parent_id` aponta pro produto "lote"
   *  que a peça pertence; `is_lot`/`is_lot_summary` marcam o produto QUE É
   *  um lote (sempre setados juntos pela UI, nunca um sem o outro). */
  parent_id: string | null
  lot_suffix: string | null
  is_lot: boolean
  is_lot_summary: boolean

  origin_country: string | null
  /** ISO 3166-2 — ver `subdivisions_reference`. */
  origin_state: string | null
  origin: string | null
  weight_g: number | null
  dimensions: string | null
  /** Classe de tamanho escolhida manualmente (0031). Nulo = calculada de `dimensions` (ver sizeClass.ts). */
  size_class: SizeClass | null

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
  /** Rochas da amostra (0032) — ver `store_product_rocks`. Vem embutido no SELECT de `store_products`, ordenado por `sort_order`. */
  rocks?: StoreProductRock[]

  /** @deprecated Legado (Lapidação em texto livre) — substituído por `cut_type`/`cut_name` abaixo. Preservado só pra não perder dado de produtos antigos. */
  gem_cut: string | null
  weight_ct: number | null

  /** Mineral lapidado — checkbox "Lapidado (Gema)", igual ao catálogo pessoal. Os 5 campos abaixo só se aplicam com `is_gem = true`. */
  is_gem: boolean
  cut_type: string | null
  gem_shape: string | null
  /** Só faz sentido com `cut_type` "Facetado" ou "Misto". */
  gem_cut_style: string | null
  cut_name: string | null
  gem_treatment: string | null

  met_class: string | null
  /** @deprecated Legado (Grupo e Tipo juntos num campo só) — substituído por `met_group`/`met_type` abaixo. */
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

  /** Campos exclusivos de meteorito adicionados pra paridade com o catálogo
   *  pessoal (migration 0019_meteorite_fields_parity.sql) — texto livre
   *  gravando o valor da opção escolhida no select/toggle correspondente. */
  met_category: string | null
  met_group: string | null
  met_type: string | null
  met_age: string | null
  /** 'Sim' | 'Não' | '' (— = não informado). */
  met_fall_observed: string | null
  met_fall_date: string | null
  met_found_date: string | null
  met_largest_fragment: string | null
  met_largest_fragment_dimensions: string | null
  /** 'Sim' | 'Não' | 'Parcial'. */
  met_crust_fusion: string | null
  /** Mesma escala de `met_weathering`, mas do EXEMPLAR (não da queda em geral). */
  met_weathering_specimen: string | null
  met_acid_etched: string | null
  met_magnetism: string | null
  /** Toggles Sim/vazio (não boolean — mesmo padrão do resto do app). */
  met_individual_fragment: string | null
  met_end_cut: string | null
  met_chondrules_visible: string | null
  met_metal_matrix_visible: string | null
  met_olivine_visible: string | null
  met_polished: string | null
  met_cut_sliced: string | null
  met_polished_window: string | null
  /** Corpo de origem (0032): mars | moon | vesta | asteroid_belt | unknown. Oculto na categoria Impactito. */
  met_parent_body: string | null

  /** Campos exclusivos de joia (`kind='jewelry'`) — ver `form/jewelryFields.ts`/`form/JewelryDataSection.tsx`. */
  jwl_material: string | null
  /** Pedra central / gema engastada, texto livre. */
  jwl_stone: string | null
  /** Aro (anel) ou comprimento (colar/pulseira), texto livre. */
  jwl_size: string | null
  jwl_clasp: string | null
  jwl_finish: string | null
  /** 'Sim' | 'Não' | '' — mesmo padrão de toggle Sim/vazio dos campos de meteorito. */
  jwl_adjustable: string | null

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

  // Dados fiscais (0035) — espelham a seção "Nota fiscal" da Nuvemshop.
  /** Origem da mercadoria, 0 a 8 (tabela A do ICMS). */
  tax_origin: number | null
  fiscal_type: StoreFiscalType | null
  /** 8 dígitos, sem máscara. */
  ncm: string | null
  /** 7 dígitos, sem máscara. */
  cest: string | null

  // Paridade com o item da coleção (0036) — mesmos nomes/semântica do catálogo pessoal.
  /** Localidade resumida (override manual de `origin`, como `specimens.origin_short`). */
  origin_short: string | null
  /** Características cristalográficas — multi-valor separado por vírgula (vocabulário em `form/crystalFeatures.ts`). */
  crystal_features: string | null
  /** Tratamento do exemplar, para todos os tipos (substitui `gem_treatment` na UI). */
  treatment: string | null
  /** Cor da fosforescência — condicional a "Fosforescência" em Propriedades especiais. */
  phosphorescence_color: string | null
  fossil_restoration: string | null
  /** Rocha hospedeira / matriz do fóssil. */
  fossil_host_rock: string | null
  /** Fornecedor cadastrado (`suppliers`), código dele e data de aquisição — direto no produto. */
  supplier_id: string | null
  supplier_code: string | null
  acquisition_date: string | null

  created_at: string
  updated_at: string
  /** Lixeira (0027) — soft delete, 15 dias de retenção. Ver `features/trash/`. */
  deleted_at: string | null
}

export type StoreProductInput = Partial<Omit<StoreProduct, 'id' | 'owner_id' | 'created_at' | 'updated_at'>> &
  Pick<StoreProduct, 'name'>

/** Ex-dono do produto (0036) — espelho de `specimen_provenance` do catálogo pessoal (só o lado "antes do dono"). */
export interface StoreProductProvenance {
  id: string
  owner_id: string
  product_id: string
  name: string
  /** Cadastro vinculado em `suppliers` (opcional). */
  party_id: string | null
  /** Data em que este dono adquiriu a peça; com precisão `year`, só o ano vale. */
  acquired_on: string | null
  acquired_precision: 'year' | 'month' | 'day' | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type StoreProductProvenanceInput = Pick<StoreProductProvenance, 'name'> &
  Partial<Pick<StoreProductProvenance, 'party_id' | 'acquired_on' | 'acquired_precision' | 'notes' | 'sort_order'>>

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

/** Uma rocha dentro de um produto (0032) — mesmo modelo de `specimen_rocks` do catálogo pessoal. Valores de vocabulário são chaves em inglês (ex.: 'igneous'); `texture` é multi-valor (texto separado por vírgula). */
export interface StoreProductRock {
  id: string
  owner_id: string
  product_id: string
  name: string | null
  rock_type: string | null
  subtype: string | null
  grain_size: string | null
  texture: string | null
  structure: string | null
  color_index: string | null
  hcl_reaction: string | null
  role: string | null
  protolith: string | null
  cement: string | null
  grain_roundness: string | null
  crater: string | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type StoreProductRockInput = Partial<Omit<StoreProductRock, 'id' | 'owner_id' | 'product_id' | 'created_at' | 'updated_at'>>

/** Prefixo de SKU (0020) — um padrão por `kind` (`match_key` vazio) e, opcionalmente, um customizado por espécie/nome (`match_key` = nome normalizado). String vazia, não null: NULL não colide em unique constraint. `is_gem` (0021) marca a linha padrão de GEMA (mineral com `is_gem=true`) — só faz sentido com `kind='mineral'` e `match_key=''`; species (`match_key` não-vazio) sempre tem `is_gem=false`. Ver `suggestSku` em `features/products/skuPrefixes.ts`. */
export interface StoreSkuPrefix {
  id: string
  owner_id: string
  kind: StoreItemKind
  match_key: string
  is_gem: boolean
  prefix: string
  digits: number
  created_at: string
  updated_at: string
}

export type StoreSkuPrefixInput = Partial<Omit<StoreSkuPrefix, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>

// ------------------------------------------------------------
// Documentos — tabela COMPARTILHADA com o catálogo pessoal (`documents`,
// `document_files`, `document_payments`, `document_holders`, `carriers`).
// Tipos copiados de `src/types/db.ts` do catálogo; a loja lista só
// `in_store = true` (0203 do catálogo + 0038 daqui). Ver claude.md §2.
// ------------------------------------------------------------

/** Seção de documento (0158) — cada uma é independente/opcional, não um modo exclusivo. */
export type DocumentSection = 'nfe' | 'import' | 'payment' | 'shipping'
export type CustomsDeclarationType = 'DIR' | 'DI' | 'DSI' | 'DUIMP'

/** Titular do documento (pool global reutilizável, tabela `document_holders`, snapshotado em documents.holder_*). */
export interface DocumentHolder {
  id: string
  owner_id: string
  name: string
  tax_id: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  owner_id: string
  year: number | null
  holder_name: string | null
  holder_tax_id: string | null
  /** Snapshot do nome como consta na nota; o cadastro vivo é `supplier_id` (0151). */
  supplier_name: string | null
  supplier_id: string | null
  supplier_storefront_id: string | null
  issue_date: string | null
  notes: string | null
  created_at: string
  updated_at: string

  // NF-e
  nfe_number: string | null
  nfe_series: string | null
  nfe_key: string | null
  nfe_protocol: string | null
  supplier_tax_id: string | null
  recipient_tax_id: string | null
  item_description: string | null
  item_quantity: number | null
  item_line_total: number | null
  item_allocated_value: number | null
  xml_url: string | null

  // Importação
  invoice_number: string | null
  awb: string | null
  purchase_country: string | null
  shipped_date: string | null
  arrival_date: string | null
  customs_type: CustomsDeclarationType | null
  customs_number: string | null
  carrier: string | null
  declared_contents: string | null
  shipment_weight_kg: number | null
  /** Sempre em US$. */
  goods_usd: number | null
  /** Sempre em US$. */
  freight_usd: number | null
  /** Taxa de câmbio (BRL por US$) usada no cálculo do custo total. */
  exchange_rate: number | null
  taxes_brl: number | null
  import_cost_brl: number | null

  /** Data geral do documento (data da compra, 0176) — a mostrada na pílula da ficha do espécime. */
  document_date: string | null

  /** Valores reais da compra (0201), independentes das seções; o total é a soma, calculada no app (`documentAmountsTotal`). */
  goods_amount: number | null
  freight_amount: number | null
  /** Impostos e taxas. */
  fees_amount: number | null
  /** Moeda única dos três valores acima (ISO 4217); 'BRL' por padrão. */
  amounts_currency: string

  // Seções independentes (0158, renomeadas na 0177) — fonte de verdade da UI, ver DocumentSection acima.
  has_nfe: boolean
  has_import: boolean
  has_payment: boolean
  has_shipping: boolean

  // Comprovante de pagamento
  payment_date: string | null
  payment_amount: number | null
  payment_method: string | null

  // Comprovante de Envio interno (transporte doméstico, distinto do AWB internacional de Importação)
  shipping_carrier: string | null
  shipping_tracking: string | null
  shipping_sent_date: string | null
  shipping_delivered_date: string | null

  /** Observações dos dados gerais (0203) — informações adicionais do documento. `notes` fica junto dos arquivos. */
  general_notes: string | null

  /** Tabela compartilhada com o App Loja (0203): o catálogo lista só `in_collection`, a loja só `in_store`. */
  in_collection: boolean
  in_store: boolean

  /** Nota fiscal de SAÍDA: venda da loja (0038). Compra usa `supplier_id`. */
  store_sale_id: string | null

  /** Soft delete (tombstone) — null = vivo. Ver 0029. */
  deleted_at: string | null
}

/**
 * Comprovante de pagamento de um documento (0199) — vários por documento, cada
 * um com moeda própria. As fotos/PDFs ficam na galeria da seção 'payment'.
 */
export interface DocumentPayment {
  id: string
  owner_id: string
  document_id: string
  payment_date: string | null
  amount: number | null
  /** ISO 4217 em maiúsculas; 'BRL' por padrão. */
  currency: string
  method: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * Linha de produto da nota fiscal (0204) — quadro "Dados dos produtos" do
 * DANFE. Substitui o item único `documents.item_*`. Preenchida à mão ou pelo XML.
 */
export interface DocumentItem {
  id: string
  owner_id: string
  document_id: string
  sort_order: number
  /** Código do produto no fornecedor. */
  product_code: string | null
  description: string | null
  ncm: string | null
  cfop: string | null
  /** Unidade comercial (KG, UN, G, CT...). */
  unit: string | null
  quantity: number | null
  unit_price: number | null
  total: number | null
  created_at: string
  updated_at: string
}

/** Vínculo N:N documento↔produto da loja (0038, espelho de `document_specimens`). */
export interface DocumentStoreProduct {
  id: string
  owner_id: string
  document_id: string
  product_id: string
  created_at: string
}

export type DocumentFileKind = 'pdf' | 'image'
/** 'general' = galeria comum (comportamento pré-0158); as demais filtram a mini-galeria de cada seção. */
export type DocumentFileSection = 'general' | DocumentSection

/** Um arquivo (PDF ou imagem) anexado ao documento, com legenda opcional. */
export interface DocumentFile {
  id: string
  owner_id: string
  document_id: string
  kind: DocumentFileKind
  storage_path: string
  caption: string | null
  sort_order: number
  /** Seção a que pertence (0158) — default 'geral' pros arquivos anteriores à migration. */
  section: DocumentFileSection
  /** Comprovante (document_payments) dono do arquivo, só em section 'payment' (0200); nulo = sem comprovante definido. */
  payment_id: string | null
  created_at: string
  updated_at: string
}

export interface Carrier {
  id: string
  owner_id: string
  name: string
  created_at: string
  updated_at: string
}

/** Certificado de autenticidade do produto (laudo de laboratório) — na ficha
 *  do item, não em Documentos (ver claude.md §"certificado"). */
export interface StoreProductCertificate {
  id: string
  owner_id: string
  product_id: string
  lab: string | null
  code: string | null
  link: string | null
  notes: string | null
  pdf_path: string | null
  image_path: string | null
  sort_order: number
  created_at: string
  updated_at: string
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
  /** Lixeira (0027) — soft delete, 15 dias de retenção. Ver `features/trash/`. */
  deleted_at: string | null
}

/** Telefone adicional do fornecedor (`extra_phones`, 0181 do catálogo). `label` pode ser "". */
export interface PhoneEntry {
  value: string
  whatsapp: boolean
  label: string
}

/** E-mail adicional do fornecedor (`extra_emails`, 0181 do catálogo). `label` pode ser "". */
export interface EmailEntry {
  value: string
  label: string
}

/**
 * Fornecedor — tabela `suppliers` COMPARTILHADA com o catálogo pessoal
 * (migration 0151 do catálogo + 0029 daqui). A loja lista só `in_store`;
 * `in_collection` é do catálogo. O nome `StoreSupplier` ficou por histórico.
 */
export interface StoreSupplier {
  id: string
  owner_id: string
  name: string
  /** Vazio (null) = pessoa física/jurídica não informada (0197 do catálogo). */
  kind: 'person' | 'company' | null
  legal_name: string | null
  tax_id: string | null
  tax_id_type: 'cnpj' | 'cpf' | 'foreign' | null
  /** E-mail principal; os demais ficam em `extra_emails` (0181 do catálogo). */
  email: string | null
  email_label: string | null
  extra_emails: EmailEntry[]
  /** Telefone principal; os demais ficam em `extra_phones` (0181 do catálogo). */
  phone: string | null
  phone_is_whatsapp: boolean
  phone_label: string | null
  extra_phones: PhoneEntry[]
  website: string | null
  address_zip: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_district: string | null
  address_city: string | null
  address_state: string | null
  address_country: string | null
  aliases: string[]
  /** Redes sociais (0155) — `value` é @perfil ou URL; ver features/suppliers/socialLinks.ts no catálogo. */
  social_links: SupplierSocialLink[]
  notes: string | null
  in_collection: boolean
  in_store: boolean
  /** Papéis (0193 do catálogo): vende para o dono / compra do dono. Os dois falsos = contato. */
  is_supplier: boolean
  is_customer: boolean
  /** Lixeira (0180 do catálogo / 0027): hoje só clientes puros usam a coluna na loja. */
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface StoreSale {
  id: string
  owner_id: string
  customer_id: string | null
  sale_date: string
  payment_method: StorePaymentMethod
  discount: number
  extra_amount: number
  total: number
  notes: string | null
  created_at: string
  /** Fiado (0028) — `paid=false` + `due_date` marca venda a prazo, listada em
   *  "Contas a receber" (Caixa) até `markSalePaid`. Venda à vista (padrão)
   *  nasce `paid=true`/`due_date=null`, sem UI nova pra ela. */
  due_date: string | null
  paid: boolean
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

/** Entrada de estoque (0023) — restock lançado à mão (data/quantidade/custo/
 *  fornecedor/documento opcionais); soma em `store_products.stock_quantity`
 *  via a RPC `create_store_stock_entry` (não por update direto). Complementa
 *  `StoreSaleItem` (saída) no histórico do produto, ver
 *  `ProductStockHistorySection.tsx`. */
export interface StoreStockEntry {
  id: string
  owner_id: string
  product_id: string
  quantity: number
  unit_cost: number | null
  supplier_id: string | null
  document_id: string | null
  entry_date: string
  notes: string | null
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

/** Um perfil de rede social do fornecedor (`suppliers.social_links`, 0155). */
export interface SupplierSocialLink {
  network: string
  value: string
}

import { supabase } from '../../lib/supabase'
import type { StoreItemKind, StoreProductInput } from '../../types/db'
import { createProduct, addProductMineral, addFossilSpecies, linkQrAlias } from './api'
import { addYoutubeVideo } from './youtubeVideos'

// ============================================================
// Importar da Coleção pessoal (Tesouros da Terra) pra Produtos da loja.
//
// Mesmo projeto Supabase (ver claude.md §1) — lê direto as tabelas do
// catálogo pessoal (`specimens` e satélites) com o client desta app, sem
// Edge Function própria. Só os campos usados aqui estão tipados; não
// reaproveita src/types/db.ts do catálogo pessoal (repositório separado,
// convenção de cópia — claude.md §2), então essas interfaces são um
// subconjunto local, não um espelho completo.
//
// Regra da transferência (docs/PROJETO-APP-LOJA.md §5, decisão de
// 18/08/2026 revista nesta sessão): o produto novo nasce com O MESMO uuid
// do specimen de origem — não um `source_specimen_id` de FK solta. Isso
// mantém etiqueta QR física, histórico e o vínculo dos dois lados usando a
// MESMA chave, sem tabela de alias nem sincronização. O specimen original
// nunca é apagado: fica marcado `is_sold = true` no catálogo (mesmo campo
// que já existe pra "ex-coleção"), o que já o esconde da listagem padrão.
// ============================================================

type CatalogSpecimenType = 'mineral' | 'fossil' | 'meteorite'

interface CatalogMedia {
  id: string
  kind: 'image' | 'video'
  storage_path: string
  is_cover: boolean
  sort_order: number
}

interface CatalogYoutubeVideo {
  id: string
  youtube_id: string
  title: string | null
  sort_order: number
}

interface CatalogMineralDetails {
  species: string | null
  special_properties: string | null
  is_gem: boolean
  cut_type: string | null
  gem_shape: string | null
  gem_cut_style: string | null
  cut_name: string | null
  gem_treatment: string | null
  color: string | null
  color_secondary: string | null
  uv_color: string | null
  iridescence_color: string | null
  play_of_color: string | null
}

interface CatalogFossilDetails {
  display_name: string | null
  restoration: string | null
  period_era: string | null
  age: string | null
}

interface CatalogMeteoriteDetails {
  name: string | null
  category: string | null
  classification: string | null
  group_name: string | null
  type_name: string | null
  structure: string | null
  material: string | null
  shock: string | null
  weathering: string | null
  age: string | null
  fall_observed: boolean | null
  fall_date: string | null
  found_date: string | null
  total_mass: string | null
  largest_fragment: string | null
  largest_fragment_dimensions: string | null
  crust_fusion: string | null
  weathering_specimen: string | null
  chondrules_visible: string | null
  cut_sliced: string | null
  polished: string | null
  acid_etched: string | null
  individual_fragment: string | null
  end_cut: string | null
  polished_window: string | null
  metal_matrix_visible: string | null
  olivine_visible: string | null
  magnetism: string | null
}

interface CatalogSpecimenMineral {
  name: string
  mineral_reference_id: string | null
  formula: string | null
  formula_name: string | null
  mineral_class: string | null
  group_name: string | null
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
  color_cause: string | null
  chromophore: string | null
  auto_fields: string[]
  sort_order: number
}

interface CatalogFossilSpecies {
  name: string | null
  popular_name: string | null
  quantity: number
  integrity: string | null
  specimen_dimensions: string | null
  kingdom: string | null
  taxon_type: string | null
  phylum: string | null
  taxon_class: string | null
  taxon_order: string | null
  family: string | null
  clades: string | null
  sort_order: number
}

interface CatalogSpecimenFull {
  id: string
  code_global: number | null
  sku: string | null
  parent_id: string | null
  type: CatalogSpecimenType
  origin_country: string | null
  origin_state: string | null
  origin: string | null
  origin_short: string | null
  formation: string | null
  weight_g: number | null
  weight_ct: number | null
  dimensions: string | null
  quantity: number
  notes: string | null
  mineral_details: CatalogMineralDetails | null
  fossil_details: CatalogFossilDetails | null
  meteorite_details: CatalogMeteoriteDetails | null
  specimen_minerals: CatalogSpecimenMineral[]
  fossil_species: CatalogFossilSpecies[]
}

interface CatalogSpecimenPrivate {
  price_net_brl: number | null
  price_gross_brl: number | null
  previous_owner: string | null
  purchase_notes: string | null
}

export interface ImportableSpecimen {
  id: string
  code_global: number | null
  type: CatalogSpecimenType
  displayName: string
  origin: string | null
}

const LIST_SELECT = `id, code_global, type, origin,
  mineral_details(species),
  fossil_details(display_name),
  fossil_species(name, popular_name),
  meteorite_details(name)`

/**
 * Specimens elegíveis: vivos, ainda "na coleção" (não marcados ex-coleção) e
 * que ainda não foram importados (nenhum `store_products` com o mesmo id —
 * como o produto nasce com o MESMO uuid do specimen, essa checagem é só um
 * `not.in`, sem precisar de coluna de vínculo nova em nenhum dos dois lados).
 */
export async function fetchImportableSpecimens(): Promise<ImportableSpecimen[]> {
  const { data: existing, error: existingError } = await supabase.from('store_products').select('id')
  if (existingError) throw existingError
  const alreadyImported = new Set((existing ?? []).map((p) => p.id as string))

  const { data, error } = await supabase
    .from('specimens')
    .select(LIST_SELECT)
    .is('deleted_at', null)
    .eq('is_sold', false)
    .order('code_global', { ascending: true, nullsFirst: false })
  if (error) throw new Error(`Falha ao buscar a coleção: ${error.message}`)

  type Row = {
    id: string
    code_global: number | null
    type: CatalogSpecimenType
    origin: string | null
    mineral_details: { species: string | null } | null
    fossil_details: { display_name: string | null } | null
    fossil_species: { name: string | null; popular_name: string | null }[]
    meteorite_details: { name: string | null } | null
  }

  return (data as unknown as Row[])
    .filter((s) => !alreadyImported.has(s.id))
    .map((s) => ({
      id: s.id,
      code_global: s.code_global,
      type: s.type,
      origin: s.origin,
      displayName: catalogDisplayName(s),
    }))
}

/** Remove o prefixo decorativo do código, se houver ("#000123" → "000123"). */
function stripCodePrefix(value: string): string {
  return value.replace(/^[^0-9A-Za-z]+/, '')
}

/** Mesma normalização de `features/products/qr.ts` — maiúsculas, sem espaço
 *  nas pontas, sem prefixo decorativo. */
export function normalizeScannedValue(value: string): string {
  return stripCodePrefix(value.trim().toUpperCase())
}

const UUID_SHAPE = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/
export function isUuidLike(value: string): boolean {
  return UUID_SHAPE.test(value)
}

/**
 * Acha, na lista de specimens elegíveis já carregada pelo diálogo de
 * importação, o item correspondente a um valor escaneado/digitado — pelo
 * `id` puro primeiro (resolução local, sem ida ao servidor). Se não achar E
 * o valor tiver formato de uuid, tenta como um ALIAS de etiqueta impressa
 * depois (`specimen_qr_aliases`, mesmo mecanismo do catálogo pessoal) — aí
 * sim precisa de uma consulta, porque os aliases não vêm na lista leve do
 * diálogo. Devolve `null` também quando o specimen existe mas não está mais
 * elegível (já vendido/importado) — a UI trata isso como "não encontrado".
 */
export async function resolveScannedSpecimen(
  specimens: ImportableSpecimen[],
  value: string,
): Promise<ImportableSpecimen | null> {
  const needle = normalizeScannedValue(value)
  if (!needle) return null

  const direct = specimens.find((s) => s.id.toUpperCase() === needle)
  if (direct) return direct
  if (!isUuidLike(needle)) return null

  const { data } = await supabase.from('specimen_qr_aliases').select('specimen_id').eq('id', needle).maybeSingle()
  const specimenId = data?.specimen_id as string | undefined
  if (!specimenId) return null
  return specimens.find((s) => s.id === specimenId) ?? null
}

function catalogDisplayName(s: {
  type: CatalogSpecimenType
  mineral_details: { species: string | null } | null
  fossil_details: { display_name: string | null } | null
  fossil_species: { name: string | null; popular_name: string | null }[]
  meteorite_details: { name: string | null } | null
}): string {
  if (s.type === 'mineral') return s.mineral_details?.species || '(sem espécie)'
  if (s.type === 'fossil') {
    if (s.fossil_details?.display_name) return s.fossil_details.display_name
    const names = s.fossil_species.map((f) => f.name).filter((v): v is string => !!v)
    if (names.length > 0) return names.join(' + ')
    const popular = s.fossil_species.map((f) => f.popular_name).filter((v): v is string => !!v)
    return popular.join(' + ') || '(sem espécie)'
  }
  return s.meteorite_details?.name || '(sem nome)'
}

const FULL_SELECT = `id, code_global, sku, parent_id, type, origin_country, origin_state, origin, origin_short,
  formation, weight_g, weight_ct, dimensions, quantity, notes,
  mineral_details(*),
  fossil_details(*),
  meteorite_details(*),
  specimen_minerals(*),
  fossil_species(*)`

async function fetchCatalogSpecimen(id: string): Promise<CatalogSpecimenFull> {
  const { data, error } = await supabase.from('specimens').select(FULL_SELECT).eq('id', id).single()
  if (error) throw new Error(`Falha ao carregar o espécime: ${error.message}`)
  return data as unknown as CatalogSpecimenFull
}

async function fetchCatalogPrivate(id: string): Promise<CatalogSpecimenPrivate | null> {
  const { data, error } = await supabase
    .from('specimen_private')
    .select('price_net_brl, price_gross_brl, previous_owner, purchase_notes')
    .eq('specimen_id', id)
    .maybeSingle()
  if (error) return null // Dado privado é um extra (custo/procedência) — a importação não pode falhar por causa dele.
  return data
}

async function fetchCatalogMedia(specimenId: string): Promise<CatalogMedia[]> {
  const { data, error } = await supabase
    .from('media')
    .select('id, kind, storage_path, is_cover, sort_order')
    .eq('specimen_id', specimenId)
    .is('deleted_at', null)
    .order('sort_order')
  if (error) throw new Error(`Falha ao listar mídia do espécime: ${error.message}`)
  return data as unknown as CatalogMedia[]
}

async function fetchCatalogYoutubeVideos(specimenId: string): Promise<CatalogYoutubeVideo[]> {
  const { data, error } = await supabase
    .from('specimen_youtube_videos')
    .select('id, youtube_id, title, sort_order')
    .eq('specimen_id', specimenId)
    .is('deleted_at', null)
    .order('sort_order')
  if (error) throw new Error(`Falha ao listar vídeos do espécime: ${error.message}`)
  return data as unknown as CatalogYoutubeVideo[]
}

/** Linhas "Rótulo: valor" pra dados que o schema mais enxuto da loja não tem
 *  campo próprio — em vez de perder silenciosamente, viram um bloco de texto
 *  ao final das notas do produto. */
function buildAppendix(lines: [string, string | number | boolean | null | undefined][]): string {
  const rows = lines.filter(([, v]) => v != null && v !== '').map(([label, v]) => `${label}: ${v}`)
  return rows.join('\n')
}

function joinNotes(base: string | null, appendix: string): string | null {
  if (!appendix) return base
  const header = '— Dados importados da coleção —'
  return base ? `${base}\n\n${header}\n${appendix}` : `${header}\n${appendix}`
}

function mapToProductInput(s: CatalogSpecimenFull, priv: CatalogSpecimenPrivate | null): StoreProductInput {
  let kind: StoreItemKind
  let name: string
  let speciesOrType: string | null = null
  let isGem = false
  let cutType: string | null = null
  let gemShape: string | null = null
  let gemCutStyle: string | null = null
  let cutName: string | null = null
  let gemTreatment: string | null = null
  let weightCt: number | null = null
  const extra: [string, string | number | boolean | null | undefined][] = []

  let metClass: string | null = null
  let metTypeGroup: string | null = null
  let metGroup: string | null = null
  let metType: string | null = null
  let metStructure: string | null = null
  let metMaterial: string | null = null
  let metShock: string | null = null
  let metWeathering: string | null = null
  let metTotalMass: string | null = null
  let metCategory: string | null = null
  let metAge: string | null = null
  let metFallObserved: string | null = null
  let metFallDate: string | null = null
  let metFoundDate: string | null = null
  let metLargestFragment: string | null = null
  let metLargestFragmentDimensions: string | null = null
  let metCrustFusion: string | null = null
  let metWeatheringSpecimen: string | null = null
  let metAcidEtched: string | null = null
  let metMagnetism: string | null = null
  let metIndividualFragment: string | null = null
  let metEndCut: string | null = null
  let metChondrulesVisible: string | null = null
  let metMetalMatrixVisible: string | null = null
  let metOlivineVisible: string | null = null
  let metPolished: string | null = null
  let metCutSliced: string | null = null
  let metPolishedWindow: string | null = null

  let color: string | null = null
  let colorSecondary: string | null = null
  let specialProperties: string | null = null
  let uvColor: string | null = null
  let iridescenceColor: string | null = null
  let playOfColor: string | null = null

  if (s.type === 'mineral') {
    const md = s.mineral_details
    // "Gema" não é mais um `kind` à parte na loja — vira `is_gem` na mesma
    // linha, igual ao catálogo pessoal (checkbox, não tipo). Ver migration
    // 0018_gem_as_mineral_property.sql.
    kind = 'mineral'
    speciesOrType = md?.species ?? null
    name = md?.species || s.specimen_minerals[0]?.name || '(sem espécie)'
    color = md?.color ?? null
    colorSecondary = md?.color_secondary ?? null
    specialProperties = md?.special_properties ?? null
    uvColor = md?.uv_color ?? null
    iridescenceColor = md?.iridescence_color ?? null
    playOfColor = md?.play_of_color ?? null
    if (md?.is_gem) {
      isGem = true
      cutType = md.cut_type || null
      gemShape = md.gem_shape || null
      gemCutStyle = md.gem_cut_style || null
      cutName = md.cut_name || null
      gemTreatment = md.gem_treatment || null
      weightCt = s.weight_ct
    }
  } else if (s.type === 'fossil') {
    kind = 'fossil'
    name = s.fossil_details?.display_name || s.fossil_species.map((f) => f.name).filter(Boolean).join(' + ') || '(sem espécie)'
    speciesOrType = s.fossil_species[0]?.name ?? null
    extra.push(['Restauração', s.fossil_details?.restoration])
    // Integridade/dimensões são por espécie no catálogo pessoal, mas
    // `store_product_fossil_species` não tem campo próprio pra isso — cada
    // uma vira uma linha no apêndice do produto em vez de se perder.
    for (const f of s.fossil_species) {
      if (!f.integrity && !f.specimen_dimensions) continue
      const label = f.name || f.popular_name || 'Espécie sem nome'
      extra.push([`${label} — integridade`, f.integrity])
      extra.push([`${label} — dimensões do exemplar`, f.specimen_dimensions])
    }
  } else {
    kind = 'meteorite'
    const md = s.meteorite_details
    name = md?.name || '(sem nome)'
    metClass = md?.classification ?? null
    // Legado (Grupo+Tipo juntos) preservado; Grupo e Tipo também vão pras
    // colunas próprias novas (migration 0019), pra bater com o formulário atual.
    metTypeGroup = [md?.group_name, md?.type_name].filter(Boolean).join(' / ') || null
    metGroup = md?.group_name ?? null
    metType = md?.type_name ?? null
    metStructure = md?.structure ?? null
    metMaterial = md?.material ?? null
    metShock = md?.shock ?? null
    metWeathering = md?.weathering ?? null
    metTotalMass = md?.total_mass ?? null
    metCategory = md?.category ?? null
    metAge = md?.age ?? null
    metFallObserved = md?.fall_observed == null ? null : md.fall_observed ? 'Sim' : 'Não'
    metFallDate = md?.fall_date ?? null
    metFoundDate = md?.found_date ?? null
    metLargestFragment = md?.largest_fragment ?? null
    metLargestFragmentDimensions = md?.largest_fragment_dimensions ?? null
    metCrustFusion = md?.crust_fusion ?? null
    metWeatheringSpecimen = md?.weathering_specimen ?? null
    metAcidEtched = md?.acid_etched ?? null
    metMagnetism = md?.magnetism ?? null
    metIndividualFragment = md?.individual_fragment ?? null
    metEndCut = md?.end_cut ?? null
    metChondrulesVisible = md?.chondrules_visible ?? null
    metMetalMatrixVisible = md?.metal_matrix_visible ?? null
    metOlivineVisible = md?.olivine_visible ?? null
    metPolished = md?.polished ?? null
    metCutSliced = md?.cut_sliced ?? null
    metPolishedWindow = md?.polished_window ?? null
  }

  if (s.parent_id) extra.push(['Lote', 'peça filha de um lote no catálogo pessoal'])
  if (priv?.previous_owner) extra.push(['Proprietário anterior', priv.previous_owner])
  if (priv?.purchase_notes) extra.push(['Notas de compra', priv.purchase_notes])

  const costPrice = priv?.price_net_brl ?? priv?.price_gross_brl ?? null

  return {
    name,
    kind,
    species_or_type: speciesOrType,
    sku: s.sku,
    cost_price: costPrice,
    sale_price: 0,
    stock_quantity: s.quantity,
    notes: joinNotes(s.notes, buildAppendix(extra)),

    origin_country: s.origin_country,
    origin_state: s.origin_state,
    origin: s.origin_short || s.origin,
    weight_g: s.weight_g,
    dimensions: s.dimensions,

    color,
    color_secondary: colorSecondary,
    special_properties: specialProperties,
    uv_color: uvColor,
    iridescence_color: iridescenceColor,
    play_of_color: playOfColor,

    is_gem: isGem,
    cut_type: cutType,
    gem_shape: gemShape,
    gem_cut_style: gemCutStyle,
    cut_name: cutName,
    gem_treatment: gemTreatment,
    weight_ct: weightCt,

    met_class: metClass,
    met_type_group: metTypeGroup,
    met_group: metGroup,
    met_type: metType,
    met_structure: metStructure,
    met_material: metMaterial,
    met_shock: metShock,
    met_weathering: metWeathering,
    met_total_mass: metTotalMass,
    met_category: metCategory,
    met_age: metAge,
    met_fall_observed: metFallObserved,
    met_fall_date: metFallDate,
    met_found_date: metFoundDate,
    met_largest_fragment: metLargestFragment,
    met_largest_fragment_dimensions: metLargestFragmentDimensions,
    met_crust_fusion: metCrustFusion,
    met_weathering_specimen: metWeatheringSpecimen,
    met_acid_etched: metAcidEtched,
    met_magnetism: metMagnetism,
    met_individual_fragment: metIndividualFragment,
    met_end_cut: metEndCut,
    met_chondrules_visible: metChondrulesVisible,
    met_metal_matrix_visible: metMetalMatrixVisible,
    met_olivine_visible: metOlivineVisible,
    met_polished: metPolished,
    met_cut_sliced: metCutSliced,
    met_polished_window: metPolishedWindow,
  }
}

async function copyMinerals(productId: string, minerals: CatalogSpecimenMineral[]): Promise<void> {
  for (const m of minerals) {
    await addProductMineral(
      productId,
      {
        name: m.name,
        mineral_reference_id: m.mineral_reference_id,
        formula: m.formula,
        formula_name: m.formula_name,
        mineral_class: m.mineral_class,
        group_name: m.group_name,
        hardness: m.hardness,
        tenacity: m.tenacity,
        cleavage: m.cleavage,
        fracture: m.fracture,
        streak: m.streak,
        density: m.density,
        crystal_system: m.crystal_system,
        luster: m.luster,
        transparency: m.transparency,
        refractive_index: m.refractive_index,
        color_cause: m.color_cause,
        chromophore: m.chromophore,
        auto_fields: m.auto_fields,
      },
      m.sort_order,
    )
  }
}

async function copyFossilSpecies(productId: string, s: CatalogSpecimenFull): Promise<void> {
  for (const f of s.fossil_species) {
    await addFossilSpecies(
      productId,
      {
        name: f.name,
        popular_name: f.popular_name,
        kingdom: f.kingdom,
        phylum: f.phylum,
        taxon_class: f.taxon_class,
        taxon_order: f.taxon_order,
        family: f.family,
        clades: f.clades,
        taxon_type: f.taxon_type,
        formation: s.formation,
        period_era: s.fossil_details?.period_era ?? null,
        age: s.fossil_details?.age ?? null,
        item_count: f.quantity,
      },
      f.sort_order,
    )
  }
}

/**
 * REFERENCIA cada foto/vídeo do specimen no bucket R2 "media" do catálogo
 * pessoal — insere `store_product_media` com `bucket: 'media'` e o MESMO
 * `storage_path`, sem baixar nem subir nada (migration 0017). O objeto
 * continua pertencendo ao catálogo pessoal: a loja só lê (mesmo projeto
 * Supabase, mesma conta, RLS por `owner_id` já libera a leitura); apagar
 * essa linha aqui (`deleteProductMedia`) nunca apaga o arquivo original —
 * ver o guard em `products/api.ts`. Isto substitui uma primeira versão desta
 * função que baixava do R2 do catálogo e reenviava pro Storage Supabase da
 * loja — só existia porque a loja ainda não falava com R2; agora que fala
 * (mesma Edge Function `r2-storage`, bucket "store" liberado), referenciar
 * é sempre possível.
 */
async function copySpecimenMedia(productId: string, specimenId: string): Promise<void> {
  const mediaRows = await fetchCatalogMedia(specimenId)
  if (mediaRows.length === 0) return

  const rows = mediaRows.map((m) => ({
    product_id: productId,
    kind: m.kind,
    bucket: 'media' as const,
    storage_path: m.storage_path,
    is_cover: m.is_cover,
    sort_order: m.sort_order,
  }))
  const { error } = await supabase.from('store_product_media').insert(rows)
  if (error) throw new Error(`Falha ao referenciar mídia do catálogo pessoal: ${error.message}`)
}

async function copyYoutubeVideos(productId: string, specimenId: string): Promise<void> {
  const videos = await fetchCatalogYoutubeVideos(specimenId)
  for (const v of videos) await addYoutubeVideo(productId, v.youtube_id, v.title, v.sort_order)
}

/** Etiquetas QR extras já impressas e vinculadas ao specimen no catálogo
 *  pessoal (`specimen_qr_aliases`) — o produto novo nasce com o MESMO uuid
 *  do specimen (ver comentário no topo do arquivo), então basta recriar cada
 *  alias com o MESMO id, apontando pro produto: a etiqueta física impressa
 *  antes da transferência continua resolvendo sem reimpressão. */
async function fetchCatalogQrAliases(specimenId: string): Promise<string[]> {
  const { data, error } = await supabase.from('specimen_qr_aliases').select('id').eq('specimen_id', specimenId)
  if (error) throw new Error(`Falha ao listar etiquetas QR do espécime: ${error.message}`)
  return (data ?? []).map((r) => r.id as string)
}

async function copyQrAliases(productId: string, specimenId: string): Promise<void> {
  const aliasIds = await fetchCatalogQrAliases(specimenId)
  for (const aliasId of aliasIds) await linkQrAlias(productId, aliasId)
}

async function markSpecimenSold(specimenId: string): Promise<void> {
  const { error } = await supabase.from('specimens').update({ is_sold: true }).eq('id', specimenId)
  if (error) throw new Error(`Produto criado, mas falhou ao marcar o espécime como indisponível na coleção: ${error.message}`)
}

/**
 * Importa um specimen da coleção pessoal como produto novo da loja. O
 * produto nasce com o MESMO id do specimen (mantém o vínculo/etiqueta QR sem
 * FK solta — ver comentário no topo do arquivo) e o specimen de origem é
 * marcado `is_sold = true` (nunca apagado — some da listagem padrão da
 * coleção, mas continua existindo e pode voltar a `is_sold = false` à mão se
 * um dia o dono decidir trazer o item de volta pra coleção).
 */
export async function importSpecimenToStore(specimenId: string): Promise<void> {
  const [specimen, priv] = await Promise.all([fetchCatalogSpecimen(specimenId), fetchCatalogPrivate(specimenId)])
  await createProduct({ ...mapToProductInput(specimen, priv), id: specimen.id })
  await copyMinerals(specimen.id, specimen.specimen_minerals)
  await copyFossilSpecies(specimen.id, specimen)
  await copySpecimenMedia(specimen.id, specimen.id)
  await copyYoutubeVideos(specimen.id, specimen.id)
  await copyQrAliases(specimen.id, specimen.id)
  await markSpecimenSold(specimen.id)
}

import { supabase } from '../../lib/supabase'
import { uploadMedia, removeMedia, buildMediaPath, mediaSignedUrls } from '../../lib/r2Storage'
import type {
  StoreMediaBucket,
  StoreProduct,
  StoreProductInput,
  StoreProductMedia,
  StoreProductQrAlias,
  StoreProductFossilSpecies,
  StoreProductFossilSpeciesInput,
  StoreProductMineral,
  StoreProductMineralInput,
} from '../../types/db'

// Etiquetas QR "alias" (ver `qr.ts`) e Minerais da amostra (0015) embutidos no
// mesmo select — mesmo padrão de `qr_aliases` em `specimens/api.ts` do
// catálogo pessoal: resolver um código lido/digitado, ou mostrar a
// identificação na lista/ficha, é 100% local contra o cache ['products'],
// sem ida extra ao servidor. Diferente de fossil_species (buscado à parte),
// minerals é pequeno o bastante (poucas linhas por produto) pra ir junto.
const PRODUCT_SELECT =
  '*, qr_aliases:store_product_qr_aliases(id, product_id, created_at), minerals:store_product_minerals(*)'

export async function fetchProducts(): Promise<StoreProduct[]> {
  const { data, error } = await supabase
    .from('store_products')
    .select(PRODUCT_SELECT)
    .order('name')
    .order('sort_order', { foreignTable: 'store_product_minerals' })
  if (error) throw error
  return (data ?? []).map((p) => ({ ...p, qr_aliases: p.qr_aliases ?? [], minerals: p.minerals ?? [] })) as StoreProduct[]
}

export async function fetchProduct(id: string): Promise<StoreProduct> {
  const { data, error } = await supabase
    .from('store_products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .order('sort_order', { foreignTable: 'store_product_minerals' })
    .single()
  if (error) throw error
  return { ...data, qr_aliases: data.qr_aliases ?? [], minerals: data.minerals ?? [] } as StoreProduct
}

/** Peças de um lote (0022) — produtos com `parent_id` apontando pro lote. */
export async function fetchProductChildren(parentId: string): Promise<StoreProduct[]> {
  const { data, error } = await supabase
    .from('store_products')
    .select(PRODUCT_SELECT)
    .eq('parent_id', parentId)
    .order('sort_order', { foreignTable: 'store_product_minerals' })
  if (error) throw error
  return (data ?? []).map((p) => ({ ...p, qr_aliases: p.qr_aliases ?? [], minerals: p.minerals ?? [] })) as StoreProduct[]
}

/** `id` opcional: o formulário gera um no cliente quando há fotos/vídeos
 *  escolhidos antes de salvar, pra saber o destino do upload sem um round-trip. */
export async function createProduct(input: StoreProductInput & { id?: string }): Promise<StoreProduct> {
  const { data, error } = await supabase.from('store_products').insert(input).select().single()
  if (error) throw error
  return data
}

/** Aceita PATCH parcial (ex.: só `parent_id`/`lot_suffix` ao vincular/desvincular
 *  uma peça de lote) — diferente de `createProduct`, que insere uma linha nova
 *  e por isso exige `name`. */
export async function updateProduct(id: string, input: Partial<StoreProductInput>): Promise<StoreProduct> {
  const { data, error } = await supabase.from('store_products').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('store_products').delete().eq('id', id)
  if (error) throw error
}

// ─── Mídia ───────────────────────────────────────────────────

export async function fetchProductMedia(productId: string): Promise<StoreProductMedia[]> {
  const { data, error } = await supabase
    .from('store_product_media')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order')
  if (error) throw error
  return data
}

/** Assina um lote de linhas de mídia que pode misturar os dois buckets
 *  (`store` da loja, `media` referenciada do catálogo pessoal) — agrupa por
 *  bucket antes de chamar `mediaSignedUrls`, já que a Edge Function assina
 *  um bucket por chamada. */
async function signMediaRows(
  rows: { storage_path: string; bucket: StoreMediaBucket }[],
  expiresInSeconds?: number,
): Promise<Record<string, string>> {
  const byBucket = new Map<StoreMediaBucket, string[]>()
  for (const r of rows) {
    const list = byBucket.get(r.bucket) ?? []
    list.push(r.storage_path)
    byBucket.set(r.bucket, list)
  }
  const signed: Record<string, string> = {}
  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, paths]) => {
      const urls = await mediaSignedUrls(bucket, paths, expiresInSeconds).catch(() => ({}))
      Object.assign(signed, urls)
    }),
  )
  return signed
}

/**
 * Foto de capa de cada produto, já com URL assinada — uma consulta e um lote de
 * assinaturas para a grade inteira, em vez de uma por card. Capa = a marcada
 * `is_cover`, ou a primeira imagem por `sort_order`.
 */
export async function fetchCoverUrls(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('store_product_media')
    .select('product_id,storage_path,bucket,is_cover,sort_order')
    .eq('kind', 'image')
    .order('is_cover', { ascending: false })
    .order('sort_order')
  if (error || !data) return {}

  const rowByProduct = new Map<string, { storage_path: string; bucket: StoreMediaBucket }>()
  for (const row of data as unknown as { product_id: string; storage_path: string; bucket: StoreMediaBucket }[]) {
    if (!rowByProduct.has(row.product_id)) rowByProduct.set(row.product_id, row)
  }
  if (rowByProduct.size === 0) return {}

  const signed = await signMediaRows([...rowByProduct.values()])
  const urls: Record<string, string> = {}
  for (const [productId, row] of rowByProduct) {
    const url = signed[row.storage_path]
    if (url) urls[productId] = url
  }
  return urls
}

/**
 * Fotos de cada produto (só imagens, vídeo não entra nas planilhas), com
 * URLs assinadas de validade longa — usado no export CSV pra Shopify, cuja
 * importação baixa as imagens da URL em vez de receber o arquivo, e pode não
 * rodar na hora. Nuvemshop não aceita imagem por planilha, então não usa isso.
 */
export async function fetchMediaForExport(productIds: string[]): Promise<Record<string, string[]>> {
  if (productIds.length === 0) return {}
  const { data, error } = await supabase
    .from('store_product_media')
    .select('product_id,storage_path,bucket')
    .in('product_id', productIds)
    .eq('kind', 'image')
    .order('is_cover', { ascending: false })
    .order('sort_order')
  if (error || !data) return {}

  const rows = data as unknown as { product_id: string; storage_path: string; bucket: StoreMediaBucket }[]
  const signed = await signMediaRows(
    rows,
    60 * 60 * 24 * 7, // 7 dias — tempo pro dono revisar e subir o CSV na plataforma
  )
  const out: Record<string, string[]> = {}
  for (const row of rows) {
    const url = signed[row.storage_path]
    if (!url) continue
    ;(out[row.product_id] ??= []).push(url)
  }
  return out
}

/** Sempre sobe pro bucket 'store' (próprio da loja) — mídia REFERENCIADA do
 *  catálogo pessoal (bucket 'media') é inserida direto por
 *  `importFromCollection.ts`, nunca passa por upload. */
export async function uploadProductMedia(productId: string, file: File): Promise<StoreProductMedia> {
  const { data: userData } = await supabase.auth.getUser()
  const ownerId = userData.user?.id
  if (!ownerId) throw new Error('Sessão expirada.')

  const path = buildMediaPath(ownerId, 'products', productId, file.name)
  await uploadMedia('store', path, file, file.type)

  const { data, error } = await supabase
    .from('store_product_media')
    .insert({
      product_id: productId,
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      bucket: 'store',
      storage_path: path,
    })
    .select()
    .single()
  if (error) {
    // Linha não gravou: o arquivo já subido viraria lixo órfão no bucket.
    await removeMedia('store', [path]).catch(() => {})
    throw error
  }
  return data
}

/** Mídia com `bucket='media'` (referenciada do catálogo pessoal) NUNCA é
 *  apagada do R2 aqui — o objeto pertence ao catálogo, apagar só remove o
 *  vínculo local. Só `bucket='store'` (upload próprio da loja) apaga o
 *  arquivo de fato. */
export async function deleteProductMedia(media: StoreProductMedia): Promise<void> {
  const { error } = await supabase.from('store_product_media').delete().eq('id', media.id)
  if (error) throw error
  if (media.bucket === 'store') await removeMedia('store', [media.storage_path]).catch(() => {})
}

// ─── Etiquetas QR "alias" (adaptado de specimens/api.ts do catálogo pessoal) ──

/**
 * Vincula um identificador (uuid) que JÁ ESTÁ NO PAPEL a `productId`. A linha
 * ainda não existe na tabela, então o INSERT leva o id EXPLÍCITO da etiqueta
 * escaneada (não o `default gen_random_uuid()` da coluna).
 */
export async function linkQrAlias(productId: string, aliasId: string): Promise<StoreProductQrAlias> {
  const { data, error } = await supabase
    .from('store_product_qr_aliases')
    .insert({ id: aliasId, product_id: productId })
    .select('id, product_id, owner_id, created_at')
    .single()
  if (error) throw new Error(`Falha ao vincular etiqueta QR: ${error.message}`)
  return data
}

/** Remove um alias (a etiqueta impressa deixa de abrir a ficha). */
export async function deleteQrAlias(aliasId: string): Promise<void> {
  const { error } = await supabase.from('store_product_qr_aliases').delete().eq('id', aliasId)
  if (error) throw new Error(`Falha ao remover etiqueta QR: ${error.message}`)
}

/** Reatribui um alias JÁ IMPRESSO a outro produto — a etiqueta física colada não muda, só o item para o qual ela aponta. */
export async function repointQrAlias(aliasId: string, productId: string): Promise<void> {
  const { error } = await supabase.from('store_product_qr_aliases').update({ product_id: productId }).eq('id', aliasId)
  if (error) throw new Error(`Falha ao reatribuir etiqueta QR: ${error.message}`)
}

// ─── Taxonomia de fóssil multi-espécie ──────────────────────────────────────

export async function fetchFossilSpecies(productId: string): Promise<StoreProductFossilSpecies[]> {
  const { data, error } = await supabase
    .from('store_product_fossil_species')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order')
  if (error) throw new Error(`Falha ao carregar espécies do fóssil: ${error.message}`)
  return data
}

/** Catálogo de espécies já cadastradas em QUALQUER produto — alimenta o botão
 *  "Taxonomia" (busca primeiro na própria loja, antes de consultar PBDB/GBIF).
 *  Só as colunas de taxonomia, sem `product_id`: o produto de origem não
 *  importa aqui, só o nome científico e a taxonomia associada a ele. */
export async function fetchFossilSpeciesCatalog(): Promise<StoreProductFossilSpecies[]> {
  const { data, error } = await supabase.from('store_product_fossil_species').select('*')
  if (error) throw new Error(`Falha ao carregar catálogo de espécies: ${error.message}`)
  return data
}

export async function addFossilSpecies(
  productId: string,
  input: StoreProductFossilSpeciesInput,
  sortOrder: number,
): Promise<StoreProductFossilSpecies> {
  const { data, error } = await supabase
    .from('store_product_fossil_species')
    .insert({ ...input, product_id: productId, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw new Error(`Falha ao adicionar espécie: ${error.message}`)
  return data
}

export async function updateFossilSpecies(id: string, input: StoreProductFossilSpeciesInput): Promise<StoreProductFossilSpecies> {
  const { data, error } = await supabase.from('store_product_fossil_species').update(input).eq('id', id).select().single()
  if (error) throw new Error(`Falha ao salvar espécie: ${error.message}`)
  return data
}

export async function removeFossilSpecies(id: string): Promise<void> {
  const { error } = await supabase.from('store_product_fossil_species').delete().eq('id', id)
  if (error) throw new Error(`Falha ao remover espécie: ${error.message}`)
}

// ─── Minerais da amostra (0015) ─────────────────────────────────────────────

export async function addProductMineral(
  productId: string,
  input: StoreProductMineralInput,
  sortOrder: number,
): Promise<StoreProductMineral> {
  const { data, error } = await supabase
    .from('store_product_minerals')
    .insert({ ...input, product_id: productId, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw new Error(`Falha ao adicionar mineral: ${error.message}`)
  return data
}

export async function updateProductMineral(id: string, input: StoreProductMineralInput): Promise<StoreProductMineral> {
  const { data, error } = await supabase.from('store_product_minerals').update(input).eq('id', id).select().single()
  if (error) throw new Error(`Falha ao salvar mineral: ${error.message}`)
  return data
}

export async function removeProductMineral(id: string): Promise<void> {
  const { error } = await supabase.from('store_product_minerals').delete().eq('id', id)
  if (error) throw new Error(`Falha ao remover mineral: ${error.message}`)
}

import { supabase } from '../../lib/supabase'
import { uploadFile, removeFile, buildStoragePath, signedUrls } from '../../lib/storage'
import type { StoreProduct, StoreProductInput, StoreProductMedia } from '../../types/db'

export async function fetchProducts(): Promise<StoreProduct[]> {
  const { data, error } = await supabase.from('store_products').select('*').order('name')
  if (error) throw error
  return data
}

export async function fetchProduct(id: string): Promise<StoreProduct> {
  const { data, error } = await supabase.from('store_products').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

/** `id` opcional: o formulário gera um no cliente quando há fotos/vídeos
 *  escolhidos antes de salvar, pra saber o destino do upload sem um round-trip. */
export async function createProduct(input: StoreProductInput & { id?: string }): Promise<StoreProduct> {
  const { data, error } = await supabase.from('store_products').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateProduct(id: string, input: StoreProductInput): Promise<StoreProduct> {
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

/**
 * Foto de capa de cada produto, já com URL assinada — uma consulta e um lote de
 * assinaturas para a grade inteira, em vez de uma por card. Capa = a marcada
 * `is_cover`, ou a primeira imagem por `sort_order`.
 */
export async function fetchCoverUrls(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('store_product_media')
    .select('product_id,storage_path,is_cover,sort_order')
    .eq('kind', 'image')
    .order('is_cover', { ascending: false })
    .order('sort_order')
  if (error || !data) return {}

  const pathByProduct = new Map<string, string>()
  for (const row of data as unknown as { product_id: string; storage_path: string }[]) {
    if (!pathByProduct.has(row.product_id)) pathByProduct.set(row.product_id, row.storage_path)
  }
  if (pathByProduct.size === 0) return {}

  const paths = [...pathByProduct.values()]
  const signed = await signedUrls(paths)
  const urls: Record<string, string> = {}
  for (const [productId, path] of pathByProduct) {
    const url = signed[path]
    if (url) urls[productId] = url
  }
  return urls
}

export async function uploadProductMedia(productId: string, file: File): Promise<StoreProductMedia> {
  const { data: userData } = await supabase.auth.getUser()
  const ownerId = userData.user?.id
  if (!ownerId) throw new Error('Sessão expirada.')

  const path = buildStoragePath(ownerId, 'products', productId, file.name)
  await uploadFile(path, file)

  const { data, error } = await supabase
    .from('store_product_media')
    .insert({
      product_id: productId,
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      storage_path: path,
    })
    .select()
    .single()
  if (error) {
    // Linha não gravou: o arquivo já subido viraria lixo órfão no bucket.
    await removeFile(path).catch(() => {})
    throw error
  }
  return data
}

export async function deleteProductMedia(media: StoreProductMedia): Promise<void> {
  const { error } = await supabase.from('store_product_media').delete().eq('id', media.id)
  if (error) throw error
  await removeFile(media.storage_path).catch(() => {})
}

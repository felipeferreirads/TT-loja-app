import { supabase } from '../../lib/supabase'
import { uploadFile, removeFile, buildStoragePath } from '../../lib/storage'
import type { StoreDocument, StoreDocumentFile, StoreDocumentInput, StoreProduct } from '../../types/db'

export async function fetchDocuments(): Promise<StoreDocument[]> {
  const { data, error } = await supabase
    .from('store_documents')
    .select('*')
    .order('doc_date', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data
}

export async function fetchDocument(id: string): Promise<StoreDocument> {
  const { data, error } = await supabase.from('store_documents').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createDocument(input: StoreDocumentInput & { id?: string }): Promise<StoreDocument> {
  const { data, error } = await supabase.from('store_documents').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateDocument(id: string, input: StoreDocumentInput): Promise<StoreDocument> {
  const { data, error } = await supabase.from('store_documents').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteDocument(id: string): Promise<void> {
  const files = await fetchDocumentFiles(id)
  const { error } = await supabase.from('store_documents').delete().eq('id', id)
  if (error) throw error
  // Linhas de arquivo somem por cascade; os objetos no bucket não — limpa aqui.
  await Promise.all(files.map((f) => removeFile(f.storage_path).catch(() => {})))
}

// ─── Arquivos ────────────────────────────────────────────────

export async function fetchDocumentFiles(documentId: string): Promise<StoreDocumentFile[]> {
  const { data, error } = await supabase
    .from('store_document_files')
    .select('*')
    .eq('document_id', documentId)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function uploadDocumentFile(documentId: string, file: File): Promise<StoreDocumentFile> {
  const { data: userData } = await supabase.auth.getUser()
  const ownerId = userData.user?.id
  if (!ownerId) throw new Error('Sessão expirada.')

  const path = buildStoragePath(ownerId, 'documents', documentId, file.name)
  await uploadFile(path, file)

  const { data, error } = await supabase
    .from('store_document_files')
    .insert({ document_id: documentId, storage_path: path, file_name: file.name })
    .select()
    .single()
  if (error) {
    await removeFile(path).catch(() => {})
    throw error
  }
  return data
}

export async function deleteDocumentFile(file: StoreDocumentFile): Promise<void> {
  const { error } = await supabase.from('store_document_files').delete().eq('id', file.id)
  if (error) throw error
  await removeFile(file.storage_path).catch(() => {})
}

// ─── Vínculo com produtos ────────────────────────────────────

export async function fetchProductsForDocument(documentId: string): Promise<StoreProduct[]> {
  const { data, error } = await supabase
    .from('store_document_products')
    .select('product:store_products(*)')
    .eq('document_id', documentId)
  if (error) throw error
  return (data as unknown as { product: StoreProduct | null }[]).flatMap((row) => (row.product ? [row.product] : []))
}

export async function fetchDocumentsForProduct(productId: string): Promise<StoreDocument[]> {
  const { data, error } = await supabase
    .from('store_document_products')
    .select('document:store_documents(*)')
    .eq('product_id', productId)
  if (error) throw error
  return (data as unknown as { document: StoreDocument | null }[]).flatMap((row) =>
    row.document ? [row.document] : [],
  )
}

export async function linkProductsToDocument(documentId: string, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return
  const { error } = await supabase
    .from('store_document_products')
    .upsert(
      productIds.map((product_id) => ({ document_id: documentId, product_id })),
      { ignoreDuplicates: true },
    )
  if (error) throw error
}

export async function unlinkProductFromDocument(documentId: string, productId: string): Promise<void> {
  const { error } = await supabase
    .from('store_document_products')
    .delete()
    .eq('document_id', documentId)
    .eq('product_id', productId)
  if (error) throw error
}

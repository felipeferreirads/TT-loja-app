import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { queryClient } from '../../lib/queryClient'
import { mediaSignedUrl, removeMedia, uploadMedia } from '../../lib/r2Storage'
import { categoryWithDescendants, descendantIds, type CategoryTreeNode } from '../../lib/categoryTree'
import { markProductsChanged } from '../products/productsCache'
import type { StoreCategory } from '../../types/db'

// Categorias da loja (0042) — mesmo modelo e mesmas operações de
// `features/categories/api.ts` do catálogo pessoal, sobre `store_categories` e
// `store_product_categories`. As funções puras da árvore vêm de
// lib/categoryTree.ts (compartilhado com o catálogo).

export { buildCategoryTree, categoryWithDescendants, descendantIds, flattenTree, sortByHierarchy } from '../../lib/categoryTree'
export type CategoryNode = CategoryTreeNode<StoreCategory>

export const CATEGORIES_KEY = ['store-categories'] as const

function isDuplicateNameError(message: string): boolean {
  return message.includes('store_categories_name_parent_key') || message.includes('store_categories_name_root_key')
}

const DUPLICATE_NAME = 'Já existe uma categoria com este nome neste nível.'

export async function fetchCategories(): Promise<StoreCategory[]> {
  const { data, error } = await supabase
    .from('store_categories')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order')
    .order('name')
  if (error) throw new Error(`Não foi possível carregar as categorias: ${error.message}`)
  return data as StoreCategory[]
}

export function useCategories() {
  return useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchCategories })
}

export function refreshCategories() {
  return queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
}

export async function createCategory(name: string, parentId: string | null): Promise<StoreCategory> {
  const { data, error } = await supabase
    .from('store_categories')
    .insert({ name: name.trim(), parent_id: parentId })
    .select('*')
    .single()
  if (error) throw new Error(isDuplicateNameError(error.message) ? DUPLICATE_NAME : `Não foi possível criar a categoria: ${error.message}`)
  await refreshCategories()
  return data as StoreCategory
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('store_categories').update({ name: name.trim() }).eq('id', id)
  if (error) throw new Error(isDuplicateNameError(error.message) ? DUPLICATE_NAME : `Não foi possível renomear a categoria: ${error.message}`)
  await refreshCategories()
}

/** Move para dentro de outra (ou para o nível principal). Recusa mover para dentro de si mesma ou de uma descendente. */
export async function moveCategory(categories: Pick<StoreCategory, 'id' | 'parent_id'>[], id: string, parentId: string | null): Promise<void> {
  if (parentId === id) throw new Error('Uma categoria não pode ficar dentro dela mesma.')
  if (parentId && descendantIds(categories, id).has(parentId)) throw new Error('Não é possível mover uma categoria para dentro de uma subcategoria dela.')
  const { error } = await supabase.from('store_categories').update({ parent_id: parentId }).eq('id', id)
  if (error) throw new Error(isDuplicateNameError(error.message) ? DUPLICATE_NAME : `Não foi possível mover a categoria: ${error.message}`)
  await refreshCategories()
}

export async function updateCategoryOrder(updates: Array<{ id: string; sort_order: number }>): Promise<void> {
  for (const u of updates) {
    const { error } = await supabase.from('store_categories').update({ sort_order: u.sort_order }).eq('id', u.id)
    if (error) throw new Error(`Não foi possível reordenar as categorias: ${error.message}`)
  }
  await refreshCategories()
}

/** Cor da paleta (slug); null = herda da mãe. */
export async function updateCategoryColor(id: string, color: string | null): Promise<void> {
  const { error } = await supabase.from('store_categories').update({ color }).eq('id', id)
  if (error) throw new Error(`Não foi possível alterar a cor: ${error.message}`)
  await refreshCategories()
}

/** Produto cuja foto ilustra o álbum (null limpa). */
export async function setCategoryCover(id: string, productId: string | null): Promise<void> {
  const { error } = await supabase.from('store_categories').update({ cover_product_id: productId }).eq('id', id)
  if (error) throw new Error(`Não foi possível definir a capa: ${error.message}`)
  await refreshCategories()
}

/** Foto própria da capa, no bucket "store" do R2: categories/{id}/{uuid}.{ext}. */
export async function uploadCategoryCover(categoryId: string, file: File, previousPath: string | null): Promise<void> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `categories/${categoryId}/${crypto.randomUUID()}.${ext}`
  await uploadMedia('store', path, file, file.type || undefined)
  const { error } = await supabase.from('store_categories').update({ cover_image_path: path }).eq('id', categoryId)
  if (error) {
    await removeMedia('store', [path]).catch(() => {})
    throw new Error(`Não foi possível salvar a capa: ${error.message}`)
  }
  if (previousPath) await removeMedia('store', [previousPath]).catch(() => {})
  await refreshCategories()
}

export async function removeCategoryCover(id: string, path: string): Promise<void> {
  const { error } = await supabase.from('store_categories').update({ cover_image_path: null }).eq('id', id)
  if (error) throw new Error(`Não foi possível remover a capa: ${error.message}`)
  await removeMedia('store', [path]).catch(() => {})
  await refreshCategories()
}

/** URL assinada da capa própria (cache de 30 min; a assinatura do R2 vale 24 h). */
export function useCategoryCoverUrl(path: string | null) {
  return useQuery({
    queryKey: ['store-category-cover', path],
    queryFn: () => mediaSignedUrl('store', path!),
    enabled: !!path,
    staleTime: 30 * 60_000,
  })
}

/**
 * Exclusão da categoria e de todas as subcategorias (deleted_at). Os produtos
 * não são afetados; só deixam de aparecer nessas categorias.
 */
export async function deleteCategory(id: string): Promise<void> {
  const { data: alive, error: fetchError } = await supabase.from('store_categories').select('id, parent_id').is('deleted_at', null)
  if (fetchError) throw new Error(`Não foi possível excluir a categoria: ${fetchError.message}`)
  const ids = [...categoryWithDescendants(alive as Pick<StoreCategory, 'id' | 'parent_id'>[], id)]
  const { error } = await supabase.from('store_categories').update({ deleted_at: new Date().toISOString() }).in('id', ids)
  if (error) throw new Error(`Não foi possível excluir a categoria: ${error.message}`)
  await refreshCategories()
}

export async function fetchDeletedCategories(): Promise<StoreCategory[]> {
  const { data, error } = await supabase.from('store_categories').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
  if (error) throw new Error(`Não foi possível carregar as categorias excluídas: ${error.message}`)
  return data as StoreCategory[]
}

export async function restoreCategory(id: string): Promise<void> {
  const { error } = await supabase.from('store_categories').update({ deleted_at: null }).eq('id', id)
  if (error) throw new Error(`Não foi possível restaurar a categoria: ${error.message}`)
  await refreshCategories()
}

export async function permanentlyDeleteCategory(category: StoreCategory): Promise<void> {
  if (category.cover_image_path) await removeMedia('store', [category.cover_image_path]).catch(() => {})
  const { error } = await supabase.from('store_categories').delete().eq('id', category.id)
  if (error) throw new Error(`Não foi possível excluir a categoria definitivamente: ${error.message}`)
}

// ─── Vínculo produto ⇄ categoria ───────────────────────────────────────────

export async function addProductsToCategory(categoryId: string, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return
  const { error } = await supabase
    .from('store_product_categories')
    .upsert(productIds.map((product_id) => ({ product_id, category_id: categoryId })), { onConflict: 'product_id,category_id', ignoreDuplicates: true })
  if (error) throw new Error(`Não foi possível adicionar os produtos à categoria: ${error.message}`)
  markProductsChanged()
}

export async function removeProductsFromCategory(categoryId: string, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return
  const { error } = await supabase.from('store_product_categories').delete().eq('category_id', categoryId).in('product_id', productIds)
  if (error) throw new Error(`Não foi possível remover os produtos da categoria: ${error.message}`)
  markProductsChanged()
}

/** Categorias de um produto: grava exatamente a lista recebida (formulário do produto). */
export async function setProductCategories(productId: string, categoryIds: string[], previous: string[]): Promise<void> {
  const next = new Set(categoryIds)
  const prev = new Set(previous)
  const removed = previous.filter((id) => !next.has(id))
  const added = categoryIds.filter((id) => !prev.has(id))
  if (removed.length > 0) {
    const { error } = await supabase.from('store_product_categories').delete().eq('product_id', productId).in('category_id', removed)
    if (error) throw new Error(`Não foi possível atualizar as categorias: ${error.message}`)
  }
  if (added.length > 0) {
    const { error } = await supabase.from('store_product_categories').insert(added.map((category_id) => ({ product_id: productId, category_id })))
    if (error) throw new Error(`Não foi possível atualizar as categorias: ${error.message}`)
  }
  if (removed.length > 0 || added.length > 0) markProductsChanged()
}

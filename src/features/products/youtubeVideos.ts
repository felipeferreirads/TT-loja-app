import { supabase } from '../../lib/supabase'
import type { StoreProductYoutubeVideo } from '../../types/db'

// CRUD dos vídeos do YouTube vinculados a um produto (tabela
// store_product_youtube_videos, migration 0011). Adaptado de
// features/specimens/youtubeVideos.ts do catálogo pessoal (claude.md §2) —
// mesmo mecanismo: soft delete (deleted_at) e leituras filtram deleted_at is null.
//
// Online-only por ora: criar/editar/remover vídeo sem internet falha com o
// erro de rede normal (a loja não tem fila offline). O player do YouTube
// exige internet de qualquer forma.

export async function fetchYoutubeVideos(productId: string): Promise<StoreProductYoutubeVideo[]> {
  const { data, error } = await supabase
    .from('store_product_youtube_videos')
    .select('*')
    .eq('product_id', productId)
    .is('deleted_at', null)
    .order('sort_order')
  if (error) throw new Error(`Falha ao carregar vídeos do YouTube: ${error.message}`)
  return data
}

export async function addYoutubeVideo(
  productId: string,
  youtubeId: string,
  title: string | null,
  sortOrder: number,
): Promise<string> {
  const { data, error } = await supabase
    .from('store_product_youtube_videos')
    .insert({ product_id: productId, youtube_id: youtubeId, title, sort_order: sortOrder })
    .select('id')
    .single()
  if (error) throw new Error(`Falha ao adicionar vídeo do YouTube: ${error.message}`)
  return data.id as string
}

export async function updateYoutubeVideoTitle(id: string, title: string | null): Promise<void> {
  const { error } = await supabase.from('store_product_youtube_videos').update({ title }).eq('id', id)
  if (error) throw new Error(`Falha ao salvar vídeo do YouTube: ${error.message}`)
}

/** Soft delete: grava deleted_at = now(); as leituras filtram deleted_at is null. */
export async function removeYoutubeVideo(id: string): Promise<void> {
  const { error } = await supabase
    .from('store_product_youtube_videos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Falha ao remover vídeo do YouTube: ${error.message}`)
}

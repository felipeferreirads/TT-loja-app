import { supabase } from './supabase'
import type { StoreMediaBucket } from '../types/db'

// Fotos/vídeos de PRODUTO no Cloudflare R2 (migration 0017) — dois buckets
// possíveis, ver `StoreMediaBucket` em types/db.ts:
// - 'store': bucket próprio da loja, fotos/vídeos enviados aqui.
// - 'media': bucket do catálogo pessoal (Tesouros da Terra), referenciado
//   por item importado da coleção — a loja só LÊ, nunca escreve/apaga.
//
// Mesma Edge Function `r2-storage` dos dois apps (mesmo projeto Supabase),
// chamada direto — sem provedor pluggable como o catálogo pessoal tem
// (supabase|r2|gdrive), a loja só fala com R2 pra mídia de produto.
// Documentos/Empresa continuam no Supabase Storage (`lib/storage.ts`,
// dados financeiros — mesma fronteira do catálogo pessoal).

const DEFAULT_EXPIRY = 60 * 60 // 1h

async function callR2Storage<T>(payload: {
  bucket: StoreMediaBucket
  operation: 'get' | 'put' | 'delete'
  paths: string[]
  expiresIn?: number
}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('r2-storage', { body: payload })
  if (error) throw new Error(`Falha ao chamar r2-storage (${payload.operation}): ${error.message}`)
  if (data?.error) throw new Error(`r2-storage (${payload.operation}): ${data.error}`)
  return data as T
}

export async function uploadMedia(bucket: StoreMediaBucket, path: string, file: Blob, contentType?: string): Promise<void> {
  const { urls } = await callR2Storage<{ urls: Record<string, string> }>({ bucket, operation: 'put', paths: [path] })
  const putUrl = urls[path]
  if (!putUrl) throw new Error(`Falha no upload de "${path}": URL presigned não retornada.`)
  const res = await fetch(putUrl, { method: 'PUT', body: file, headers: contentType ? { 'Content-Type': contentType } : undefined })
  if (!res.ok) throw new Error(`Falha no upload de "${path}": HTTP ${res.status}`)
}

export async function mediaSignedUrl(bucket: StoreMediaBucket, path: string, expiresInSeconds = DEFAULT_EXPIRY): Promise<string> {
  const { urls } = await callR2Storage<{ urls: Record<string, string> }>({
    bucket,
    operation: 'get',
    paths: [path],
    expiresIn: expiresInSeconds,
  })
  const url = urls[path]
  if (!url) throw new Error(`Falha ao assinar URL de "${path}".`)
  return url
}

/** Assina vários caminhos DO MESMO bucket de uma vez — a grade de produtos
 *  precisa de dezenas de URLs por carregamento. Caminhos de buckets
 *  diferentes exigem uma chamada por bucket (o chamador agrupa antes). */
export async function mediaSignedUrls(
  bucket: StoreMediaBucket,
  paths: string[],
  expiresInSeconds = DEFAULT_EXPIRY,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const { urls } = await callR2Storage<{ urls: Record<string, string> }>({
    bucket,
    operation: 'get',
    paths,
    expiresIn: expiresInSeconds,
  })
  return urls ?? {}
}

/** Só chamar pra bucket='store' — apagar um objeto de bucket='media'
 *  apagaria a foto original do catálogo pessoal. Quem chama já filtra isso
 *  (ver `deleteProductMedia` em products/api.ts). */
export async function removeMedia(bucket: StoreMediaBucket, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await callR2Storage<{ ok: true }>({ bucket, operation: 'delete', paths })
}

/** Extensão preservada para o navegador servir o Content-Type correto. */
export function buildMediaPath(ownerId: string, folder: string, id: string, fileName: string): string {
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : ''
  return `${ownerId}/${folder}/${id}/${crypto.randomUUID()}${ext}`
}

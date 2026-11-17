import { supabase } from './supabase'

/**
 * Bucket privado "store". Convenção de caminho `{owner_id}/{...}` — o
 * primeiro segmento é validado pela policy de Storage, então todo upload
 * precisa começar pelo uuid do dono.
 */
const BUCKET = 'store'

/** Bucket "documents" do catálogo pessoal — arquivos de Documentos (tabela
 *  compartilhada `documents`, 0038). Mesma convenção `{owner_id}/...`. */
export type StorageBucket = 'store' | 'documents'

export async function uploadFile(path: string, file: File, bucket: StorageBucket = BUCKET): Promise<void> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (error) throw error
}

export async function signedUrl(path: string, expiresInSeconds = 3600, bucket: StorageBucket = BUCKET): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

/** URL assinada que força o download (Content-Disposition: attachment) com o nome dado. */
export async function signedDownloadUrl(
  path: string,
  filename: string,
  expiresInSeconds = 3600,
  bucket: StorageBucket = BUCKET,
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds, { download: filename })
  if (error) throw error
  return data.signedUrl
}

/** Assina vários caminhos de uma vez — a grade de produtos precisa de dezenas
 *  de URLs por carregamento e uma chamada por arquivo seria desperdício. */
export async function signedUrls(paths: string[], expiresInSeconds = 3600): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, expiresInSeconds)
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const item of data) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl
  }
  return out
}

export async function removeFile(path: string, bucket: StorageBucket = BUCKET): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

/** Extensão preservada para o navegador servir o Content-Type correto. */
export function buildStoragePath(ownerId: string, folder: string, id: string, fileName: string): string {
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : ''
  return `${ownerId}/${folder}/${id}/${crypto.randomUUID()}${ext}`
}

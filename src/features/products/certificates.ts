import { supabase } from '../../lib/supabase'
import { uploadFile, removeFile, buildStoragePath } from '../../lib/storage'
import type { StoreProductCertificate } from '../../types/db'

// Copiado do catálogo pessoal (src/features/specimens/certificates.ts),
// simplificado: sem miniatura de PDF (o dono confirmou que são poucos
// certificados, não justifica o pipeline de thumbnail .webp) e no bucket
// "store" (Supabase Storage) em vez de R2, pasta "certificates/{productId}/{certificateId}/...".

export async function fetchCertificates(productId: string): Promise<StoreProductCertificate[]> {
  const { data, error } = await supabase
    .from('store_product_certificates')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order')
  if (error) throw new Error(`Falha ao carregar certificados: ${error.message}`)
  return data
}

export type CertificateInput = Pick<StoreProductCertificate, 'lab' | 'code' | 'link' | 'notes'>

export async function addCertificate(productId: string, input: CertificateInput, sortOrder: number): Promise<string> {
  const { data, error } = await supabase
    .from('store_product_certificates')
    .insert({ product_id: productId, ...input, sort_order: sortOrder })
    .select('id')
    .single()
  if (error) throw new Error(`Falha ao criar certificado: ${error.message}`)
  return data.id as string
}

export async function updateCertificateFields(id: string, input: CertificateInput): Promise<void> {
  const { error } = await supabase.from('store_product_certificates').update(input).eq('id', id)
  if (error) throw new Error(`Falha ao salvar certificado: ${error.message}`)
}

const PATH_COLUMN = { pdf: 'pdf_path', image: 'image_path' } as const

export async function uploadCertificateFile(
  ownerId: string,
  certificate: StoreProductCertificate,
  kind: 'pdf' | 'image',
  file: File,
): Promise<void> {
  const column = PATH_COLUMN[kind]
  const oldPath = certificate[column]
  const path = buildStoragePath(ownerId, `certificates/${certificate.product_id}`, certificate.id, file.name)
  await uploadFile(path, file)

  const { error } = await supabase.from('store_product_certificates').update({ [column]: path }).eq('id', certificate.id)
  if (error) {
    await removeFile(path).catch(() => {})
    throw new Error(`Falha ao registrar arquivo "${file.name}": ${error.message}`)
  }
  if (oldPath) await removeFile(oldPath).catch(() => {})
}

export async function removeCertificateFile(certificate: StoreProductCertificate, kind: 'pdf' | 'image'): Promise<void> {
  const column = PATH_COLUMN[kind]
  const path = certificate[column]
  if (!path) return
  const { error } = await supabase.from('store_product_certificates').update({ [column]: null }).eq('id', certificate.id)
  if (error) throw new Error(`Falha ao remover arquivo: ${error.message}`)
  await removeFile(path).catch(() => {})
}

export async function removeCertificate(certificate: StoreProductCertificate): Promise<void> {
  const paths = [certificate.pdf_path, certificate.image_path].filter((p): p is string => !!p)
  await Promise.all(paths.map((p) => removeFile(p).catch(() => {})))
  const { error } = await supabase.from('store_product_certificates').delete().eq('id', certificate.id)
  if (error) throw new Error(`Falha ao apagar certificado: ${error.message}`)
}

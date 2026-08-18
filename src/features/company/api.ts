import { supabase } from '../../lib/supabase'
import { uploadFile, removeFile, buildStoragePath } from '../../lib/storage'
import type { StoreCompany, StoreCompanyDocument } from '../../types/db'

export type StoreCompanyInput = Partial<Omit<StoreCompany, 'owner_id' | 'created_at' | 'updated_at'>>

export async function fetchCompany(): Promise<StoreCompany | null> {
  const { data, error } = await supabase.from('store_company').select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function saveCompany(input: StoreCompanyInput): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  const ownerId = userData.user?.id
  if (!ownerId) throw new Error('Sessão expirada.')
  const { error } = await supabase.from('store_company').upsert({ owner_id: ownerId, ...input })
  if (error) throw error
}

export async function fetchCompanyDocuments(): Promise<StoreCompanyDocument[]> {
  const { data, error } = await supabase.from('store_company_documents').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function uploadCompanyDocument(
  file: File,
  meta: { title: string; doc_kind?: string | null; issue_date?: string | null },
): Promise<StoreCompanyDocument> {
  const { data: userData } = await supabase.auth.getUser()
  const ownerId = userData.user?.id
  if (!ownerId) throw new Error('Sessão expirada.')

  const path = buildStoragePath(ownerId, 'company-docs', 'geral', file.name)
  await uploadFile(path, file)

  const { data, error } = await supabase
    .from('store_company_documents')
    .insert({
      title: meta.title,
      doc_kind: meta.doc_kind ?? null,
      issue_date: meta.issue_date || null,
      storage_path: path,
    })
    .select()
    .single()
  if (error) {
    await removeFile(path).catch(() => {})
    throw error
  }
  return data
}

export async function deleteCompanyDocument(doc: StoreCompanyDocument): Promise<void> {
  const { error } = await supabase.from('store_company_documents').delete().eq('id', doc.id)
  if (error) throw error
  await removeFile(doc.storage_path).catch(() => {})
}

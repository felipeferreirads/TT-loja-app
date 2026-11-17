// Copiado do catálogo pessoal — tabela compartilhada.
import { supabase } from '../../lib/supabase'
import type { DocumentHolder } from '../../types/db'

// Pool global de titulares (nome + documento fiscal), editável — mesmo padrão
// de transportadoras.ts. O valor escolhido é snapshotado em documents.holder_*.

export async function fetchDocumentHolders(): Promise<DocumentHolder[]> {
  const { data, error } = await supabase.from('document_holders').select('*').order('name')
  if (error) throw new Error(`Falha ao carregar titulares: ${error.message}`)
  return data as DocumentHolder[]
}

export async function createDocumentHolder(nome: string, documentoFiscal: string | null): Promise<DocumentHolder> {
  const { data, error } = await supabase
    .from('document_holders')
    .insert({ name: nome.trim(), tax_id: documentoFiscal?.trim() || null })
    .select('*')
    .single()
  if (error) {
    if (error.message.includes('document_holders_owner_id_name_key')) throw new Error('Esse titular já existe.')
    throw new Error(`Falha ao criar titular: ${error.message}`)
  }
  return data as DocumentHolder
}

export async function updateDocumentHolder(id: string, nome: string, documentoFiscal: string | null): Promise<void> {
  const { error } = await supabase
    .from('document_holders')
    .update({ name: nome.trim(), tax_id: documentoFiscal?.trim() || null })
    .eq('id', id)
  if (error) throw new Error(`Falha ao salvar titular: ${error.message}`)
}

export async function deleteDocumentHolder(id: string): Promise<void> {
  const { error } = await supabase.from('document_holders').delete().eq('id', id)
  if (error) throw new Error(`Falha ao excluir titular: ${error.message}`)
}

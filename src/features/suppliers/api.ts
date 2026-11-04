import { supabase } from '../../lib/supabase'
import type { StoreSupplier } from '../../types/db'

// Cadastro COMPARTILHADO com o catálogo pessoal (`suppliers`). A loja só
// enxerga/cria fornecedores com `in_store = true`; apagar aqui nunca remove
// um fornecedor que o catálogo também usa (só tira a marca `in_store`).

export type StoreSupplierInput = Pick<StoreSupplier, 'name'> &
  Partial<Omit<StoreSupplier, 'id' | 'owner_id' | 'created_at' | 'updated_at' | 'name'>>

export async function fetchSuppliers(): Promise<StoreSupplier[]> {
  const { data, error } = await supabase.from('suppliers').select('*').eq('in_store', true).order('name')
  if (error) throw error
  return data
}

/**
 * Cria já marcado `in_store`. Se o catálogo já tem um fornecedor com o mesmo
 * nome (índice único por nome), reaproveita esse cadastro em vez de duplicar —
 * só liga `in_store` e completa os campos vazios.
 */
export async function createSupplier(input: StoreSupplierInput): Promise<StoreSupplier> {
  const { data: existing } = await supabase
    .from('suppliers')
    .select('*')
    .ilike('name', input.name.trim().replace(/[\\%_]/g, '\\$&'))
    .maybeSingle()
  if (existing) {
    const fill: Record<string, unknown> = { in_store: true }
    for (const [k, v] of Object.entries(input)) {
      if (v != null && v !== '' && (existing as Record<string, unknown>)[k] == null) fill[k] = v
    }
    return updateSupplier(existing.id, fill as StoreSupplierInput)
  }
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ in_collection: false, ...input, in_store: true })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSupplier(id: string, input: Partial<StoreSupplierInput>): Promise<StoreSupplier> {
  const { data, error } = await supabase.from('suppliers').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Some da loja. Se o catálogo também usa o fornecedor, só desliga `in_store`. */
export async function deleteSupplier(supplier: StoreSupplier): Promise<void> {
  const { error } = supplier.in_collection
    ? await supabase.from('suppliers').update({ in_store: false }).eq('id', supplier.id)
    : await supabase.from('suppliers').delete().eq('id', supplier.id)
  if (error) throw error
}

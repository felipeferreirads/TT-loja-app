import { supabase } from '../../lib/supabase'
import type { StoreSupplier } from '../../types/db'

export type StoreSupplierInput = Pick<StoreSupplier, 'name'> &
  Partial<Omit<StoreSupplier, 'id' | 'owner_id' | 'created_at' | 'name'>>

export async function fetchSuppliers(): Promise<StoreSupplier[]> {
  const { data, error } = await supabase.from('store_suppliers').select('*').order('name')
  if (error) throw error
  return data
}

export async function createSupplier(input: StoreSupplierInput): Promise<StoreSupplier> {
  const { data, error } = await supabase.from('store_suppliers').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateSupplier(id: string, input: StoreSupplierInput): Promise<StoreSupplier> {
  const { data, error } = await supabase.from('store_suppliers').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('store_suppliers').delete().eq('id', id)
  if (error) throw error
}

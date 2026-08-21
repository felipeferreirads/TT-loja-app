import { supabase } from '../../lib/supabase'
import type { StoreCustomer } from '../../types/db'

export type StoreCustomerInput = Pick<StoreCustomer, 'name'> &
  Partial<Omit<StoreCustomer, 'id' | 'owner_id' | 'created_at' | 'name'>>

export async function fetchCustomers(): Promise<StoreCustomer[]> {
  const { data, error } = await supabase.from('store_customers').select('*').is('deleted_at', null).order('name')
  if (error) throw error
  return data
}

export async function fetchCustomer(id: string): Promise<StoreCustomer> {
  const { data, error } = await supabase.from('store_customers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createCustomer(input: StoreCustomerInput): Promise<StoreCustomer> {
  const { data, error } = await supabase.from('store_customers').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateCustomer(id: string, input: StoreCustomerInput): Promise<StoreCustomer> {
  const { data, error } = await supabase.from('store_customers').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ─── Lixeira (0027) ─────────────────────────────────────────
// Mesmo padrão de `features/products/api.ts`: exclusão vira soft delete
// (`deleted_at`), reversível por `TRASH_RETENTION_DAYS` dias — ver
// `features/trash/api.ts`.

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('store_customers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function restoreCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('store_customers').update({ deleted_at: null }).eq('id', id)
  if (error) throw error
}

export async function permanentlyDeleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('store_customers').delete().eq('id', id)
  if (error) throw error
}

export async function fetchDeletedCustomers(): Promise<StoreCustomer[]> {
  const { data, error } = await supabase
    .from('store_customers')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  if (error) throw error
  return data
}

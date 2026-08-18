import { supabase } from '../../lib/supabase'
import type { StoreCustomer } from '../../types/db'

export type StoreCustomerInput = Pick<StoreCustomer, 'name'> &
  Partial<Omit<StoreCustomer, 'id' | 'owner_id' | 'created_at' | 'name'>>

export async function fetchCustomers(): Promise<StoreCustomer[]> {
  const { data, error } = await supabase.from('store_customers').select('*').order('name')
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

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('store_customers').delete().eq('id', id)
  if (error) throw error
}

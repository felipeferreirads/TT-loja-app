import { supabase } from '../../lib/supabase'
import type { StorePaymentMethod, StoreSale } from '../../types/db'

export interface SaleItemInput {
  product_id: string
  quantity: number
  unit_price: number
}

export interface CreateSaleInput {
  customer_id: string | null
  payment_method: StorePaymentMethod
  discount: number
  notes: string | null
  items: SaleItemInput[]
}

export interface SaleWithCustomer extends StoreSale {
  customer: { name: string } | null
}

export async function fetchSales(): Promise<SaleWithCustomer[]> {
  const { data, error } = await supabase
    .from('store_sales')
    .select('*, customer:store_customers(name)')
    .order('sale_date', { ascending: false })
  if (error) throw error
  return data as unknown as SaleWithCustomer[]
}

// Insere venda + itens + baixa de estoque numa única transação no banco
// (RPC `create_store_sale`, ver supabase/migrations/0002_create_sale_rpc.sql)
// — evita venda gravada com estoque desatualizado se algo falhar no meio.
export async function createSale(input: CreateSaleInput): Promise<StoreSale> {
  const { data, error } = await supabase.rpc('create_store_sale', {
    p_customer_id: input.customer_id,
    p_payment_method: input.payment_method,
    p_discount: input.discount,
    p_notes: input.notes,
    p_items: input.items,
  })
  if (error) throw error
  return data
}

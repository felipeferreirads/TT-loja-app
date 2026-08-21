import { supabase } from '../../lib/supabase'
import type { StorePaymentMethod } from '../../types/db'

export interface CustomerPurchaseItem {
  product_name: string
  quantity: number
  unit_price: number
}

export interface CustomerPurchase {
  id: string
  sale_date: string
  total: number
  payment_method: StorePaymentMethod
  paid: boolean
  due_date: string | null
  items: CustomerPurchaseItem[]
  document: { id: string; title: string; number: string | null } | null
}

interface SaleRow {
  id: string
  sale_date: string
  total: number
  payment_method: StorePaymentMethod
  paid: boolean
  due_date: string | null
  items: { quantity: number; unit_price: number; product: { name: string } | null }[]
  documents: { id: string; title: string; number: string | null }[]
}

/** Histórico de compras de UM cliente — mesmos joins de `fetchSaleReceipt`
 *  (`sales/api.ts`), só filtrado por `customer_id` em vez de `id` da venda.
 *  Alimenta a ficha do cliente (`CustomerPage.tsx`): tiles (total gasto, nº
 *  de compras...) e o timeline de compras são calculados em memória a
 *  partir daqui, mesmo padrão de `ProductStockHistorySection.tsx`. */
export async function fetchCustomerPurchases(customerId: string): Promise<CustomerPurchase[]> {
  const { data, error } = await supabase
    .from('store_sales')
    .select(
      'id, sale_date, total, payment_method, paid, due_date, items:store_sale_items(quantity, unit_price, product:store_products(name)), documents:store_documents(id, title, number)',
    )
    .eq('customer_id', customerId)
    .order('sale_date', { ascending: false })
  if (error) throw error
  return (data as unknown as SaleRow[]).map((row) => ({
    id: row.id,
    sale_date: row.sale_date,
    total: row.total,
    payment_method: row.payment_method,
    paid: row.paid,
    due_date: row.due_date,
    items: row.items.map((it) => ({
      product_name: it.product?.name ?? 'Produto removido',
      quantity: it.quantity,
      unit_price: it.unit_price,
    })),
    document: row.documents[0] ?? null,
  }))
}

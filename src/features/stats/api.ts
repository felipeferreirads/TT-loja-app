import { supabase } from '../../lib/supabase'
import type { StoreItemKind, StorePaymentMethod } from '../../types/db'

export interface SaleItemStat {
  sale_id: string
  quantity: number
  unit_price: number
  sale_date: string
  payment_method: StorePaymentMethod
  product_id: string | null
  product_name: string | null
  product_kind: StoreItemKind | null
  cost_price: number | null
}

interface SaleItemRow {
  sale_id: string
  quantity: number
  unit_price: number
  sale: { sale_date: string; payment_method: StorePaymentMethod } | null
  product: { id: string; name: string; kind: StoreItemKind; cost_price: number | null } | null
}

/** Cada item de venda, já com data/forma de pagamento da venda e nome/tipo/
 *  custo do produto — agregação em memória a partir daqui (mesmo padrão do
 *  Painel de Estatísticas do catálogo pessoal). `sale_id`/`payment_method`
 *  permitem ratear o desconto de taxas/impostos da venda (ver
 *  `netFromSaleTotal`) proporcionalmente entre os itens dela. */
export async function fetchSaleItemStats(): Promise<SaleItemStat[]> {
  const { data, error } = await supabase
    .from('store_sale_items')
    .select('sale_id, quantity, unit_price, sale:store_sales(sale_date, payment_method), product:store_products(id, name, kind, cost_price)')
  if (error) throw error
  return (data as unknown as SaleItemRow[]).map((row) => ({
    sale_id: row.sale_id,
    quantity: row.quantity,
    unit_price: row.unit_price,
    sale_date: row.sale?.sale_date ?? '',
    payment_method: row.sale?.payment_method ?? 'outro',
    product_id: row.product?.id ?? null,
    product_name: row.product?.name ?? null,
    product_kind: row.product?.kind ?? null,
    cost_price: row.product?.cost_price ?? null,
  }))
}

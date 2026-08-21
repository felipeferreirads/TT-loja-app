import { supabase } from '../../lib/supabase'
import type { StoreCustomer, StorePaymentMethod, StoreSale } from '../../types/db'

export interface SaleItemInput {
  product_id: string
  quantity: number
  unit_price: number
}

export interface CreateSaleInput {
  customer_id: string | null
  payment_method: StorePaymentMethod
  discount: number
  /** Frete, serviço, embalagem etc. — somado ao total, não é item de carrinho. */
  extra_amount: number
  notes: string | null
  items: SaleItemInput[]
}

export interface SaleWithCustomer extends StoreSale {
  customer: { name: string } | null
  /** Nota fiscal de saída vinculada (0024) — array pelo join reverso via
   *  `store_documents.sale_id`, mas na prática no máximo uma por venda. */
  documents: { id: string; title: string; number: string | null }[]
}

export async function fetchSales(): Promise<SaleWithCustomer[]> {
  const { data, error } = await supabase
    .from('store_sales')
    .select('*, customer:store_customers(name), documents:store_documents(id, title, number)')
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
    p_extra_amount: input.extra_amount,
  })
  if (error) throw error
  return data
}

export interface SaleReceiptItem {
  product_name: string
  quantity: number
  unit_price: number
}

export interface SaleReceipt extends StoreSale {
  customer: StoreCustomer | null
  items: SaleReceiptItem[]
}

// Busca sob demanda (só quando o recibo é aberto) — a lista de vendas não
// carrega itens/cliente completo, só o necessário pra listagem.
export async function fetchSaleReceipt(saleId: string): Promise<SaleReceipt> {
  const { data, error } = await supabase
    .from('store_sales')
    .select('*, customer:store_customers(*), items:store_sale_items(quantity, unit_price, product:store_products(name))')
    .eq('id', saleId)
    .single()
  if (error) throw error
  const raw = data as unknown as StoreSale & {
    customer: StoreCustomer | null
    items: { quantity: number; unit_price: number; product: { name: string } | null }[]
  }
  return {
    ...raw,
    items: raw.items.map((it) => ({
      product_name: it.product?.name ?? 'Produto removido',
      quantity: it.quantity,
      unit_price: it.unit_price,
    })),
  }
}

import { supabase } from '../../lib/supabase'
import type { StoreStockEntry } from '../../types/db'

export interface StockEntryWithRefs extends StoreStockEntry {
  supplier: { name: string } | null
  document: { id: string; title: string; number: string | null } | null
}

export async function fetchStockEntries(productId: string): Promise<StockEntryWithRefs[]> {
  const { data, error } = await supabase
    .from('store_stock_entries')
    .select('*, supplier:store_suppliers(name), document:store_documents(id, title, number)')
    .eq('product_id', productId)
    .order('entry_date', { ascending: false })
  if (error) throw new Error(`Falha ao carregar entradas de estoque: ${error.message}`)
  return data as unknown as StockEntryWithRefs[]
}

export interface CreateStockEntryInput {
  product_id: string
  quantity: number
  unit_cost: number | null
  supplier_id: string | null
  document_id: string | null
  entry_date: string
  notes: string | null
}

export async function createStockEntry(input: CreateStockEntryInput): Promise<StoreStockEntry> {
  const { data, error } = await supabase.rpc('create_store_stock_entry', {
    p_product_id: input.product_id,
    p_quantity: input.quantity,
    p_unit_cost: input.unit_cost,
    p_supplier_id: input.supplier_id,
    p_document_id: input.document_id,
    p_entry_date: input.entry_date,
    p_notes: input.notes,
  })
  if (error) throw new Error(`Falha ao registrar entrada: ${error.message}`)
  return data
}

interface SaleItemWithSale {
  id: string
  quantity: number
  unit_price: number
  sale: {
    id: string
    sale_date: string
    customer: { name: string } | null
    // Nota fiscal de saída vinculada à venda (0024) — join reverso pela FK
    // store_documents.sale_id; array porque PostgREST não sabe de antemão
    // que é no máximo uma (a UNIQUE fica a cargo do app, não do schema).
    documents: { id: string; title: string; number: string | null }[]
  } | null
}

async function fetchSaleItemsForProduct(productId: string): Promise<SaleItemWithSale[]> {
  const { data, error } = await supabase
    .from('store_sale_items')
    .select('id, quantity, unit_price, sale:store_sales(id, sale_date, customer:store_customers(name), documents:store_documents(id, title, number))')
    .eq('product_id', productId)
  if (error) throw new Error(`Falha ao carregar vendas do produto: ${error.message}`)
  return data as unknown as SaleItemWithSale[]
}

/** Um evento do histórico — entrada (compra) ou saída (venda) — já pronto pra render. */
export interface StockHistoryEvent {
  id: string
  kind: 'in' | 'out'
  date: string
  quantity: number
  label: string
  sublabel: string | null
  /** Produto/documento vinculado, se houver — pra linkar na UI. */
  documentId: string | null
}

/** Funde entradas (`store_stock_entries`) e saídas (`store_sale_items`) do
 *  produto num timeline só, mais recente primeiro — a "sessão de origem"
 *  pedida: de onde veio, pra onde foi. */
export async function fetchStockHistory(productId: string): Promise<StockHistoryEvent[]> {
  const [entries, saleItems] = await Promise.all([fetchStockEntries(productId), fetchSaleItemsForProduct(productId)])

  const inEvents: StockHistoryEvent[] = entries.map((e) => ({
    id: e.id,
    kind: 'in',
    date: e.entry_date,
    quantity: e.quantity,
    label: e.supplier ? `Entrada · ${e.supplier.name}` : 'Entrada',
    sublabel: e.document ? `NF ${e.document.number ?? e.document.title}` : null,
    documentId: e.document?.id ?? null,
  }))

  const outEvents: StockHistoryEvent[] = saleItems
    .filter((s) => s.sale)
    .map((s) => {
      const sale = s.sale!
      const doc = sale.documents[0]
      return {
        id: s.id,
        kind: 'out' as const,
        date: sale.sale_date,
        quantity: s.quantity,
        label: `Saída · ${sale.customer?.name ?? 'Sem cliente'}`,
        sublabel: doc ? `NF ${doc.number ?? doc.title}` : null,
        documentId: doc?.id ?? null,
      }
    })

  return [...inEvents, ...outEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// Copiado do catálogo pessoal (`src/features/documents/api.ts`) — mesma tabela
// `documents` COMPARTILHADA (0203 do catálogo + 0038 daqui), mesmos campos,
// seções, comprovantes e arquivos. Diferenças da loja:
// - lista só `in_store = true`; criar marca `in_store` (e `in_collection =
//   false`); excluir um documento que a Coleção também usa só desliga
//   `in_store` (mesmo modelo de `suppliers`, ver suppliers/api.ts);
// - vincula PRODUTOS (`document_store_products`), não espécimes;
// - `store_sale_id` = nota fiscal de saída (venda);
// - sem i18n e sem lixeira: excluir um documento só da loja é definitivo.
import { supabase } from '../../lib/supabase'
import { uploadFile, removeFile } from '../../lib/storage'
import { markProductsChanged } from '../products/productsCache'
import type {
  Document,
  DocumentFile,
  DocumentFileKind,
  DocumentFileSection,
  DocumentPayment,
  DocumentSection,
  StoreProduct,
} from '../../types/db'

// Caminhos no bucket "documents": {ownerId}/{ano}/{documentId}/... — mesmo
// padrão do catálogo. O primeiro segmento (ownerId) é exigido pela política de Storage.
const BUCKET = 'documents' as const

export async function fetchDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .is('deleted_at', null)
    .eq('in_store', true)
    .order('document_date', { ascending: false, nullsFirst: false })
  if (error) throw new Error(`Falha ao carregar documentos: ${error.message}`)
  return data
}

export async function fetchDocument(id: string): Promise<Document> {
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).is('deleted_at', null).single()
  if (error) throw new Error(`Documento não encontrado: ${error.message}`)
  return data
}

export type DocumentInput = Omit<
  Document,
  'id' | 'owner_id' | 'year' | 'created_at' | 'updated_at' | 'deleted_at' | 'xml_url' | 'in_collection' | 'in_store'
>

/** Objeto de partida com todo campo nulo/false. */
export function emptyDocumentInput(): DocumentInput {
  return {
    has_nfe: false,
    has_import: false,
    has_payment: false,
    has_shipping: false,
    holder_name: null,
    holder_tax_id: null,
    supplier_name: null,
    supplier_id: null,
    supplier_storefront_id: null,
    document_date: null,
    goods_amount: null,
    freight_amount: null,
    fees_amount: null,
    amounts_currency: 'BRL',
    issue_date: null,
    notes: null,
    general_notes: null,
    nfe_number: null,
    nfe_series: null,
    nfe_key: null,
    nfe_protocol: null,
    supplier_tax_id: null,
    recipient_tax_id: null,
    item_description: null,
    item_quantity: null,
    item_line_total: null,
    item_allocated_value: null,
    invoice_number: null,
    awb: null,
    purchase_country: null,
    shipped_date: null,
    arrival_date: null,
    customs_type: null,
    customs_number: null,
    carrier: null,
    declared_contents: null,
    shipment_weight_kg: null,
    goods_usd: null,
    freight_usd: null,
    exchange_rate: null,
    taxes_brl: null,
    import_cost_brl: null,
    payment_date: null,
    payment_amount: null,
    payment_method: null,
    shipping_carrier: null,
    shipping_tracking: null,
    shipping_sent_date: null,
    shipping_delivered_date: null,
    store_sale_id: null,
  }
}

/** Ano do documento (pasta no Storage) — mesma regra do catálogo. */
export function documentYear(input: Pick<DocumentInput, 'issue_date' | 'shipped_date' | 'shipping_sent_date' | 'payment_date'>): number {
  const raw = input.issue_date ?? input.shipped_date ?? input.shipping_sent_date ?? input.payment_date
  return raw ? Number(raw.slice(0, 4)) : new Date().getFullYear()
}

export async function createDocument(input: DocumentInput): Promise<string> {
  const { data, error } = await supabase
    .from('documents')
    .insert({ ...input, year: documentYear(input), in_store: true, in_collection: false })
    .select('id')
    .single()
  if (error) throw new Error(`Falha ao criar documento: ${error.message}`)
  return data.id as string
}

export async function updateDocument(id: string, input: DocumentInput): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ ...input, year: documentYear(input) })
    .eq('id', id)
  if (error) throw new Error(`Falha ao salvar documento: ${error.message}`)
}

/** Sobe o XML da NF-e (dado estruturado, à parte da galeria de arquivos). */
export async function uploadDocumentXml(ownerId: string, year: number, documentId: string, file: File): Promise<void> {
  const path = `${ownerId}/${year}/${documentId}/arquivo.xml`
  await removeFile(path, BUCKET).catch(() => {})
  await uploadFile(path, file, BUCKET)
  const { error } = await supabase.from('documents').update({ xml_url: path }).eq('id', documentId)
  if (error) throw new Error(`Falha ao registrar XML: ${error.message}`)
}

/**
 * Excluir na loja. Documento que a Coleção também usa só sai da loja
 * (`in_store = false`), sem tocar em arquivos nem vínculos da Coleção. Os
 * vínculos com produtos são removidos nos dois casos. Documento só da loja é
 * excluído de vez, com os arquivos.
 */
export async function deleteDocument(doc: Document): Promise<void> {
  if (doc.in_collection) {
    await supabase.from('document_store_products').delete().eq('document_id', doc.id)
    const { error } = await supabase.from('documents').update({ in_store: false, store_sale_id: null }).eq('id', doc.id)
    if (error) throw new Error(`Falha ao excluir documento: ${error.message}`)
  } else {
    const files = await fetchDocumentFiles(doc.id)
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) throw new Error(`Falha ao excluir documento: ${error.message}`)
    const paths = [doc.xml_url, ...files.map((f) => f.storage_path)].filter((p): p is string => !!p)
    await Promise.all(paths.map((p) => removeFile(p, BUCKET).catch(() => {})))
  }
  markProductsChanged()
}

// ------------------------------------------------------------------
// document_files — galeria de PDFs/imagens, com seção e legenda.
// ------------------------------------------------------------------

export async function fetchDocumentFiles(documentId: string): Promise<DocumentFile[]> {
  const { data, error } = await supabase.from('document_files').select('*').eq('document_id', documentId).order('sort_order')
  if (error) throw new Error(`Falha ao carregar arquivos: ${error.message}`)
  return data
}

function fileKindFor(file: File): DocumentFileKind {
  return file.type === 'application/pdf' ? 'pdf' : 'image'
}

export async function addDocumentFile(
  ownerId: string,
  year: number,
  documentId: string,
  file: File,
  caption: string | null,
  sortOrder: number,
  section: DocumentFileSection = 'general',
  paymentId: string | null = null,
): Promise<void> {
  const kind = fileKindFor(file)
  const ext = (file.name.split('.').pop() || (kind === 'pdf' ? 'pdf' : 'jpg')).toLowerCase()
  const path = `${ownerId}/${year}/${documentId}/files/${crypto.randomUUID()}.${ext}`
  await uploadFile(path, file, BUCKET)
  const { error } = await supabase
    .from('document_files')
    .insert({ document_id: documentId, kind, storage_path: path, caption, sort_order: sortOrder, section, payment_id: paymentId })
  if (error) {
    await removeFile(path, BUCKET).catch(() => {})
    throw new Error(`Falha ao registrar o arquivo "${file.name}": ${error.message}`)
  }
}

export async function updateDocumentFileCaption(fileId: string, caption: string | null): Promise<void> {
  const { error } = await supabase.from('document_files').update({ caption }).eq('id', fileId)
  if (error) throw new Error(`Falha ao salvar a legenda: ${error.message}`)
}

/** Grava a nova ordem (já na ordem desejada); só atualiza quem mudou. */
export async function reorderDocumentFiles(ordered: DocumentFile[]): Promise<void> {
  const changed = ordered.map((f, i) => ({ id: f.id, position: i, current: f.sort_order })).filter((x) => x.position !== x.current)
  const results = await Promise.all(changed.map((x) => supabase.from('document_files').update({ sort_order: x.position }).eq('id', x.id)))
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(`Falha ao salvar a ordem dos arquivos: ${failed.error.message}`)
}

export async function deleteDocumentFile(file: DocumentFile): Promise<void> {
  await removeFile(file.storage_path, BUCKET)
  const { error } = await supabase.from('document_files').delete().eq('id', file.id)
  if (error) throw new Error(`Falha ao excluir o arquivo: ${error.message}`)
}

// ------------------------------------------------------------------
// document_payments — vários comprovantes de pagamento por documento.
// ------------------------------------------------------------------

export async function fetchDocumentPayments(documentId: string): Promise<DocumentPayment[]> {
  const { data, error } = await supabase
    .from('document_payments')
    .select('*')
    .eq('document_id', documentId)
    .order('sort_order')
    .order('created_at')
  if (error) throw new Error(`Falha ao carregar comprovantes de pagamento: ${error.message}`)
  return data
}

export type DocumentPaymentInput = Pick<DocumentPayment, 'id' | 'payment_date' | 'amount' | 'currency' | 'method'>

/** Grava a lista completa de comprovantes (posição = `sort_order`). */
export async function saveDocumentPayments(documentId: string, rows: DocumentPaymentInput[]): Promise<void> {
  const { data: current, error: readError } = await supabase.from('document_payments').select('id').eq('document_id', documentId)
  if (readError) throw new Error(`Falha ao salvar comprovantes de pagamento: ${readError.message}`)
  const keep = new Set(rows.map((r) => r.id))
  const removed = (current ?? []).map((r) => r.id as string).filter((id) => !keep.has(id))
  if (removed.length > 0) {
    const { error } = await supabase.from('document_payments').delete().in('id', removed)
    if (error) throw new Error(`Falha ao salvar comprovantes de pagamento: ${error.message}`)
  }
  if (rows.length > 0) {
    const { error } = await supabase.from('document_payments').upsert(
      rows.map((r, i) => ({
        id: r.id,
        document_id: documentId,
        payment_date: r.payment_date,
        amount: r.amount,
        currency: r.currency,
        method: r.method,
        sort_order: i,
      })),
      { onConflict: 'id' },
    )
    if (error) throw new Error(`Falha ao salvar comprovantes de pagamento: ${error.message}`)
  }
}

/** Arquivos de um comprovante; os sem `payment_id` aparecem junto do primeiro. */
export function filesOfPayment(files: DocumentFile[], paymentId: string, isFirst: boolean): DocumentFile[] {
  return files.filter((f) => f.section === 'payment' && (f.payment_id === paymentId || (isFirst && !f.payment_id)))
}

/** Campos legados `documents.payment_*` espelham o PRIMEIRO comprovante (igual ao catálogo). */
export function legacyPaymentFields(
  rows: Pick<DocumentPaymentInput, 'payment_date' | 'amount' | 'currency' | 'method'>[],
): Pick<Document, 'payment_date' | 'payment_amount' | 'payment_method'> {
  const first = rows[0]
  if (!first) return { payment_date: null, payment_amount: null, payment_method: null }
  return {
    payment_date: first.payment_date,
    payment_amount: first.currency === 'BRL' ? first.amount : null,
    payment_method: first.method,
  }
}

// ------------------------------------------------------------------
// document_store_products — vínculo N:N documento↔produto.
// ------------------------------------------------------------------

export async function fetchProductsForDocument(documentId: string): Promise<StoreProduct[]> {
  const { data, error } = await supabase
    .from('document_store_products')
    .select('product:store_products!inner(*)')
    .eq('document_id', documentId)
    .is('product.deleted_at', null)
  if (error) throw new Error(`Falha ao carregar os produtos vinculados: ${error.message}`)
  return (data as unknown as { product: StoreProduct }[]).map((r) => r.product)
}

export async function fetchDocumentsForProduct(productId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('document_store_products')
    .select('document:documents!inner(*)')
    .eq('product_id', productId)
    .is('document.deleted_at', null)
  if (error) throw new Error(`Falha ao carregar os documentos vinculados: ${error.message}`)
  return (data as unknown as { document: Document }[]).map((r) => r.document)
}

/** Quantidade de produtos vinculados a cada documento (coluna "Itens" da lista). */
export async function fetchDocumentItemCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('document_store_products')
    .select('document_id, product:store_products!inner(deleted_at)')
    .is('product.deleted_at', null)
  if (error) throw new Error(`Falha ao contar os itens vinculados: ${error.message}`)
  const counts = new Map<string, number>()
  for (const row of data as unknown as { document_id: string }[]) counts.set(row.document_id, (counts.get(row.document_id) ?? 0) + 1)
  return counts
}

export async function linkProductsToDocument(documentId: string, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return
  const { error } = await supabase
    .from('document_store_products')
    .upsert(
      productIds.map((product_id) => ({ document_id: documentId, product_id })),
      { onConflict: 'document_id,product_id', ignoreDuplicates: true },
    )
  if (error) throw new Error(`Falha ao vincular produto(s): ${error.message}`)
}

export async function unlinkProductFromDocument(documentId: string, productId: string): Promise<void> {
  const { error } = await supabase
    .from('document_store_products')
    .delete()
    .eq('document_id', documentId)
    .eq('product_id', productId)
  if (error) throw new Error(`Falha ao desvincular o produto: ${error.message}`)
}

// ------------------------------------------------------------------
// Rótulos e funções de exibição — idênticos ao catálogo.
// ------------------------------------------------------------------

export const SECTION_DISPLAY_ORDER: DocumentSection[] = ['nfe', 'import', 'payment', 'shipping']

type SectionFlags = Pick<Document, 'has_nfe' | 'has_import' | 'has_payment' | 'has_shipping'>

export function documentSections(d: SectionFlags): DocumentSection[] {
  const active: DocumentSection[] = []
  if (d.has_nfe) active.push('nfe')
  if (d.has_import) active.push('import')
  if (d.has_payment) active.push('payment')
  if (d.has_shipping) active.push('shipping')
  return active
}

export const DOCUMENT_SECTION_LABELS: Record<DocumentSection, string> = {
  nfe: 'Nota Fiscal',
  import: 'Documentos de importação',
  payment: 'Comprovante de pagamento',
  shipping: 'Comprovante de Envio',
}

export const DOCUMENT_SECTION_SIGLA: Record<DocumentSection, string> = {
  nfe: 'NF',
  import: 'IMP',
  payment: 'PAG',
  shipping: 'ENV',
}

/** Sigla das seções ativas (ex.: "NF · PAG"), '—' se nenhuma. */
export function documentBadge(d: SectionFlags): string {
  const sections = documentSections(d)
  return sections.length > 0 ? sections.map((s) => DOCUMENT_SECTION_SIGLA[s]).join(' · ') : '—'
}

/** Número/identificador do documento — 1º disponível entre as seções que têm um. */
export function documentNumber(d: Pick<Document, 'nfe_number' | 'awb' | 'shipping_tracking'>): string | null {
  return d.nfe_number || d.awb || d.shipping_tracking || null
}

/** Rótulo compacto: siglas + número (ex.: "NF · PAG 1234"). */
export function documentTitle(d: SectionFlags & Pick<Document, 'nfe_number' | 'awb' | 'shipping_tracking'>): string {
  const badge = documentSections(d).map((s) => DOCUMENT_SECTION_SIGLA[s]).join(' · ')
  return [badge, documentNumber(d)].filter(Boolean).join(' ') || '—'
}

/** Data do resumo: a data geral (compra) e, sem ela, NF > Pagamento > Envio. */
export function documentDate(
  d: Pick<Document, 'document_date' | 'issue_date' | 'payment_date' | 'shipped_date' | 'shipping_sent_date'>,
): string | null {
  return d.document_date ?? d.issue_date ?? d.payment_date ?? d.shipped_date ?? d.shipping_sent_date
}

/** "Nome (documento fiscal)", caindo no nome sozinho. */
export function formatTitular(nome: string | null, documento: string | null): string {
  if (!nome) return '—'
  return documento ? `${nome} (${documento})` : nome
}

export const DECLARACAO_ADUANEIRA_LABELS = { DIR: 'DIR', DI: 'DI', DSI: 'DSI', DUIMP: 'DUIMP' } as const

/** (valor declarado + frete) × câmbio + impostos/taxas pagos. */
export function computeCustoTotalImportacao(
  valorProdutos: number | null,
  freight_usd: number | null,
  exchange_rate: number | null,
  impostosPagosBrl: number | null,
): number | null {
  const total = ((valorProdutos ?? 0) + (freight_usd ?? 0)) * (exchange_rate ?? 0) + (impostosPagosBrl ?? 0)
  return total > 0 ? total : null
}

/** Campos do documento que as telas de venda/estoque/cliente embutem num select. */
export const DOCUMENT_SUMMARY_SELECT = 'id, has_nfe, has_import, has_payment, has_shipping, nfe_number, awb, shipping_tracking, deleted_at'
export type DocumentSummary = Pick<
  Document,
  'id' | 'has_nfe' | 'has_import' | 'has_payment' | 'has_shipping' | 'nfe_number' | 'awb' | 'shipping_tracking' | 'deleted_at'
>

/** Referência curta de documento usada nas telas de venda, estoque e cliente. */
export interface DocumentRef {
  id: string
  title: string
  number: string | null
}

/** Converte os documentos embutidos num select em referências, sem os excluídos. */
export function toDocumentRefs(docs: DocumentSummary[] | DocumentSummary | null | undefined): DocumentRef[] {
  const list = Array.isArray(docs) ? docs : docs ? [docs] : []
  return list
    .filter((d) => !d.deleted_at)
    .map((d) => ({ id: d.id, title: documentTitle(d), number: documentNumber(d) }))
}

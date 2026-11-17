// Copiado do catálogo pessoal (`src/features/documents/DocumentFormPage.tsx`) —
// mesmo formulário, mesmas seções e o mesmo modelo de dados (tabela
// compartilhada `documents`). Diferenças da loja: vincula PRODUTOS, ganha
// "Venda vinculada" (nota fiscal de saída), sem i18n, sem PIN e sem fila de
// envio em segundo plano (o Salvar espera os arquivos subirem).
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { maskCnpjInput, maskCpfCnpjInput } from '../../lib/brMask'
import type { CustomsDeclarationType, Document, DocumentFile, DocumentFileSection, DocumentSection, StoreProduct } from '../../types/db'
import { useAlert, useConfirm } from '../../components/DialogProvider'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PackageIcon, GridViewIcon, ListViewIcon, DocumentIcon, CurrencyCircleIcon, TruckIcon, StackIcon, TagIcon, TrashIcon, PlusIcon, LinkIcon, RefreshIcon, CloseIcon } from '../../components/icons'
import { useUserId } from '../auth/AuthProvider'
import { CountrySelect } from '../../components/CountrySelect'
import { OptionSelect } from '../../components/OptionSelect'
import { SearchSelect } from '../../components/SearchSelect'
import { FileViewer } from '../../components/FileViewer'
import { useFileDrop } from '../../lib/useFileDrop'
import { runWithConcurrency } from '../../lib/concurrency'
import { formatMoney } from '../../lib/format'
import { useCoverUrls, useProducts } from '../products/queries'
import { fetchSuppliers, createSupplier, type StoreSupplierInput } from '../suppliers/api'
import { SupplierFormDialog } from '../suppliers/SupplierFormDialog'
import { fetchSales } from '../sales/api'
import { PickProductsDialog } from './PickProductsDialog'
import { TransportadoraSelect } from './TransportadoraSelect'
import { TitularSelect } from './TitularSelect'
import { useDocumentFileUrl } from './useDocumentFileUrl'
import {
  DECLARACAO_ADUANEIRA_LABELS,
  DOCUMENT_SECTION_LABELS,
  addDocumentFile,
  computeCustoTotalImportacao,
  createDocument,
  deleteDocument,
  deleteDocumentFile,
  documentYear,
  fetchDocument,
  fetchDocumentFiles,
  fetchDocumentPayments,
  fetchDocumentItems,
  saveDocumentItems,
  readDocumentXml,
  fetchProductsForDocument,
  filesOfPayment,
  legacyPaymentFields,
  linkProductsToDocument,
  reorderDocumentFiles,
  saveDocumentPayments,
  type DocumentPaymentInput,
  unlinkProductFromDocument,
  updateDocument,
  updateDocumentFileCaption,
  uploadDocumentXml,
  type DocumentInput,
} from './api'
import { PAYMENT_CURRENCIES, documentAmountsTotal, sumByCurrency } from './totals'
import { DocumentItemsEditor, itemInputs, itemRowFilled, itemRowFrom, type ItemRow } from './DocumentItemsEditor'
import { isNfeXml, nfeAmounts, parseNfeXml, type NfeData } from './nfeXml'

/** Move o item `index` uma posição (antes/depois); devolve a mesma lista se não der. */
function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

const QUICK_SECTIONS: DocumentSection[] = ['nfe', 'import', 'payment', 'shipping']
/** Ícone por seção — usado no checklist e no título de cada bloco. */
const SECTION_ICON: Record<DocumentSection, ReactNode> = {
  nfe: <DocumentIcon />,
  import: <PackageIcon />,
  payment: <CurrencyCircleIcon />,
  shipping: <TruckIcon />,
}

const txt = (s: string) => (s.trim() === '' ? null : s.trim())
const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))

interface FormState {
  has_nfe: boolean
  has_import: boolean
  has_payment: boolean
  has_shipping: boolean
  holder_name: string
  holder_tax_id: string
  supplier_name: string
  /** Cadastro vivo (0151) — '' = sem vínculo. `supplier_name` é o nome como consta na nota. */
  supplier_id: string
  supplier_storefront_id: string
  document_date: string
  goods_amount: string
  freight_amount: string
  fees_amount: string
  amounts_currency: string
  issue_date: string
  notes: string
  general_notes: string
  nfe_number: string
  nfe_series: string
  nfe_key: string
  nfe_protocol: string
  supplier_tax_id: string
  recipient_tax_id: string
  item_description: string
  item_quantity: string
  item_line_total: string
  item_allocated_value: string
  invoice_number: string
  awb: string
  purchase_country: string
  shipped_date: string
  arrival_date: string
  customs_type: CustomsDeclarationType | ''
  customs_number: string
  carrier: string
  declared_contents: string
  shipment_weight_kg: string
  goods_usd: string
  freight_usd: string
  exchange_rate: string
  taxes_brl: string
  import_cost_brl: string
  shipping_carrier: string
  shipping_tracking: string
  shipping_sent_date: string
  shipping_delivered_date: string
  /** Venda da loja (nota fiscal de saída) — '' = sem vínculo. */
  store_sale_id: string
}

const EMPTY: FormState = {
  has_nfe: true,
  has_import: false,
  has_payment: false,
  has_shipping: false,
  holder_name: '',
  holder_tax_id: '',
  supplier_name: '',
  supplier_id: '',
  supplier_storefront_id: '',
  issue_date: '',
  document_date: '',
  goods_amount: '',
  freight_amount: '',
  fees_amount: '',
  amounts_currency: 'BRL',
  notes: '',
  general_notes: '',
  nfe_number: '',
  nfe_series: '',
  nfe_key: '',
  nfe_protocol: '',
  supplier_tax_id: '',
  recipient_tax_id: '',
  item_description: '',
  item_quantity: '',
  item_line_total: '',
  item_allocated_value: '',
  invoice_number: '',
  awb: '',
  purchase_country: '',
  shipped_date: '',
  arrival_date: '',
  customs_type: '',
  customs_number: '',
  carrier: '',
  declared_contents: '',
  shipment_weight_kg: '',
  goods_usd: '',
  freight_usd: '',
  exchange_rate: '',
  taxes_brl: '',
  import_cost_brl: '',
  shipping_carrier: '',
  shipping_tracking: '',
  shipping_sent_date: '',
  shipping_delivered_date: '',
  store_sale_id: '',
}

/** Comprovante de pagamento como o formulário o edita (texto nos campos numéricos). */
interface PaymentRow {
  id: string
  payment_date: string
  amount: string
  currency: string
  method: string
}

const newPaymentRow = (): PaymentRow => ({
  id: crypto.randomUUID(),
  payment_date: '',
  amount: '',
  currency: 'BRL',
  method: '',
})

function fromDocument(d: Document): FormState {
  return {
    has_nfe: d.has_nfe,
    has_import: d.has_import,
    has_payment: d.has_payment,
    has_shipping: d.has_shipping,
    holder_name: d.holder_name ?? '',
    holder_tax_id: d.holder_tax_id ?? '',
    supplier_name: d.supplier_name ?? '',
    supplier_id: d.supplier_id ?? '',
    supplier_storefront_id: d.supplier_storefront_id ?? '',
    issue_date: d.issue_date ?? '',
    document_date: d.document_date ?? '',
    goods_amount: d.goods_amount?.toString() ?? '',
    freight_amount: d.freight_amount?.toString() ?? '',
    fees_amount: d.fees_amount?.toString() ?? '',
    amounts_currency: d.amounts_currency || 'BRL',
    notes: d.notes ?? '',
    general_notes: d.general_notes ?? '',
    nfe_number: d.nfe_number ?? '',
    nfe_series: d.nfe_series ?? '',
    nfe_key: d.nfe_key ?? '',
    nfe_protocol: d.nfe_protocol ?? '',
    supplier_tax_id: d.supplier_tax_id ?? '',
    recipient_tax_id: d.recipient_tax_id ?? '',
    item_description: d.item_description ?? '',
    item_quantity: d.item_quantity?.toString() ?? '',
    item_line_total: d.item_line_total?.toString() ?? '',
    item_allocated_value: d.item_allocated_value?.toString() ?? '',
    invoice_number: d.invoice_number ?? '',
    awb: d.awb ?? '',
    purchase_country: d.purchase_country ?? '',
    shipped_date: d.shipped_date ?? '',
    arrival_date: d.arrival_date ?? '',
    customs_type: d.customs_type ?? '',
    customs_number: d.customs_number ?? '',
    carrier: d.carrier ?? '',
    declared_contents: d.declared_contents ?? '',
    shipment_weight_kg: d.shipment_weight_kg?.toString() ?? '',
    goods_usd: d.goods_usd?.toString() ?? '',
    freight_usd: d.freight_usd?.toString() ?? '',
    exchange_rate: d.exchange_rate?.toString() ?? '',
    taxes_brl: d.taxes_brl?.toString() ?? '',
    import_cost_brl: d.import_cost_brl?.toString() ?? '',
    shipping_carrier: d.shipping_carrier ?? '',
    shipping_tracking: d.shipping_tracking ?? '',
    shipping_sent_date: d.shipping_sent_date ?? '',
    shipping_delivered_date: d.shipping_delivered_date ?? '',
    store_sale_id: d.store_sale_id ?? '',
  }
}

export function DocumentFormPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-24">
      <DocumentForm />
    </div>
  )
}

function DocumentForm() {
  const confirm = useConfirm()
  const alert = useAlert()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ownerId = useUserId()

  const [f, setF] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [xmlFile, setXmlFile] = useState<File | null>(null)
  // Na edição, cada arquivo sobe na hora: enquanto sobe, aparece como card com
  // indicador (mesmo padrão das mídias do item) e sai quando a galeria recarrega.
  // `group`: 'general' | 'shipping' | `payment:<id da linha>`.
  const [uploadingFiles, setUploadingFiles] = useState<{ key: number; group: string; file: File }[]>([])
  const uploadKeyRef = useRef(0)
  // Arquivos (PDF/imagem) escolhidos ANTES de salvar (só na criação — depois
  // de existir o documento, cada arquivo sobe na hora), separados por seção
  // — cada seção tem sua própria mini-galeria (0158).
  const [pendingFiles, setPendingFiles] = useState<Record<DocumentFileSection, { file: File; caption: string }[]>>({
    general: [],
    nfe: [],
    import: [],
    payment: [],
    shipping: [],
  })
  // Produtos escolhidos ANTES de salvar (só na criação — depois é direto na tabela).
  const [pendingProductIds, setPendingProductIds] = useState<Set<string>>(new Set())
  const [picking, setPicking] = useState(false)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  // Linhas de produto da NF-e (0204) — gravadas no Salvar, como os comprovantes.
  const [items, setItems] = useState<ItemRow[]>([])
  const [xmlBusy, setXmlBusy] = useState(false)
  // Arquivos escolhidos para comprovantes AINDA NÃO gravados (chave = id da linha), enviados ao salvar.
  const [pendingPaymentFiles, setPendingPaymentFiles] = useState<Record<string, { file: File; caption: string }[]>>({})
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [hidePhotos, setHidePhotos] = useState(false)
  const [itemsExpanded, setItemsExpanded] = useState(false)
  const [newSupplierOpen, setNewSupplierOpen] = useState(false)

  const set = (patch: Partial<FormState>) => setF((prev) => ({ ...prev, ...patch }))

  const { data: existing } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument(id!),
    enabled: isEdit,
  })
  const { data: linkedProducts, isLoading: loadingLinked } = useQuery({
    queryKey: ['document-products', id],
    queryFn: () => fetchProductsForDocument(id!),
    enabled: isEdit,
  })
  const { data: documentFiles } = useQuery({
    queryKey: ['document-files', id],
    queryFn: () => fetchDocumentFiles(id!),
    enabled: isEdit,
  })
  const { data: savedPayments } = useQuery({
    queryKey: ['document-payments', id],
    queryFn: () => fetchDocumentPayments(id!),
    enabled: isEdit,
  })
  const { data: savedItems } = useQuery({
    queryKey: ['document-items', id],
    queryFn: () => fetchDocumentItems(id!),
    enabled: isEdit,
  })
  useEffect(() => {
    if (savedItems) setItems(savedItems.map((i) => itemRowFrom(i)))
  }, [savedItems])
  const { data: allProducts } = useProducts()
  const { data: coverUrls } = useCoverUrls()
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers })
  const { data: sales } = useQuery({ queryKey: ['sales'], queryFn: fetchSales })

  // Chegando de "Vendas" (?sale=<id>): pré-preenche o vínculo da nota de saída.
  const saleParam = searchParams.get('sale')
  useEffect(() => {
    if (!isEdit && saleParam) setF((prev) => ({ ...prev, store_sale_id: saleParam }))
  }, [isEdit, saleParam])
  // Chegando da ficha de um produto (?product=<id>): já nasce vinculado a ele.
  const productParam = searchParams.get('product')
  useEffect(() => {
    if (!isEdit && productParam) setPendingProductIds((prev) => new Set([...prev, productParam]))
  }, [isEdit, productParam])

  useEffect(() => {
    if (existing) setF(fromDocument(existing))
  }, [existing])

  useEffect(() => {
    if (!savedPayments) return
    setPayments(
      savedPayments.map((p) => ({
        id: p.id,
        payment_date: p.payment_date ?? '',
        amount: p.amount?.toString() ?? '',
        currency: p.currency,
        method: p.method ?? '',
      })),
    )
  }, [savedPayments])

  // Seção ligada sempre mostra ao menos uma linha vazia (não é gravada se ficar em branco).
  const paymentsReady = !isEdit || savedPayments !== undefined
  useEffect(() => {
    if (f.has_payment && paymentsReady && payments.length === 0) setPayments((prev) => (prev.length > 0 ? prev : [newPaymentRow()]))
  }, [f.has_payment, paymentsReady, payments.length])

  const setPaymentRow =(rowId: string, patch: Partial<PaymentRow>) =>
    setPayments((prev) => prev.map((p) => (p.id === rowId ? { ...p, ...patch } : p)))
  // Linhas sem nenhum dado preenchido não são gravadas.
  const paymentInputs: DocumentPaymentInput[] = payments
    .filter((p) => p.payment_date || p.amount.trim() || p.method.trim() || (pendingPaymentFiles[p.id]?.length ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      payment_date: p.payment_date || null,
      amount: num(p.amount),
      currency: p.currency,
      method: txt(p.method),
    }))
  const paymentTotals = sumByCurrency(paymentInputs)

  const { data: xmlUrl } = useDocumentFileUrl(existing?.xml_url)

  const refreshFiles = () => queryClient.invalidateQueries({ queryKey: ['document-files', id] })

  /** Sobe os arquivos (até 3 em paralelo) mostrando um card por arquivo enquanto envia. */
  const uploadNow = async (files: File[], group: string, run: (file: File, index: number) => Promise<void>) => {
    const entries = files.map((file) => ({ key: ++uploadKeyRef.current, group, file }))
    setUploadingFiles((prev) => [...prev, ...entries])
    let firstError: unknown
    await runWithConcurrency(entries, 3, async (entry, i) => {
      try {
        await run(entry.file, i)
        // Espera a galeria recarregar antes de tirar o card, para o arquivo não "piscar".
        await refreshFiles()
      } catch (err) {
        firstError ??= err
      } finally {
        setUploadingFiles((prev) => prev.filter((u) => u.key !== entry.key))
      }
    })
    if (firstError) throw firstError
  }
  const uploadingOf = (group: string) => uploadingFiles.filter((u) => u.group === group).map((u) => u.file)

  const handleFilesSelected = async (fileList: FileList | null, section: DocumentFileSection = 'general') => {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    if (isEdit && existing) {
      try {
        // Até 3 arquivos em paralelo; a ordem é decidida pela posição, antes de disparar.
        const start = documentFiles?.filter((f2) => f2.section === section).length ?? 0
        const year = existing.year ?? new Date().getFullYear()
        await uploadNow(files, section, (file, i) => addDocumentFile(ownerId, year, id!, file, null, start + i, section))
      } catch (err) {
        await alert(err instanceof Error ? err.message : 'Erro ao enviar arquivo(s).')
      }
    } else {
      setPendingFiles((prev) => ({ ...prev, [section]: [...prev[section], ...files.map((file) => ({ file, caption: '' }))] }))
    }
  }

  const handlePendingCaption = (section: DocumentFileSection, index: number, caption: string) =>
    setPendingFiles((prev) => ({
      ...prev,
      [section]: prev[section].map((pf, i) => (i === index ? { ...pf, caption } : pf)),
    }))

  const handleRemovePendingFile = (section: DocumentFileSection, index: number) =>
    setPendingFiles((prev) => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }))

  const handleExistingCaption = async (file: DocumentFile, caption: string) => {
    try {
      await updateDocumentFileCaption(file.id, caption.trim() || null)
      refreshFiles()
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao salvar legenda.')
    }
  }

  // ---- Arquivos por comprovante ----
  const savedPaymentIds = new Set((savedPayments ?? []).map((p) => p.id))
  const paymentFiles = (rowId: string, index: number) => filesOfPayment(documentFiles ?? [], rowId, index === 0)

  const handlePaymentFilesSelected = async (rowId: string, index: number, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    if (isEdit && existing && savedPaymentIds.has(rowId)) {
      try {
        const start = paymentFiles(rowId, index).length
        const year = existing.year ?? new Date().getFullYear()
        await uploadNow(files, `payment:${rowId}`, (file, i) =>
          addDocumentFile(ownerId, year, id!, file, null, start + i, 'payment', rowId),
        )
      } catch (err) {
        await alert(err instanceof Error ? err.message : 'Erro ao enviar arquivo(s).')
      }
    } else {
      setPendingPaymentFiles((prev) => ({ ...prev, [rowId]: [...(prev[rowId] ?? []), ...files.map((file) => ({ file, caption: '' }))] }))
    }
  }
  const handlePaymentPendingCaption = (rowId: string, i: number, caption: string) =>
    setPendingPaymentFiles((prev) => ({ ...prev, [rowId]: (prev[rowId] ?? []).map((pf, k) => (k === i ? { ...pf, caption } : pf)) }))
  const handlePaymentPendingRemove = (rowId: string, i: number) =>
    setPendingPaymentFiles((prev) => ({ ...prev, [rowId]: (prev[rowId] ?? []).filter((_, k) => k !== i) }))
  const handlePaymentPendingMove = (rowId: string, i: number, delta: -1 | 1) =>
    setPendingPaymentFiles((prev) => ({ ...prev, [rowId]: moveItem(prev[rowId] ?? [], i, delta) }))
  const handlePaymentExistingMove = async (list: DocumentFile[], index: number, delta: -1 | 1) => {
    const next = moveItem(list, index, delta)
    if (next === list) return
    try {
      await reorderDocumentFiles(next)
    } catch (err) {
      await alert(err instanceof Error ? err.message : String(err))
    } finally {
      refreshFiles()
    }
  }

  const filesOf = (section: DocumentFileSection) => (documentFiles ?? []).filter((f2) => f2.section === section)

  // Antes/depois dentro da seção do arquivo. A tela já mostra a nova ordem na
  // hora (cache do React Query); o banco recebe a posição de cada arquivo.
  const handleMoveExisting = async (section: DocumentFileSection, index: number, delta: -1 | 1) => {
    const list = filesOf(section)
    const next = moveItem(list, index, delta)
    if (next === list) return
    queryClient.setQueryData<DocumentFile[]>(['document-files', id], (old) =>
      old
        ?.map((f2) => {
          const pos = next.findIndex((n) => n.id === f2.id)
          return pos >= 0 ? { ...f2, sort_order: pos } : f2
        })
        .sort((a, b) => a.sort_order - b.sort_order),
    )
    try {
      await reorderDocumentFiles(next)
    } catch (err) {
      await alert(err instanceof Error ? err.message : String(err))
    } finally {
      refreshFiles()
    }
  }

  const handleMovePending = (section: DocumentFileSection, index: number, delta: -1 | 1) =>
    setPendingFiles((prev) => ({ ...prev, [section]: moveItem(prev[section], index, delta) }))

  const handleRemoveExistingFile = async (file: DocumentFile) => {
    if (!(await confirm('Remover este arquivo?', { danger: true }))) return
    try {
      await deleteDocumentFile(file)
      refreshFiles()
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao remover arquivo.')
    }
  }

  const displayedProducts: StoreProduct[] = isEdit
    ? (linkedProducts ?? [])
    : (allProducts ?? []).filter((p) => pendingProductIds.has(p.id))
  // Limitador (mesmo padrão do catálogo): grade 6, lista 10.
  const itemsLimit = view === 'grid' ? 6 : 10
  const visibleProducts = itemsExpanded ? displayedProducts : displayedProducts.slice(0, itemsLimit)

  const refreshLinked = () => {
    queryClient.invalidateQueries({ queryKey: ['document-products', id] })
    queryClient.invalidateQueries({ queryKey: ['product-documents'] })
  }

  const handleAddProducts = async (ids: string[]) => {
    if (isEdit) {
      try {
        await linkProductsToDocument(id!, ids)
        setPicking(false)
        refreshLinked()
      } catch (err) {
        await alert(err instanceof Error ? err.message : 'Erro ao vincular produtos.')
      }
    } else {
      setPendingProductIds((prev) => new Set([...prev, ...ids]))
      setPicking(false)
      // Fornecedor do 1º produto escolhido que tiver um, se o documento ainda não tem.
      if (!f.supplier_id && !f.supplier_name.trim()) {
        const withSupplier = ids.map((pid) => allProducts?.find((p) => p.id === pid)).find((p) => p?.supplier_id)
        const supplier = withSupplier && suppliers?.find((s) => s.id === withSupplier.supplier_id)
        if (supplier) set({ supplier_id: supplier.id, supplier_name: supplier.legal_name ?? supplier.name })
      }
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    if (isEdit) {
      if (!(await confirm('Desvincular este produto do documento?', { danger: true }))) return
      try {
        await unlinkProductFromDocument(id!, productId)
        refreshLinked()
      } catch (err) {
        await alert(err instanceof Error ? err.message : 'Erro ao desvincular.')
      }
    } else {
      setPendingProductIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  const pickSupplier = (supplierId: string) => {
    const supplier = suppliers?.find((s) => s.id === supplierId)
    // Completa só o que está vazio: o nome/CNPJ da nota é registro histórico.
    set({
      supplier_id: supplierId,
      ...(f.supplier_name.trim() || !supplier ? {} : { supplier_name: supplier.legal_name ?? supplier.name }),
      ...(f.supplier_tax_id.trim() || !supplier?.tax_id ? {} : { supplier_tax_id: supplier.tax_id }),
    })
  }

  const handleCreateSupplier = async (input: StoreSupplierInput) => {
    const created = await createSupplier(input)
    await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    set({ supplier_id: created.id, ...(f.supplier_name.trim() ? {} : { supplier_name: created.legal_name ?? created.name }) })
    setNewSupplierOpen(false)
  }

  const handleDelete = async () => {
    if (!existing) return
    const count = linkedProducts?.length ?? 0
    const warn = count > 0 ? ` ${count === 1 ? '1 produto será desvinculado.' : `${count} produtos serão desvinculados.`}` : ''
    const message = existing.in_collection
      ? 'Excluir este documento da loja? Ele continua na Coleção, com os arquivos.'
      : 'Excluir este documento? Os arquivos também são excluídos. Esta ação não pode ser desfeita.'
    if (!(await confirm(`${message}${warn}`, { danger: true, confirmLabel: 'Excluir' }))) return
    setBusy(true)
    try {
      await deleteDocument(existing)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      navigate('/documentos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao apagar.')
      setBusy(false)
    }
  }

  /**
   * Preenche o documento com os dados da NF-e lida do XML: só campos VAZIOS
   * (o que já foi digitado prevalece). As linhas de produto substituem as
   * atuais depois de confirmar, se houver alguma preenchida.
   */
  const applyNfe = async (d: NfeData) => {
    const patch: Partial<FormState> = { has_nfe: true }
    let changed = !f.has_nfe
    const fill = (key: 'nfe_number' | 'nfe_series' | 'nfe_key' | 'nfe_protocol' | 'issue_date' | 'document_date' | 'supplier_name' | 'supplier_tax_id' | 'recipient_tax_id' | 'general_notes', value: string | null) => {
      if (value && !f[key].trim()) {
        patch[key] = value
        changed = true
      }
    }
    const taxId = (v: string | null) => (v ? (v.length > 11 ? maskCnpjInput(v) : maskCpfCnpjInput(v)) : null)
    fill('nfe_number', d.number)
    fill('nfe_series', d.series)
    fill('nfe_key', d.key)
    fill('nfe_protocol', d.protocol)
    fill('issue_date', d.issueDate)
    fill('document_date', d.issueDate)
    fill('supplier_name', d.issuerName)
    fill('supplier_tax_id', taxId(d.issuerTaxId))
    fill('recipient_tax_id', taxId(d.recipientTaxId))
    fill('general_notes', d.additionalInfo)
    if (!f.supplier_id && d.issuerTaxId) {
      const match = (suppliers ?? []).find((s) => s.tax_id && s.tax_id.replace(/\D/g, '') === d.issuerTaxId)
      if (match) patch.supplier_id = match.id
    }
    if (!f.goods_amount.trim() && !f.freight_amount.trim() && !f.fees_amount.trim()) {
      const a = nfeAmounts(d)
      if (a.goods != null || a.freight != null || a.fees != null) {
        patch.goods_amount = a.goods?.toString() ?? ''
        patch.freight_amount = a.freight?.toString() ?? ''
        patch.fees_amount = a.fees?.toString() ?? ''
        patch.amounts_currency = 'BRL'
        changed = true
      }
    }
    if (patch.supplier_id) changed = true
    set(patch)
    if (d.items.length > 0) {
      const hasLines = items.some(itemRowFilled)
      const count = d.items.length
      if (!hasLines || (await confirm(count === 1 ? 'Substituir as linhas atuais pela linha do XML?' : `Substituir as linhas atuais pelas ${count} linhas do XML?`))) {
        setItems(d.items.map((i) => itemRowFrom(i)))
        changed = true
      }
    }
    await alert(changed ? 'Dados do XML aplicados aos campos vazios.' : 'Os campos já estavam preenchidos. Nada foi alterado.')
  }

  /** XML escolhido no campo: guarda para enviar no Salvar e preenche o documento. */
  const handleXmlSelected = async (file: File | null) => {
    setXmlFile(file)
    if (!file) return
    try {
      const text = await file.text()
      if (!isNfeXml(text)) return
      await applyNfe(parseNfeXml(text))
    } catch (err) {
      await alert(err instanceof Error ? err.message : String(err))
    }
  }

  /** XML já salvo no documento: lê do armazenamento e preenche. */
  const handleReadSavedXml = async () => {
    if (!existing?.xml_url) return
    setXmlBusy(true)
    try {
      await applyNfe(parseNfeXml(await readDocumentXml(existing.xml_url)))
    } catch (err) {
      await alert(err instanceof Error ? err.message : String(err))
    } finally {
      setXmlBusy(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const input: DocumentInput = {
        has_nfe: f.has_nfe,
        has_import: f.has_import,
        has_payment: f.has_payment,
        has_shipping: f.has_shipping,
        holder_name: txt(f.holder_name),
        holder_tax_id: txt(f.holder_tax_id),
        supplier_name: txt(f.supplier_name),
        supplier_id: f.supplier_id || null,
        supplier_storefront_id: (f.supplier_id && f.supplier_storefront_id) || null,
        issue_date: f.has_nfe ? f.issue_date || null : null,
        document_date: f.document_date || null,
        goods_amount: num(f.goods_amount),
        freight_amount: num(f.freight_amount),
        fees_amount: num(f.fees_amount),
        amounts_currency: f.amounts_currency || 'BRL',
        notes: txt(f.notes),
        general_notes: txt(f.general_notes),
        nfe_number: f.has_nfe ? txt(f.nfe_number) : null,
        nfe_series: f.has_nfe ? txt(f.nfe_series) : null,
        nfe_key: f.has_nfe ? txt(f.nfe_key) : null,
        nfe_protocol: f.has_nfe ? txt(f.nfe_protocol) : null,
        supplier_tax_id: f.has_nfe ? txt(f.supplier_tax_id) : null,
        recipient_tax_id: f.has_nfe ? txt(f.recipient_tax_id) : null,
        item_description: f.has_nfe ? txt(f.item_description) : null,
        item_quantity: f.has_nfe ? num(f.item_quantity) : null,
        item_line_total: f.has_nfe ? num(f.item_line_total) : null,
        item_allocated_value: f.has_nfe ? num(f.item_allocated_value) : null,
        invoice_number: f.has_import ? txt(f.invoice_number) : null,
        awb: f.has_import ? txt(f.awb) : null,
        purchase_country: f.has_import ? txt(f.purchase_country) : null,
        shipped_date: f.has_import ? f.shipped_date || null : null,
        arrival_date: f.has_import ? f.arrival_date || null : null,
        customs_type: f.has_import ? f.customs_type || null : null,
        customs_number: f.has_import ? txt(f.customs_number) : null,
        carrier: f.has_import ? txt(f.carrier) : null,
        declared_contents: f.has_import ? txt(f.declared_contents) : null,
        shipment_weight_kg: f.has_import ? num(f.shipment_weight_kg) : null,
        goods_usd: f.has_import ? num(f.goods_usd) : null,
        freight_usd: f.has_import ? num(f.freight_usd) : null,
        exchange_rate: f.has_import ? num(f.exchange_rate) : null,
        taxes_brl: f.has_import ? num(f.taxes_brl) : null,
        import_cost_brl: f.has_import ? computeTotal(f) : null,
        ...legacyPaymentFields(f.has_payment ? paymentInputs : []),
        shipping_carrier: f.has_shipping ? txt(f.shipping_carrier) : null,
        shipping_tracking: f.has_shipping ? txt(f.shipping_tracking) : null,
        shipping_sent_date: f.has_shipping ? f.shipping_sent_date || null : null,
        shipping_delivered_date: f.has_shipping ? f.shipping_delivered_date || null : null,
        store_sale_id: f.store_sale_id || null,
      }

      let targetId = id
      const linkedNew = !isEdit && pendingProductIds.size > 0
      if (isEdit) {
        await updateDocument(id!, input)
      } else {
        targetId = await createDocument(input)
        if (linkedNew) await linkProductsToDocument(targetId, [...pendingProductIds])
      }
      // Comprovantes: só mexe na tabela com a seção ligada (desligar não apaga os registros).
      if (f.has_payment) await saveDocumentPayments(targetId!, paymentInputs)
      // Linhas da nota: só com a seção NF-e ligada (desligar não apaga as linhas gravadas).
      if (f.has_nfe) await saveDocumentItems(targetId!, itemInputs(items))
      queryClient.invalidateQueries({ queryKey: ['document-items', targetId] })
      queryClient.invalidateQueries({ queryKey: ['document-payments', targetId] })

      // XML e arquivos sobem antes de sair da tela (até 3 em paralelo). O ano
      // (pasta no Storage) é o mesmo que o banco acabou de gravar.
      const docId = targetId!
      const year = documentYear(input)
      const tasks: (() => Promise<void>)[] = []
      if (xmlFile) tasks.push(() => uploadDocumentXml(ownerId, year, docId, xmlFile))
      if (!isEdit) {
        for (const [section, list] of Object.entries(pendingFiles) as [DocumentFileSection, { file: File; caption: string }[]][]) {
          list.forEach((pf, i) => tasks.push(() => addDocumentFile(ownerId, year, docId, pf.file, txt(pf.caption), i, section)))
        }
      }
      for (const p of paymentInputs) {
        ;(pendingPaymentFiles[p.id] ?? []).forEach((pf, i) =>
          tasks.push(() => addDocumentFile(ownerId, year, docId, pf.file, txt(pf.caption), i, 'payment', p.id)),
        )
      }
      let uploadError: unknown
      await runWithConcurrency(tasks, 3, async (task) => {
        try {
          await task()
        } catch (err) {
          uploadError ??= err
        }
      })
      queryClient.invalidateQueries({ queryKey: ['document-files', docId] })
      if (uploadError) await alert(uploadError instanceof Error ? uploadError.message : 'Erro ao enviar arquivo(s).')

      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document', targetId] })
      if (linkedNew) {
        queryClient.invalidateQueries({ queryKey: ['document-products', targetId] })
        queryClient.invalidateQueries({ queryKey: ['product-documents'] })
      }
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      navigate(`/documentos/${targetId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setBusy(false)
    }
  }

  const amountsTotal = documentAmountsTotal({
    goods_amount: num(f.goods_amount),
    freight_amount: num(f.freight_amount),
    fees_amount: num(f.fees_amount),
  })
  // Importação ligada, valores da compra vazios e câmbio informado: oferece
  // copiar os valores declarados, convertidos para R$ (não preenche sozinho).
  const declaredAmounts = useMemo((): Partial<FormState> | null => {
    if (!f.has_import || amountsTotal != null) return null
    const rate = num(f.exchange_rate)
    const goods = num(f.goods_usd)
    const freight = num(f.freight_usd)
    const taxes = num(f.taxes_brl)
    if (goods == null && freight == null && taxes == null) return null
    if ((goods != null || freight != null) && (rate == null || !(rate > 0))) return null
    const brl = (v: number | null) => (v == null ? '' : (Math.round(v * rate! * 100) / 100).toString())
    return {
      goods_amount: brl(goods),
      freight_amount: brl(freight),
      fees_amount: taxes == null ? '' : taxes.toString(),
      amounts_currency: 'BRL',
    }
  }, [f.has_import, amountsTotal, f.exchange_rate, f.goods_usd, f.freight_usd, f.taxes_brl])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-100">{isEdit ? 'Editar documento' : 'Novo documento'}</h1>
        <Link to={isEdit ? `/documentos/${id}` : '/documentos'} className="link text-sm">
          {'← Voltar'}
        </Link>
      </div>

      <Section title={'Seções'} icon={<TagIcon />}>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_SECTIONS.map((s) => {
            const key = `has_${s}` as const
            const active = f[key]
            return (
              <button
                key={s}
                type="button"
                onClick={() => set({ [key]: !active } as Partial<FormState>)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {SECTION_ICON[s]} {DOCUMENT_SECTION_LABELS[s]}
              </button>
            )
          })}
        </div>
        <Field label={'Titular'}>
          <TitularSelect
            nome={f.holder_name}
            documento={f.holder_tax_id}
            onChange={(nome, documento) => set({ holder_name: nome, holder_tax_id: documento })}
          />
        </Field>
        <div className="block w-full">
          <span className="mb-1 flex items-center justify-between text-xs text-stone-400">
            {'Fornecedor (cadastro)'}
            <button type="button" onClick={() => setNewSupplierOpen(true)} className="link text-xs">
              Cadastrar fornecedor
            </button>
          </span>
          <SearchSelect
            items={(suppliers ?? []).map((s) => ({ id: s.id, label: s.name, sublabel: s.legal_name && s.legal_name !== s.name ? s.legal_name : undefined }))}
            value={f.supplier_id}
            onChange={pickSupplier}
            placeholder="Digite para buscar um fornecedor…"
            emptyText="Nenhum fornecedor encontrado."
          />
        </div>
        <Field label="Venda vinculada (nota fiscal de saída)">
          <SearchSelect
            items={(sales ?? []).map((sale) => ({
              id: sale.id,
              label: `${new Date(sale.sale_date).toLocaleDateString('pt-BR')} · ${sale.customer?.name ?? 'Sem cliente'}`,
              sublabel: formatMoney(sale.total),
            }))}
            value={f.store_sale_id}
            onChange={(v) => set({ store_sale_id: v })}
            placeholder="Digite para buscar uma venda…"
            emptyText="Nenhuma venda encontrada."
          />
        </Field>
        <Field label={'Data do documento (compra)'}>
          <input type="date" value={f.document_date} onChange={(e) => set({ document_date: e.target.value })} className="input" />
        </Field>
        <Field label={'Observações'}>
          <textarea
            rows={3}
            value={f.general_notes}
            onChange={(e) => set({ general_notes: e.target.value })}
            placeholder={'Informações adicionais sobre o documento.'}
            className="input"
          />
        </Field>
      </Section>

      <Section title={'Valores da compra'} icon={<CurrencyCircleIcon />}>
        <p className="text-xs text-stone-500">{'Valores reais da compra, independentes da nota fiscal e da declaração de importação. O total é a soma dos três valores.'}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={'Valor dos produtos'}>
            <input inputMode="decimal" value={f.goods_amount} onChange={(e) => set({ goods_amount: e.target.value })} className="input" />
          </Field>
          <Field label={'Frete'}>
            <input inputMode="decimal" value={f.freight_amount} onChange={(e) => set({ freight_amount: e.target.value })} className="input" />
          </Field>
          <Field label={'Impostos e taxas'}>
            <input inputMode="decimal" value={f.fees_amount} onChange={(e) => set({ fees_amount: e.target.value })} className="input" />
          </Field>
          <Field label={'Moeda'}>
            <OptionSelect
              value={f.amounts_currency}
              ariaLabel={'Moeda'}
              options={PAYMENT_CURRENCIES.map((c) => ({ value: c, label: c }))}
              onChange={(v) => set({ amounts_currency: v })}
            />
          </Field>
        </div>
        {amountsTotal != null && (
          <p className="text-sm text-stone-300">
            <span className="text-stone-400">{'Valor total'}:</span>{' '}
            <span className="font-semibold text-amber-400">{formatMoney(amountsTotal, f.amounts_currency)}</span>
          </p>
        )}
        {declaredAmounts && (
          <button type="button" onClick={() => set(declaredAmounts)} className="link text-sm">
            {'Preencher com os valores declarados na importação, convertidos para R$'}
          </button>
        )}
      </Section>

      {f.has_nfe && (
        <Section title={'NF-e'} icon={<DocumentIcon />}>
          <Field label={'Arquivo XML'}>
            <input type="file" accept=".xml,text/xml,application/xml" onChange={(e) => void handleXmlSelected(e.target.files?.[0] ?? null)} className="input" />
            <p className="mt-1 text-xs text-stone-500">{'Ao escolher o XML, os campos vazios do documento são preenchidos com os dados da nota.'}</p>
            {existing?.xml_url && !xmlFile && (
              <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <a href={xmlUrl} target="_blank" rel="noreferrer" className="link text-xs">
                  {'Ver XML atual'}
                </a>
                <button type="button" onClick={() => void handleReadSavedXml()} disabled={xmlBusy} className="link text-xs disabled:opacity-50">
                  {'Preencher com os dados do XML salvo'}
                </button>
              </span>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={'Número'}>
              <input value={f.nfe_number} onChange={(e) => set({ nfe_number: e.target.value })} className="input" />
            </Field>
            <Field label={'Série'}>
              <input value={f.nfe_series} onChange={(e) => set({ nfe_series: e.target.value })} className="input" />
            </Field>
          </div>
          <Field label={'Nome do fornecedor na nota'}>
            <input value={f.supplier_name} onChange={(e) => set({ supplier_name: e.target.value })} className="input" />
          </Field>
          <Field label={'Data de emissão'}>
            <input type="date" value={f.issue_date} onChange={(e) => set({ issue_date: e.target.value })} className="input" />
          </Field>
          <Field label={'Chave de acesso (44 dígitos)'}>
            <input
              value={f.nfe_key}
              onChange={(e) => set({ nfe_key: e.target.value.replace(/\D/g, '') })}
              maxLength={44}
              className="input font-mono"
            />
          </Field>
          <Field label={'Protocolo de autorização'}>
            <input
              value={f.nfe_protocol}
              onChange={(e) => set({ nfe_protocol: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={'CNPJ do fornecedor'}>
              <input
                value={f.supplier_tax_id}
                onChange={(e) => set({ supplier_tax_id: maskCnpjInput(e.target.value) })}
                className="input"
              />
            </Field>
            <Field label={'CPF/CNPJ destinatário (se ≠ padrão)'}>
              <input
                value={f.recipient_tax_id}
                onChange={(e) => set({ recipient_tax_id: maskCpfCnpjInput(e.target.value) })}
                className="input"
              />
            </Field>
          </div>
          <DocumentItemsEditor rows={items} onChange={setItems} />
          <Field label={'Valor atribuído à peça (R$)'}>
            <input
              inputMode="decimal"
              value={f.item_allocated_value}
              onChange={(e) => set({ item_allocated_value: e.target.value })}
              className="input"
            />
          </Field>
          <SectionFileGallery
            section="nfe"
            label={'PDF da nota fiscal (DANFE) ou imagem'}
            isEdit={isEdit}
            existingFiles={(documentFiles ?? []).filter((f2) => f2.section === 'nfe')}
            onExistingMove={(i, delta) => handleMoveExisting('nfe', i, delta)}
            onPendingMove={(i, delta) => handleMovePending('nfe', i, delta)}
            pendingFiles={pendingFiles.nfe}
            uploadingFiles={uploadingOf('nfe')}
            onFilesSelected={(files) => handleFilesSelected(files, 'nfe')}
            onPendingCaption={(i, c) => handlePendingCaption('nfe', i, c)}
            onPendingRemove={(i) => handleRemovePendingFile('nfe', i)}
            onExistingCaption={handleExistingCaption}
            onExistingRemove={handleRemoveExistingFile}
          />
        </Section>
      )}

      {f.has_import && (
        <Section title={'Importação'} icon={<PackageIcon />}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={'Nº Invoice'}>
              <input value={f.invoice_number} onChange={(e) => set({ invoice_number: e.target.value })} className="input" />
            </Field>
            <Field label={'AWB / rastreio'}>
              <input value={f.awb} onChange={(e) => set({ awb: e.target.value })} className="input" />
            </Field>
          </div>
          <Field label={'País de origem'}>
            <CountrySelect value={f.purchase_country} onChange={(v) => set({ purchase_country: v })} />
          </Field>
          <Field label={'Conteúdo declarado'}>
            <input value={f.declared_contents} onChange={(e) => set({ declared_contents: e.target.value })} className="input" />
          </Field>
          <Field label={'Peso da remessa (kg)'}>
            <input inputMode="decimal" value={f.shipment_weight_kg} onChange={(e) => set({ shipment_weight_kg: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={'Data de envio'}>
              <input type="date" value={f.shipped_date} onChange={(e) => set({ shipped_date: e.target.value })} className="input" />
            </Field>
            <Field label={'Data de entrega'}>
              <input type="date" value={f.arrival_date} onChange={(e) => set({ arrival_date: e.target.value })} className="input" />
            </Field>
          </div>
          <Field label={'Transportadora'}>
            <TransportadoraSelect value={f.carrier} onChange={(v) => set({ carrier: v })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={'Declaração aduaneira — tipo'}>
              <OptionSelect
                value={f.customs_type}
                ariaLabel="Declaração aduaneira — tipo"
                options={[
                  { value: '', label: '—' },
                  ...(Object.keys(DECLARACAO_ADUANEIRA_LABELS) as CustomsDeclarationType[]).map((c) => ({ value: c, label: c })),
                ]}
                onChange={(v) => set({ customs_type: v as CustomsDeclarationType | '' })}
              />
            </Field>
            <Field label={'Número da declaração'}>
              <input
                value={f.customs_number}
                onChange={(e) => set({ customs_number: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={'Valor declarado (US$)'}>
              <input inputMode="decimal" value={f.goods_usd} onChange={(e) => set({ goods_usd: e.target.value })} className="input" />
            </Field>
            <Field label={'Frete (US$)'}>
              <input inputMode="decimal" value={f.freight_usd} onChange={(e) => set({ freight_usd: e.target.value })} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={'Câmbio (R$ por US$)'}>
              <input inputMode="decimal" value={f.exchange_rate} onChange={(e) => set({ exchange_rate: e.target.value })} className="input" />
            </Field>
            <Field label={'Impostos / Taxas pagos (R$)'}>
              <input inputMode="decimal" value={f.taxes_brl} onChange={(e) => set({ taxes_brl: e.target.value })} className="input" />
            </Field>
          </div>
          <Field label={'Custo total importação (R$)'}>
            <input inputMode="decimal" value={f.import_cost_brl} onChange={(e) => set({ import_cost_brl: e.target.value })} className="input" />
            <p className="mt-1 text-xs text-stone-500">
              {'Sugestão automática: (valor declarado + frete) × câmbio + impostos/taxas pagos. Editável.'}
            </p>
          </Field>
        </Section>
      )}

      {f.has_payment && (
        <Section title={'Comprovante de pagamento'} icon={SECTION_ICON.payment}>
          {payments.map((p, i) => (
            <div key={p.id} className="space-y-3 rounded-lg border border-stone-800 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-stone-400">{`Comprovante ${i + 1}`}</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!(await confirm('Remover este comprovante? Os arquivos da galeria de pagamento são mantidos.', { danger: true }))) return
                    setPayments((prev) => prev.filter((r) => r.id !== p.id))
                  }}
                  className="rounded p-1 text-stone-400 transition hover:bg-stone-800 hover:text-red-400"
                  title={'Remover comprovante'}
                  aria-label={'Remover comprovante'}
                >
                  <TrashIcon />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={'Data do pagamento'}>
                  <input type="date" value={p.payment_date} onChange={(e) => setPaymentRow(p.id, { payment_date: e.target.value })} className="input" />
                </Field>
                <Field label={'Método'}>
                  <input value={p.method} onChange={(e) => setPaymentRow(p.id, { method: e.target.value })} className="input" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={'Valor pago'}>
                  <input inputMode="decimal" value={p.amount} onChange={(e) => setPaymentRow(p.id, { amount: e.target.value })} className="input" />
                </Field>
                <Field label={'Moeda'}>
                  <OptionSelect
                    value={p.currency}
                    ariaLabel={'Moeda'}
                    options={PAYMENT_CURRENCIES.map((c) => ({ value: c, label: c }))}
                    onChange={(v) => setPaymentRow(p.id, { currency: v })}
                  />
                </Field>
              </div>
              <SectionFileGallery
                section="payment"
                label={'Fotos do comprovante de pagamento'}
                isEdit={isEdit}
                existingFiles={paymentFiles(p.id, i)}
                onExistingMove={(k, delta) => handlePaymentExistingMove(paymentFiles(p.id, i), k, delta)}
                onPendingMove={(k, delta) => handlePaymentPendingMove(p.id, k, delta)}
                pendingFiles={pendingPaymentFiles[p.id] ?? []}
                uploadingFiles={uploadingOf(`payment:${p.id}`)}
                onFilesSelected={(files) => handlePaymentFilesSelected(p.id, i, files)}
                onPendingCaption={(k, c) => handlePaymentPendingCaption(p.id, k, c)}
                onPendingRemove={(k) => handlePaymentPendingRemove(p.id, k)}
                onExistingCaption={handleExistingCaption}
                onExistingRemove={handleRemoveExistingFile}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPayments((prev) => [...prev, newPaymentRow()])}
            className="btn-secondary inline-flex items-center gap-1.5 text-sm"
          >
            <PlusIcon /> {'Adicionar comprovante'}
          </button>
          {paymentTotals.length > 0 && (
            <p className="text-sm text-stone-300">
              <span className="text-stone-400">{'Total dos comprovantes'}:</span>{' '}
              <span className="font-semibold text-amber-400">
                {paymentTotals.map((x) => formatMoney(x.total, x.currency)).join(' + ')}
              </span>
            </p>
          )}
        </Section>
      )}

      {f.has_shipping && (
        <Section title={'Comprovante de Envio'} icon={SECTION_ICON.shipping}>
          <Field label={'Transportadora'}>
            <TransportadoraSelect value={f.shipping_carrier} onChange={(v) => set({ shipping_carrier: v })} />
          </Field>
          <Field label={'Código de rastreio'}>
            <input value={f.shipping_tracking} onChange={(e) => set({ shipping_tracking: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={'Data de envio'}>
              <input type="date" value={f.shipping_sent_date} onChange={(e) => set({ shipping_sent_date: e.target.value })} className="input" />
            </Field>
            <Field label={'Data de entrega'}>
              <input type="date" value={f.shipping_delivered_date} onChange={(e) => set({ shipping_delivered_date: e.target.value })} className="input" />
            </Field>
          </div>
          <SectionFileGallery
            section="shipping"
            label={'Fotos do comprovante de envio'}
            isEdit={isEdit}
            existingFiles={(documentFiles ?? []).filter((f2) => f2.section === 'shipping')}
            onExistingMove={(i, delta) => handleMoveExisting('shipping', i, delta)}
            onPendingMove={(i, delta) => handleMovePending('shipping', i, delta)}
            pendingFiles={pendingFiles.shipping}
            uploadingFiles={uploadingOf('shipping')}
            onFilesSelected={(files) => handleFilesSelected(files, 'shipping')}
            onPendingCaption={(i, c) => handlePendingCaption('shipping', i, c)}
            onPendingRemove={(i) => handleRemovePendingFile('shipping', i)}
            onExistingCaption={handleExistingCaption}
            onExistingRemove={handleRemoveExistingFile}
          />
        </Section>
      )}

      <Section title={'Arquivos'} icon={<StackIcon />}>
        <FileDropField label={'Adicionar PDF ou imagem'} onFiles={(files) => handleFilesSelected(files, 'general')}>
          <input
            type="file"
            accept="application/pdf,image/*"
            multiple
            onChange={(e) => {
              handleFilesSelected(e.target.files, 'general')
              e.target.value = ''
            }}
            className="input"
          />
        </FileDropField>
        {isEdit && filesOf('general').length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filesOf('general').map((file, i, all) => (
              <ExistingFileCard
                key={file.id}
                file={file}
                move={{ index: i, count: all.length, onMove: (delta) => handleMoveExisting('general', i, delta) }}
                onCaptionChange={(caption) => handleExistingCaption(file, caption)}
                onRemove={() => handleRemoveExistingFile(file)}
              />
            ))}
          </div>
        )}
        {uploadingOf('general').length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {uploadingOf('general').map((file, i) => (
              <UploadingFileCard key={i} file={file} />
            ))}
          </div>
        )}
        {!isEdit && pendingFiles.general.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pendingFiles.general.map((pf, i) => (
              <PendingFileCard
                key={i}
                pending={pf}
                move={{ index: i, count: pendingFiles.general.length, onMove: (delta) => handleMovePending('general', i, delta) }}
                onCaptionChange={(caption) => handlePendingCaption('general', i, caption)}
                onRemove={() => handleRemovePendingFile('general', i)}
              />
            ))}
          </div>
        )}
        <Field label={'Observações dos arquivos'}>
          <textarea rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} className="input" />
        </Field>
      </Section>

      <Section title={`Produtos vinculados (${displayedProducts.length})`} icon={<PackageIcon />}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex overflow-hidden rounded-full bg-stone-800">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={`px-3 py-1 text-sm transition ${view === 'grid' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-700'}`}
              aria-label="Grade"
            >
              <GridViewIcon />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-3 py-1 text-sm transition ${view === 'list' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-700'}`}
              aria-label="Lista"
            >
              <ListViewIcon />
            </button>
          </div>
          {view === 'list' && (
            <button
              type="button"
              onClick={() => setHidePhotos((v) => !v)}
              title={hidePhotos ? 'Mostrar fotos na lista' : 'Ocultar fotos na lista (mais compacto)'}
              aria-label={hidePhotos ? 'Mostrar fotos na lista' : 'Ocultar fotos na lista (mais compacto)'}
              className={`rounded-full px-3 py-1 text-sm transition ${
                hidePhotos ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >
              Sem fotos
            </button>
          )}
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="btn-secondary inline-flex h-9 min-h-9 w-9 items-center justify-center px-0 py-0"
            title="Vincular produto"
            aria-label="Vincular produto"
          >
            <LinkIcon />
          </button>
        </div>

        {loadingLinked && isEdit && <p className="text-sm text-stone-500">Carregando…</p>}
        {displayedProducts.length === 0 && !loadingLinked && <p className="text-sm text-stone-500">Nenhum produto vinculado.</p>}

        {displayedProducts.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleProducts.map((p) => (
              <div key={p.id} className="group relative">
                <Link to={`/produtos/${p.id}`} className="block overflow-hidden rounded-xl bg-stone-800">
                  <ProductThumb url={coverUrls?.[p.id]} large />
                  <div className="p-2">
                    <p className="font-mono text-xs text-amber-500">{p.sku || '—'}</p>
                    <p className="line-clamp-2 text-sm text-stone-200">{p.name}</p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemoveProduct(p.id)}
                  title="Remover"
                  aria-label="Remover"
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white hover:bg-red-700"
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        {displayedProducts.length > 0 && view === 'list' && (
          <ul className="divide-y divide-stone-800">
            {visibleProducts.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-1.5">
                {!hidePhotos && <ProductThumb url={coverUrls?.[p.id]} />}
                <Link to={`/produtos/${p.id}`} className="font-mono text-xs text-amber-500">
                  {p.sku || '—'}
                </Link>
                <span className="flex-1 truncate text-sm text-stone-200">
                  {p.is_lot_summary && (
                    <span className="mr-1.5 inline-flex rounded bg-amber-600/90 px-1.5 py-1 text-xs leading-none font-semibold text-white">Lote</span>
                  )}
                  {p.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveProduct(p.id)}
                  title="Remover"
                  aria-label="Remover"
                  className="tap-icon h-8 w-8 min-h-0 min-w-0 text-stone-400 hover:text-red-400"
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        {displayedProducts.length > itemsLimit && (
          <button type="button" onClick={() => setItemsExpanded((v) => !v)} className="link text-sm">
            {itemsExpanded ? 'Mostrar menos' : `Mostrar todos (${displayedProducts.length})`}
          </button>
        )}
      </Section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Link to={isEdit ? `/documentos/${id}` : '/documentos'} className="btn-secondary flex-1 text-center">
          {'Cancelar'}
        </Link>
        <button type="submit" disabled={busy} className="btn-primary flex-1">
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {isEdit && (
        <Section title={'Zona de perigo'} icon={<TrashIcon />} collapsible={false}>
          <button type="button" onClick={handleDelete} disabled={busy} className="btn-danger">
            Excluir documento
          </button>
        </Section>
      )}

      {picking && (
        <PickProductsDialog
          excludeIds={displayedProducts.map((p) => p.id)}
          onCancel={() => setPicking(false)}
          onConfirm={handleAddProducts}
        />
      )}

      {newSupplierOpen && (
        <SupplierFormDialog supplier={null} onSave={handleCreateSupplier} onClose={() => setNewSupplierOpen(false)} />
      )}
    </form>
  )
}

/** Usa o valor digitado manualmente se houver; senão, calcula automaticamente. */
function computeTotal(f: FormState): number | null {
  if (f.import_cost_brl.trim() !== '') return num(f.import_cost_brl)
  return computeCustoTotalImportacao(num(f.goods_usd), num(f.freight_usd), num(f.exchange_rate), num(f.taxes_brl))
}

/**
 * Mini-galeria de fotos/PDF PRÓPRIA de uma seção (Pagamento, Envio interno) —
 * mesmo padrão da galeria geral (`ExistingFileCard`/`PendingFileCard`), só
 * filtrada por `document_files.section` (0158) em vez de mostrar tudo junto.
 */
function SectionFileGallery({
  label,
  existingFiles,
  pendingFiles,
  uploadingFiles = [],
  onFilesSelected,
  onPendingCaption,
  onPendingRemove,
  onExistingCaption,
  onExistingRemove,
  onExistingMove,
  onPendingMove,
}: {
  section: DocumentFileSection
  label: string
  isEdit: boolean
  existingFiles: DocumentFile[]
  pendingFiles: { file: File; caption: string }[]
  /** Arquivos sendo enviados agora (edição). */
  uploadingFiles?: File[]
  onFilesSelected: (files: FileList | null) => void
  onPendingCaption: (index: number, caption: string) => void
  onPendingRemove: (index: number) => void
  onExistingCaption: (file: DocumentFile, caption: string) => void
  onExistingRemove: (file: DocumentFile) => void
  onExistingMove: (index: number, delta: -1 | 1) => void
  onPendingMove: (index: number, delta: -1 | 1) => void
}) {
  return (
    <FileDropField label={label} onFiles={onFilesSelected}>
      <input
        type="file"
        accept="application/pdf,image/*"
        multiple
        onChange={(e) => {
          onFilesSelected(e.target.files)
          e.target.value = ''
        }}
        className="input"
      />
      {existingFiles.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {existingFiles.map((file, i) => (
            <ExistingFileCard
              key={file.id}
              file={file}
              move={{ index: i, count: existingFiles.length, onMove: (delta) => onExistingMove(i, delta) }}
              onCaptionChange={(caption) => onExistingCaption(file, caption)}
              onRemove={() => onExistingRemove(file)}
            />
          ))}
        </div>
      )}
      {uploadingFiles.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {uploadingFiles.map((file, i) => (
            <UploadingFileCard key={i} file={file} />
          ))}
        </div>
      )}
      {pendingFiles.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {pendingFiles.map((pf, i) => (
            <PendingFileCard
              key={i}
              pending={pf}
              move={{ index: i, count: pendingFiles.length, onMove: (delta) => onPendingMove(i, delta) }}
              onCaptionChange={(caption) => onPendingCaption(i, caption)}
              onRemove={() => onPendingRemove(i)}
            />
          ))}
        </div>
      )}
    </FileDropField>
  )
}


/**
 * `Field` que também aceita arquivos soltos (PDF ou imagem), com a mesma moldura
 * tracejada e aviso das mídias do item. Soltar entra pelo mesmo caminho do
 * seletor de arquivos.
 */
function FileDropField({ label, onFiles, children }: { label: string; onFiles: (files: FileList | null) => void; children: ReactNode }) {
  const { isDragging, dropProps } = useFileDrop({
    onFiles: (dropped) => {
      const dt = new DataTransfer()
      dropped.forEach((f) => dt.items.add(f))
      onFiles(dt.files)
    },
    accept: 'application/pdf,image/*',
  })
  return (
    <div {...dropProps} className={`relative rounded-xl ${isDragging ? 'outline-2 outline-offset-4 outline-dashed outline-amber-500' : ''}`}>
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-stone-950/70 text-sm font-semibold text-amber-400">
          {'Solte para adicionar PDF ou imagens'}
        </div>
      )}
      <Field label={label}>{children}</Field>
    </div>
  )
}

interface FileMove {
  index: number
  count: number
  onMove: (delta: -1 | 1) => void
}

/** Setas "antes/depois" sobre a miniatura do arquivo; somem quando há um só. */
function FileMoveButtons({ move }: { move: FileMove }) {
  if (move.count < 2) return null
  const cls =
    'flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-amber-600 disabled:opacity-30 disabled:hover:bg-black/70'
  const click = (delta: -1 | 1) => (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    // Os cartões de arquivo salvo abrem o visualizador ao clicar: não abrir ao reordenar.
    e.preventDefault()
    e.stopPropagation()
    move.onMove(delta)
  }
  return (
    <span className="absolute bottom-1 left-1 flex gap-1">
      <button
        type="button"
        disabled={move.index === 0}
        onClick={click(-1)}
        title={'Mover para antes'}
        aria-label={'Mover para antes'}
        className={cls}
      >
        <ChevronLeftIcon />
      </button>
      <button
        type="button"
        disabled={move.index === move.count - 1}
        onClick={click(1)}
        title={'Mover para depois'}
        aria-label={'Mover para depois'}
        className={cls}
      >
        <ChevronRightIcon />
      </button>
    </span>
  )
}

/** Arquivo já salvo (edição): legenda editável direto no campo, salva ao sair. */
function ExistingFileCard({
  file,
  move,
  onCaptionChange,
  onRemove,
}: {
  file: DocumentFile
  move: FileMove
  onCaptionChange: (caption: string) => void
  onRemove: () => void
}) {
  const { data: url } = useDocumentFileUrl(file.storage_path)
  const [caption, setCaption] = useState(file.caption ?? '')
  const [viewing, setViewing] = useState(false)
  const openViewer = () => {
    if (url) setViewing(true)
  }
  return (
    <div className="space-y-1">
      {viewing && (
        <FileViewer file={{ path: file.storage_path, bucket: 'documents', title: file.caption }} onClose={() => setViewing(false)} />
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={openViewer}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openViewer()
          }
        }}
        className="relative block aspect-square cursor-pointer overflow-hidden rounded-lg bg-stone-800"
      >
        {file.kind === 'image' && url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl opacity-60"><DocumentIcon /></div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white hover:bg-red-700"
        >
          <CloseIcon />
        </button>
        <FileMoveButtons move={move} />
      </div>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={() => onCaptionChange(caption)}
        placeholder={'Legenda'}
        className="input text-xs"
      />
    </div>
  )
}

/** Arquivo ainda não salvo (criação): sobe junto com o documento. */
function PendingFileCard({
  pending,
  move,
  onCaptionChange,
  onRemove,
}: {
  pending: { file: File; caption: string }
  move: FileMove
  onCaptionChange: (caption: string) => void
  onRemove: () => void
}) {
  const isImage = pending.file.type.startsWith('image/')
  const url = useMemo(() => (isImage ? URL.createObjectURL(pending.file) : null), [pending.file, isImage])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return (
    <div className="space-y-1">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-800">
        {isImage && url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl opacity-60"><DocumentIcon /></div>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white hover:bg-red-700"
        >
          <CloseIcon />
        </button>
        <FileMoveButtons move={move} />
      </div>
      <input
        value={pending.caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        placeholder={'Legenda'}
        className="input text-xs"
      />
    </div>
  )
}

/** Arquivo sendo enviado (edição): prévia com indicador, sem ações até terminar. */
function UploadingFileCard({ file }: { file: File }) {
  const isImage = file.type.startsWith('image/')
  const url = useMemo(() => (isImage ? URL.createObjectURL(file) : null), [file, isImage])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return (
    <div className="space-y-1" aria-busy="true">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-800">
        {isImage && url ? (
          <img src={url} alt="" className="h-full w-full object-cover opacity-60" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl opacity-40"><DocumentIcon /></div>
        )}
        <span
          className="pointer-events-none absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-stone-950/70 text-sm text-amber-400"
          title={'Enviando arquivo'}
          aria-label={'Enviando arquivo'}
        >
          <RefreshIcon className="animate-spin" />
        </span>
      </div>
      <p className="truncate text-xs text-stone-400">{file.name}</p>
    </div>
  )
}

function ProductThumb({ url, large = false }: { url?: string; large?: boolean }) {
  const size = large ? 'aspect-square w-full' : 'h-8 w-8'
  return url ? (
    <img src={url} alt="" className={`${size} rounded object-cover`} />
  ) : (
    <div className={`flex ${size} items-center justify-center rounded bg-stone-700 text-xl opacity-50`}>
      <PackageIcon />
    </div>
  )
}

/**
 * Seção recolhível (mesmo visual do formulário do espécime). Nasce aberta; o
 * conteúdo continua montado ao recolher, para não perder estado local (legendas,
 * arquivos ainda não salvos). `collapsible={false}` mantém a seção fixa.
 */
function Section({
  title,
  icon,
  children,
  collapsible = true,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  collapsible?: boolean
}) {
  const [open, setOpen] = useState(true)
  const heading = (
    <span className="flex items-center gap-1.5 text-stone-400">
      {icon}
      <h2 className="section-title">{title}</h2>
    </span>
  )
  if (!collapsible) {
    return (
      <section className="space-y-3 rounded-xl bg-stone-900 p-4">
        {heading}
        {children}
      </section>
    )
  }
  return (
    <section className="rounded-xl border border-stone-800 bg-stone-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        {heading}
        <ChevronDownIcon className={`shrink-0 text-stone-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      <div hidden={!open} className="space-y-3 border-t border-stone-800 p-4">
        {children}
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block w-full">
      <span className="mb-1 block text-xs text-stone-400">{label}</span>
      {children}
    </label>
  )
}

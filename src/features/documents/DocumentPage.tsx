import { useEffect, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  DOCUMENT_KIND_LABELS,
  ITEM_KIND_LABELS,
  type StoreDocument,
  type StoreDocumentFile,
  type StoreDocumentInput,
  type StoreDocumentKind,
  type StoreProduct,
  type StoreSupplier,
} from '../../types/db'
import {
  createDocument,
  deleteDocumentFile,
  fetchDocument,
  fetchDocumentFiles,
  fetchProductsForDocument,
  linkProductsToDocument,
  unlinkProductFromDocument,
  updateDocument,
  uploadDocumentFile,
} from './api'
import { fetchSuppliers, createSupplier, type StoreSupplierInput } from '../suppliers/api'
import { SupplierFormDialog } from '../suppliers/SupplierFormDialog'
import { PickProductsDialog } from './PickProductsDialog'
import { fetchSales, type SaleWithCustomer } from '../sales/api'
import { formatMoney } from '../../lib/format'
import { signedUrl } from '../../lib/storage'
import { useConfirm } from '../../components/DialogProvider'
import { useToast } from '../../components/ToastProvider'
import { SearchSelect } from '../../components/SearchSelect'
import { ArrowLeftIcon, PlusIcon, TrashIcon, UnlinkIcon } from '../../components/icons'

type Draft = Record<string, string>

const FIELDS = [
  'title',
  'doc_date',
  'supplier_id',
  'supplier_name',
  'number',
  'series',
  'access_key',
  'total_amount',
  'notes',
  'sale_id',
] as const

function toDraft(d: StoreDocument | null): Draft {
  const draft: Draft = {}
  for (const f of FIELDS) {
    const value = d ? (d as unknown as Record<string, unknown>)[f] : null
    draft[f] = value == null ? '' : String(value)
  }
  draft.kind = d?.kind ?? 'nota_fiscal'
  return draft
}

function toInput(d: Draft): StoreDocumentInput {
  const out: Record<string, unknown> = { kind: d.kind as StoreDocumentKind }
  for (const f of FIELDS) {
    const value = d[f].trim()
    out[f] = value === '' ? null : f === 'total_amount' ? Number(value) : value
  }
  out.title = d.title.trim() || 'Documento sem título'
  return out as StoreDocumentInput
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="text-sm text-stone-300">{label}</span>
      <input
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1"
      />
    </label>
  )
}

export function DocumentPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'novo'
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const saleId = searchParams.get('sale')

  const [draft, setDraft] = useState<Draft | null>(isNew ? toDraft(null) : null)
  const [files, setFiles] = useState<StoreDocumentFile[]>([])
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [suppliers, setSuppliers] = useState<StoreSupplier[]>([])
  const [sales, setSales] = useState<SaleWithCustomer[]>([])
  const [newSupplierOpen, setNewSupplierOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSuppliers().then(setSuppliers).catch(() => {})
    fetchSales().then(setSales).catch(() => {})
  }, [])

  // Chegando de "Vendas" (?sale=<id>) — pré-preenche o vínculo, o dono só
  // completa o resto (número, chave de acesso, arquivo).
  useEffect(() => {
    if (!isNew || !saleId) return
    setDraft((d) => (d ? { ...d, sale_id: saleId } : d))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, saleId])

  useEffect(() => {
    if (isNew || !id) return
    Promise.all([fetchDocument(id), fetchDocumentFiles(id), fetchProductsForDocument(id)])
      .then(([doc, docFiles, docProducts]) => {
        setDraft(toDraft(doc))
        setFiles(docFiles)
        setProducts(docProducts)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [id, isNew])

  if (error && !draft) return <p className="text-sm text-red-400">{error}</p>
  if (!draft) return <p className="text-sm text-stone-400">Carregando…</p>

  const set = (key: string) => (v: string) => setDraft({ ...draft, [key]: v })

  const pickSupplier = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId)
    setDraft({ ...draft, supplier_id: supplierId, supplier_name: supplier?.name ?? '' })
  }

  // Cadastro rápido durante a edição, mesmo padrão do cliente no PDV.
  const handleCreateSupplier = async (input: StoreSupplierInput) => {
    const created = await createSupplier(input)
    setSuppliers(await fetchSuppliers())
    pickSupplier(created.id)
    setNewSupplierOpen(false)
  }

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      if (isNew) {
        const created = await createDocument(toInput(draft))
        navigate(`/documentos/${created.id}`, { replace: true })
      } else if (id) {
        await updateDocument(id, toInput(draft))
      }
      toast.success('Documento salvo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!id || isNew) return
    const chosen = Array.from(e.target.files ?? [])
    if (chosen.length === 0) return
    setBusy(true)
    try {
      for (const file of chosen) await uploadDocumentFile(id, file)
      setFiles(await fetchDocumentFiles(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const handleOpenFile = async (file: StoreDocumentFile) => {
    const url = await signedUrl(file.storage_path)
    window.open(url, '_blank', 'noopener')
  }

  const handleDeleteFile = async (file: StoreDocumentFile) => {
    if (!(await confirm('Apagar este arquivo? Essa ação não pode ser desfeita.', { danger: true }))) return
    await deleteDocumentFile(file)
    if (id) setFiles(await fetchDocumentFiles(id))
  }

  const handleLink = async (ids: string[]) => {
    setPicking(false)
    if (!id || isNew) return
    await linkProductsToDocument(id, ids)
    setProducts(await fetchProductsForDocument(id))
  }

  const handleUnlink = async (productId: string) => {
    if (!id) return
    await unlinkProductFromDocument(id, productId)
    setProducts(await fetchProductsForDocument(id))
  }

  return (
    <div>
      <header className="mb-4 flex items-start justify-between">
        <div>
          <Link to="/documentos" className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200">
            <ArrowLeftIcon />
            Documentos
          </Link>
          <h1 className="text-xl font-bold text-stone-100">{isNew ? 'Novo documento' : draft.title || 'Documento'}</h1>
        </div>
        <button type="button" onClick={() => void handleSave()} disabled={busy} className="btn-primary">
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border border-stone-800 p-4">
          <h2 className="font-medium text-stone-200">Dados do documento</h2>

          <label className="block">
            <span className="text-sm text-stone-300">Tipo</span>
            <select value={draft.kind} onChange={(e) => set('kind')(e.target.value)} className="input mt-1">
              {Object.entries(DOCUMENT_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <Field label="Título" value={draft.title} onChange={set('title')} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" value={draft.doc_date} onChange={set('doc_date')} type="date" />
            <Field label="Valor total" value={draft.total_amount} onChange={set('total_amount')} type="number" />
          </div>
          <label className="block">
            <span className="flex items-center justify-between text-sm text-stone-300">
              Fornecedor
              <button
                type="button"
                onClick={() => setNewSupplierOpen(true)}
                className="text-xs text-amber-500 hover:underline"
              >
                + cadastrar
              </button>
            </span>
            <div className="mt-1">
              <SearchSelect
                items={suppliers.map((s) => ({ id: s.id, label: s.name }))}
                value={draft.supplier_id}
                onChange={pickSupplier}
                placeholder="Digite para buscar um fornecedor…"
                emptyText="Nenhum fornecedor encontrado."
              />
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número" value={draft.number} onChange={set('number')} />
            <Field label="Série" value={draft.series} onChange={set('series')} />
          </div>
          <label className="block">
            <span className="text-sm text-stone-300">Venda vinculada (nota fiscal de saída)</span>
            <div className="mt-1">
              <SearchSelect
                items={sales.map((s) => ({
                  id: s.id,
                  label: `${new Date(s.sale_date).toLocaleDateString('pt-BR')} · ${s.customer?.name ?? 'Sem cliente'}`,
                  sublabel: formatMoney(s.total),
                }))}
                value={draft.sale_id}
                onChange={set('sale_id')}
                placeholder="Digite para buscar uma venda…"
                emptyText="Nenhuma venda encontrada."
              />
            </div>
          </label>
          {draft.kind === 'nota_fiscal' && (
            <Field label="Chave de acesso" value={draft.access_key} onChange={set('access_key')} />
          )}
          <label className="block">
            <span className="text-sm text-stone-300">Notas</span>
            <textarea
              value={draft.notes}
              onChange={(e) => set('notes')(e.target.value)}
              className="input mt-1 min-h-20"
            />
          </label>
        </section>

        <div className="space-y-4">
          <section className="space-y-3 rounded-lg border border-stone-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-stone-200">Arquivos</h2>
              {!isNew && (
                <label className="btn-secondary cursor-pointer">
                  Adicionar
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    onChange={handleUpload}
                    disabled={busy}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {isNew && <p className="text-sm text-stone-400">Salve o documento para anexar arquivos.</p>}
            {!isNew && files.length === 0 && <p className="text-sm text-stone-400">Nenhum arquivo anexado.</p>}
            <ul className="divide-y divide-stone-800">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-2 py-2">
                  <button
                    type="button"
                    onClick={() => void handleOpenFile(f)}
                    className="min-w-0 flex-1 truncate text-left text-sm text-amber-500 hover:underline"
                  >
                    {f.file_name ?? f.storage_path.split('/').pop()}
                  </button>
                  <button
                    type="button"
                    aria-label="Apagar arquivo"
                    onClick={() => void handleDeleteFile(f)}
                    className="tap-icon hover:text-red-400"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 rounded-lg border border-stone-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-stone-200">Produtos vinculados</h2>
              {!isNew && (
                <button type="button" onClick={() => setPicking(true)} className="btn-secondary">
                  <PlusIcon className="mr-1" />
                  Vincular
                </button>
              )}
            </div>
            {isNew && <p className="text-sm text-stone-400">Salve o documento para vincular produtos.</p>}
            {!isNew && products.length === 0 && <p className="text-sm text-stone-400">Nenhum produto vinculado.</p>}
            <ul className="divide-y divide-stone-800">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2">
                  <Link to={`/produtos/${p.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-stone-100">{p.name}</span>
                    <span className="block truncate text-xs text-stone-500">{ITEM_KIND_LABELS[p.kind]}</span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Desvincular"
                    onClick={() => void handleUnlink(p.id)}
                    className="tap-icon"
                  >
                    <UnlinkIcon />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {picking && (
        <PickProductsDialog
          excludeIds={products.map((p) => p.id)}
          onCancel={() => setPicking(false)}
          onConfirm={(ids) => void handleLink(ids)}
        />
      )}

      {newSupplierOpen && (
        <SupplierFormDialog supplier={null} onSave={handleCreateSupplier} onClose={() => setNewSupplierOpen(false)} />
      )}
    </div>
  )
}

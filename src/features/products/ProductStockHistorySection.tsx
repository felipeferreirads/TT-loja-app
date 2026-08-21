import { useEffect, useState } from 'react'
import type { StoreDocument, StoreSupplier } from '../../types/db'
import { fetchStockHistory, createStockEntry, type StockHistoryEvent } from './stockHistory'
import { fetchSuppliers } from '../suppliers/api'
import { fetchDocuments } from '../documents/api'
import { SearchSelect } from '../../components/SearchSelect'
import { ClockIcon, CloseIcon, PlusIcon } from '../../components/icons'
import { Section } from './form/Field'

function formatDateBR(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR')
}

/**
 * Histórico de estoque do produto — a "sessão de origem" pedida: entradas
 * (compra, lançada à mão) e saídas (venda, já registrada automaticamente em
 * `store_sale_items`) num timeline só, mais recente primeiro. Ver
 * `stockHistory.ts` (funde as duas fontes).
 */
export function ProductStockHistorySection({ productId, onStockChanged }: { productId: string; onStockChanged: () => void }) {
  const [events, setEvents] = useState<StockHistoryEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = () =>
    fetchStockHistory(productId)
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  return (
    <Section title="Histórico de estoque" icon={<ClockIcon />}>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {events == null ? null : events.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhuma movimentação ainda.</p>
      ) : (
        <ul className="divide-y divide-stone-800 overflow-hidden rounded-lg border border-stone-800">
          {events.map((e) => (
            <li key={`${e.kind}-${e.id}`} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className={`shrink-0 font-mono ${e.kind === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                {e.kind === 'in' ? '+' : '−'}
                {e.quantity}
              </span>
              <span className="min-w-0 flex-1 truncate text-stone-200">{e.label}</span>
              {e.sublabel && <span className="shrink-0 text-xs text-stone-500">{e.sublabel}</span>}
              <span className="shrink-0 text-xs text-stone-500">{formatDateBR(e.date)}</span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={() => setDialogOpen(true)} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm">
        <PlusIcon className="h-4 w-4" />
        Registrar entrada
      </button>

      {dialogOpen && (
        <StockEntryDialog
          productId={productId}
          onClose={() => setDialogOpen(false)}
          onDone={() => {
            setDialogOpen(false)
            load()
            onStockChanged()
          }}
        />
      )}
    </Section>
  )
}

function StockEntryDialog({ productId, onClose, onDone }: { productId: string; onClose: () => void; onDone: () => void }) {
  const [suppliers, setSuppliers] = useState<StoreSupplier[]>([])
  const [documents, setDocuments] = useState<StoreDocument[]>([])
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSuppliers().then(setSuppliers).catch(() => {})
    fetchDocuments().then(setDocuments).catch(() => {})
  }, [])

  const qty = Math.trunc(Number(quantity) || 0)

  const run = async () => {
    if (qty <= 0) return
    setBusy(true)
    setError(null)
    try {
      await createStockEntry({
        product_id: productId,
        quantity: qty,
        unit_cost: unitCost.trim() ? Number(unitCost) : null,
        supplier_id: supplierId || null,
        document_id: documentId || null,
        entry_date: entryDate,
        notes: notes.trim() || null,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao registrar entrada.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-xl bg-stone-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-100">Registrar entrada</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="tap-icon">
            <CloseIcon />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-stone-400">Quantidade</span>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-stone-400">Custo unitário</span>
            <input type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="input" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-stone-400">Data</span>
          <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="input" />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-stone-400">Fornecedor (opcional)</span>
          <SearchSelect
            items={suppliers.map((s) => ({ id: s.id, label: s.name }))}
            value={supplierId}
            onChange={setSupplierId}
            placeholder="Digite para buscar um fornecedor…"
            emptyText="Nenhum fornecedor encontrado."
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-stone-400">Nota fiscal / documento (opcional)</span>
          <SearchSelect
            items={documents.map((d) => ({ id: d.id, label: d.title, sublabel: d.number ?? undefined }))}
            value={documentId}
            onChange={setDocumentId}
            placeholder="Digite para buscar um documento…"
            emptyText="Nenhum documento encontrado."
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-stone-400">Notas</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-16" />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="button" onClick={() => void run()} disabled={qty <= 0 || busy} className="btn-primary flex-1">
            {busy ? 'Registrando…' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { StoreProductProvenance, StoreSupplier } from '../../../types/db'
import { fetchSuppliers, createSupplier, type StoreSupplierInput } from '../../suppliers/api'
import { SupplierFormDialog } from '../../suppliers/SupplierFormDialog'
import { SearchSelect } from '../../../components/SearchSelect'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon, TruckIcon } from '../../../components/icons'
import { Field, Labeled, Section } from './Field'
import type { Draft } from './draft'

/** Uma linha de ex-dono no formulário (strings, como o resto do draft). */
export interface ProvenanceRowDraft {
  id?: string
  name: string
  /** AAAA, AAAA-MM ou AAAA-MM-DD — a precisão sai do formato. */
  date: string
  notes: string
}

export function provenanceToDraft(p: StoreProductProvenance): ProvenanceRowDraft {
  let date = ''
  if (p.acquired_on) {
    date = p.acquired_precision === 'year' ? p.acquired_on.slice(0, 4) : p.acquired_precision === 'month' ? p.acquired_on.slice(0, 7) : p.acquired_on
  }
  return { id: p.id, name: p.name, date, notes: p.notes ?? '' }
}

/** Draft → input do banco; devolve null para linha sem nome (descartada ao salvar). */
export function provenanceToInput(r: ProvenanceRowDraft) {
  const name = r.name.trim()
  if (!name) return null
  const d = r.date.trim()
  let acquired_on: string | null = null
  let acquired_precision: 'year' | 'month' | 'day' | null = null
  if (/^\d{4}$/.test(d)) [acquired_on, acquired_precision] = [`${d}-01-01`, 'year']
  else if (/^\d{4}-\d{2}$/.test(d)) [acquired_on, acquired_precision] = [`${d}-01`, 'month']
  else if (/^\d{4}-\d{2}-\d{2}$/.test(d)) [acquired_on, acquired_precision] = [d, 'day']
  return { id: r.id, name, acquired_on, acquired_precision, notes: r.notes.trim() || null }
}

/**
 * Aquisição e procedência (0036) — fornecedor, código do fornecedor, data de
 * aquisição e cadeia de ex-donos, como na área privada do item no catálogo
 * pessoal. A lista de ex-donos é gravada no "Salvar" do produto (ver ProductPage).
 */
export function AcquisitionSection({
  draft,
  set,
  provenance,
  onProvenanceChange,
}: {
  draft: Draft
  set: (key: string) => (v: string) => void
  provenance: ProvenanceRowDraft[]
  onProvenanceChange: (rows: ProvenanceRowDraft[]) => void
}) {
  const [suppliers, setSuppliers] = useState<StoreSupplier[]>([])
  const [newSupplierOpen, setNewSupplierOpen] = useState(false)

  useEffect(() => {
    fetchSuppliers().then(setSuppliers).catch(() => {})
  }, [])

  const handleCreateSupplier = async (input: StoreSupplierInput) => {
    const created = await createSupplier(input)
    setSuppliers(await fetchSuppliers())
    set('supplier_id')(created.id)
    setNewSupplierOpen(false)
  }

  const updateRow = (i: number, patch: Partial<ProvenanceRowDraft>) =>
    onProvenanceChange(provenance.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const move = (i: number, delta: number) => {
    const j = i + delta
    if (j < 0 || j >= provenance.length) return
    const next = [...provenance]
    ;[next[i], next[j]] = [next[j], next[i]]
    onProvenanceChange(next)
  }

  return (
    <Section title="Aquisição e procedência" icon={<TruckIcon />}>
      <label className="block">
        <span className="flex items-center justify-between text-sm text-stone-300">
          Fornecedor
          <button type="button" onClick={() => setNewSupplierOpen(true)} className="text-xs text-amber-500 hover:underline">
            Cadastrar fornecedor
          </button>
        </span>
        <div className="mt-1">
          <SearchSelect
            items={suppliers.map((s) => ({ id: s.id, label: s.name }))}
            value={draft.supplier_id}
            onChange={set('supplier_id')}
            placeholder="Digite para buscar um fornecedor"
            emptyText="Nenhum fornecedor encontrado."
          />
        </div>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Código do fornecedor" value={draft.supplier_code} onChange={set('supplier_code')} />
        <Field label="Data de aquisição" value={draft.acquisition_date} onChange={set('acquisition_date')} type="date" />
      </div>

      <Labeled label="Ex-donos (do mais antigo ao mais recente)">
        <div className="mt-1 space-y-2">
          {provenance.length === 0 && <p className="text-xs text-stone-500">Nenhum ex-dono registrado.</p>}
          {provenance.map((r, i) => (
            <div key={r.id ?? `new-${i}`} className="space-y-2 rounded-lg border border-stone-800 bg-stone-950/60 p-2.5">
              <div className="flex items-start gap-2">
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem]">
                  <input
                    value={r.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    placeholder="Nome do ex-dono ou da coleção"
                    aria-label="Nome do ex-dono"
                    className="input"
                  />
                  <input
                    value={r.date}
                    onChange={(e) => updateRow(i, { date: e.target.value })}
                    placeholder="AAAA ou AAAA-MM-DD"
                    aria-label="Data em que adquiriu"
                    title="Ano (AAAA), mês (AAAA-MM) ou dia (AAAA-MM-DD)"
                    className="input"
                  />
                </div>
                <div className="flex shrink-0 items-center">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para cima" className="tap-icon min-h-9 min-w-9 disabled:opacity-30">
                    <ChevronUpIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === provenance.length - 1}
                    aria-label="Mover para baixo"
                    className="tap-icon min-h-9 min-w-9 disabled:opacity-30"
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onProvenanceChange(provenance.filter((_, j) => j !== i))}
                    aria-label="Excluir ex-dono"
                    className="tap-icon min-h-9 min-w-9 hover:text-red-400"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <input
                value={r.notes}
                onChange={(e) => updateRow(i, { notes: e.target.value })}
                placeholder="Observação (opcional)"
                aria-label="Observação"
                className="input"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => onProvenanceChange([...provenance, { name: '', date: '', notes: '' }])}
            className="btn-secondary h-9 min-h-9 gap-1.5 py-0"
          >
            <PlusIcon className="h-4 w-4" />
            Adicionar ex-dono
          </button>
        </div>
      </Labeled>

      {newSupplierOpen && <SupplierFormDialog supplier={null} onSave={handleCreateSupplier} onClose={() => setNewSupplierOpen(false)} />}
    </Section>
  )
}

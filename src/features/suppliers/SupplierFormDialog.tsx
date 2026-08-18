import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { StoreSupplier } from '../../types/db'
import type { StoreSupplierInput } from './api'

interface Props {
  supplier: StoreSupplier | null
  onSave: (input: StoreSupplierInput) => Promise<void>
  onClose: () => void
}

export function SupplierFormDialog({ supplier, onSave, onClose }: Props) {
  const [name, setName] = useState(supplier?.name ?? '')
  const [contact, setContact] = useState(supplier?.contact ?? '')
  const [notes, setNotes] = useState(supplier?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        contact: contact.trim() || null,
        notes: notes.trim() || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl bg-stone-900 p-5"
      >
        <h2 className="text-lg font-bold text-stone-100">{supplier ? 'Editar fornecedor' : 'Novo fornecedor'}</h2>

        <label className="block">
          <span className="text-sm text-stone-300">Nome</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" />
        </label>

        <label className="block">
          <span className="text-sm text-stone-300">Contato</span>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Telefone, e-mail ou @"
            className="input mt-1"
          />
        </label>

        <label className="block">
          <span className="text-sm text-stone-300">Notas</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input mt-1 min-h-20" />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={busy} className="btn-primary flex-1">
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

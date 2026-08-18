import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { StoreCashEntryKind } from '../../types/db'
import type { StoreCashEntryInput } from './api'

interface Props {
  onSave: (input: StoreCashEntryInput) => Promise<void>
  onClose: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

export function CashEntryFormDialog({ onSave, onClose }: Props) {
  const [kind, setKind] = useState<StoreCashEntryKind>('in')
  const [entryDate, setEntryDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSave({
        kind,
        amount: Number(amount) || 0,
        entry_date: entryDate,
        description: description.trim() || null,
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
        className="w-full max-w-sm space-y-4 rounded-xl bg-stone-900 p-5"
      >
        <h2 className="text-lg font-bold text-stone-100">Novo lançamento</h2>

        <div className="flex overflow-hidden rounded-lg border border-stone-700">
          {(['in', 'out'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`flex-1 py-2 text-sm transition ${
                kind === k
                  ? k === 'in'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600 text-white'
                  : 'bg-stone-800 text-stone-200 hover:bg-stone-700'
              }`}
            >
              {k === 'in' ? 'Entrada' : 'Saída'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-stone-300">Data</span>
            <input
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Valor</span>
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input mt-1"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-stone-300">Descrição</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Aluguel, venda balcão, compra de embalagens…"
            className="input mt-1"
          />
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

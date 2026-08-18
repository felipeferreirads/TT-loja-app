import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { StoreRecurringExpense } from '../../types/db'
import type { StoreRecurringExpenseInput } from './api'

interface Props {
  expense: StoreRecurringExpense | null
  onSave: (input: StoreRecurringExpenseInput) => Promise<void>
  onClose: () => void
}

export function RecurringExpenseFormDialog({ expense, onSave, onClose }: Props) {
  const [description, setDescription] = useState(expense?.description ?? '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [dayOfMonth, setDayOfMonth] = useState(String(expense?.day_of_month ?? 1))
  const [active, setActive] = useState(expense?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSave({
        description: description.trim(),
        amount: Number(amount) || 0,
        day_of_month: Math.min(28, Math.max(1, Number(dayOfMonth) || 1)),
        active,
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
        <h2 className="text-lg font-bold text-stone-100">{expense ? 'Editar gasto recorrente' : 'Novo gasto recorrente'}</h2>

        <label className="block">
          <span className="text-sm text-stone-300">Descrição</span>
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Contabilidade, Plataforma de e-commerce…"
            className="input mt-1"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-stone-300">Valor mensal</span>
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
          <label className="block">
            <span className="text-sm text-stone-300">Dia do mês</span>
            <input
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="input mt-1"
            />
          </label>
        </div>

        {expense && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-amber-600" />
            <span className="text-sm text-stone-300">Ativo</span>
          </label>
        )}

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

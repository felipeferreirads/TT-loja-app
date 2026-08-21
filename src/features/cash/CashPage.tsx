import { useEffect, useMemo, useState } from 'react'
import type { StoreCashEntry, StoreRecurringExpense } from '../../types/db'
import {
  fetchCashEntries,
  createCashEntry,
  deleteCashEntry,
  fetchRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  fetchLaunchedRecurringIdsThisMonth,
  launchRecurringExpense,
  type StoreCashEntryInput,
  type StoreRecurringExpenseInput,
} from './api'
import { fetchSales, markSalePaid, type SaleWithCustomer } from '../sales/api'
import { PAYMENT_LABELS } from '../sales/SalesPage'
import { CashEntryFormDialog } from './CashEntryFormDialog'
import { RecurringExpenseFormDialog } from './RecurringExpenseFormDialog'
import { useConfirm } from '../../components/DialogProvider'
import { useToast } from '../../components/ToastProvider'
import { EmptyState } from '../../components/EmptyState'
import { SortableHeader } from '../../components/SortableHeader'
import { formatDate, formatMoney } from '../../lib/format'
import { PlusIcon, TrashIcon, PencilIcon, CashIcon } from '../../components/icons'

type EntrySortField = 'date' | 'amount'

const todayIso = () => new Date().toISOString().slice(0, 10)

export function CashPage() {
  const [entries, setEntries] = useState<StoreCashEntry[]>([])
  const [recurring, setRecurring] = useState<StoreRecurringExpense[]>([])
  const [launchedIds, setLaunchedIds] = useState<Set<string>>(new Set())
  const [receivable, setReceivable] = useState<SaleWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<StoreRecurringExpense | null | 'new'>(null)
  const [launching, setLaunching] = useState<string | null>(null)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [entrySort, setEntrySort] = useState<EntrySortField>('date')
  const [entrySortDir, setEntrySortDir] = useState<'asc' | 'desc'>('desc')
  const confirm = useConfirm()
  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([fetchCashEntries(), fetchRecurringExpenses(), fetchLaunchedRecurringIdsThisMonth(), fetchSales()])
      .then(([e, r, launched, sales]) => {
        setEntries(e)
        setRecurring(r)
        setLaunchedIds(launched)
        setReceivable(sales.filter((s) => !s.paid).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')))
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const toggleEntrySort = (field: EntrySortField) => {
    if (field === entrySort) setEntrySortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setEntrySort(field)
      setEntrySortDir('desc')
    }
  }

  const sortedEntries = useMemo(() => {
    const diff = (a: StoreCashEntry, b: StoreCashEntry) =>
      entrySort === 'date' ? a.entry_date.localeCompare(b.entry_date) : a.amount - b.amount
    return [...entries].sort((a, b) => (entrySortDir === 'asc' ? diff(a, b) : -diff(a, b)))
  }, [entries, entrySort, entrySortDir])

  const totals = useMemo(() => {
    const totalIn = entries.filter((e) => e.kind === 'in').reduce((sum, e) => sum + e.amount, 0)
    const totalOut = entries.filter((e) => e.kind === 'out').reduce((sum, e) => sum + e.amount, 0)
    return { totalIn, totalOut, balance: totalIn - totalOut }
  }, [entries])

  const handleSave = async (input: StoreCashEntryInput) => {
    await createCashEntry(input)
    setCreating(false)
    toast.success('Lançamento registrado.')
    load()
  }

  const handleDelete = async (entry: StoreCashEntry) => {
    if (!(await confirm('Apagar este lançamento? Essa ação não pode ser desfeita.', { danger: true }))) return
    await deleteCashEntry(entry.id)
    toast.success('Lançamento apagado.')
    load()
  }

  const handleSaveRecurring = async (input: StoreRecurringExpenseInput) => {
    if (editingRecurring && editingRecurring !== 'new') await updateRecurringExpense(editingRecurring.id, input)
    else await createRecurringExpense(input)
    setEditingRecurring(null)
    toast.success('Despesa recorrente salva.')
    load()
  }

  const handleDeleteRecurring = async (expense: StoreRecurringExpense) => {
    if (!(await confirm(`Apagar o gasto recorrente "${expense.description}"? Essa ação não pode ser desfeita.`, { danger: true })))
      return
    await deleteRecurringExpense(expense.id)
    toast.success('Despesa recorrente apagada.')
    load()
  }

  const handleLaunch = async (expense: StoreRecurringExpense) => {
    setLaunching(expense.id)
    try {
      await launchRecurringExpense(expense)
      toast.success(`"${expense.description}" lançado.`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLaunching(null)
    }
  }

  const handleMarkPaid = async (sale: SaleWithCustomer) => {
    setMarkingPaid(sale.id)
    try {
      await markSalePaid(sale.id)
      toast.success('Venda marcada como paga.')
      load()
    } finally {
      setMarkingPaid(null)
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-100">Fluxo de caixa</h1>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary inline-flex items-center gap-1.5">
          <PlusIcon className="h-4 w-4" />
          Novo lançamento
        </button>
      </header>

      {loading && <p className="text-sm text-stone-400">Carregando…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-stone-800 p-4">
              <p className="text-xs text-stone-400">Entradas</p>
              <p className="mt-1 text-xl font-bold text-emerald-500">{formatMoney(totals.totalIn)}</p>
            </div>
            <div className="rounded-lg border border-stone-800 p-4">
              <p className="text-xs text-stone-400">Saídas</p>
              <p className="mt-1 text-xl font-bold text-red-400">{formatMoney(totals.totalOut)}</p>
            </div>
            <div className="rounded-lg border border-stone-800 p-4">
              <p className="text-xs text-stone-400">Saldo</p>
              <p className={`mt-1 text-xl font-bold ${totals.balance >= 0 ? 'text-stone-100' : 'text-red-400'}`}>
                {formatMoney(totals.balance)}
              </p>
            </div>
          </div>

          <section className="mb-6 space-y-3 rounded-lg border border-stone-800 p-4">
            <h2 className="font-medium text-stone-200">Contas a receber</h2>
            {receivable.length === 0 ? (
              <EmptyState icon={CashIcon} title="Nada pendente" description="Vendas fiado aparecem aqui até serem marcadas como pagas." />
            ) : (
              <ul className="divide-y divide-stone-800 text-sm">
                {receivable.map((s) => {
                  const overdue = !!s.due_date && s.due_date < todayIso()
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-stone-200">{s.customer?.name ?? 'Sem cliente'}</p>
                        <p className={`text-xs ${overdue ? 'text-red-400' : 'text-stone-500'}`}>
                          Vence {formatDate(s.due_date)} {overdue && '· vencida'} · {PAYMENT_LABELS[s.payment_method]}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium text-stone-100">{formatMoney(s.total)}</span>
                      <button
                        type="button"
                        onClick={() => void handleMarkPaid(s)}
                        disabled={markingPaid === s.id}
                        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-amber-500 disabled:opacity-60"
                      >
                        {markingPaid === s.id ? 'Marcando…' : 'Marcar como pago'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="mb-6 space-y-3 rounded-lg border border-stone-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-stone-200">Gastos recorrentes</h2>
              <button
                type="button"
                onClick={() => setEditingRecurring('new')}
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1 text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Novo
              </button>
            </div>
            {recurring.length === 0 ? (
              <p className="text-sm text-stone-400">
                Nenhum gasto recorrente cadastrado — ex.: contabilidade, plataforma de e-commerce, aluguel.
              </p>
            ) : (
              <ul className="divide-y divide-stone-800 text-sm">
                {recurring.map((r) => {
                  const launched = launchedIds.has(r.id)
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className={`truncate ${r.active ? 'text-stone-200' : 'text-stone-500 line-through'}`}>{r.description}</p>
                        <p className="text-xs text-stone-500">
                          {formatMoney(r.amount)}/mês · dia {r.day_of_month}
                          {!r.active && ' · inativo'}
                        </p>
                      </div>
                      {r.active && (
                        <button
                          type="button"
                          onClick={() => void handleLaunch(r)}
                          disabled={launched || launching === r.id}
                          className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition ${
                            launched
                              ? 'cursor-default bg-stone-800 text-stone-500'
                              : 'bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-60'
                          }`}
                        >
                          {launched ? 'Já lançado' : launching === r.id ? 'Lançando…' : 'Lançar este mês'}
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Editar"
                        onClick={() => setEditingRecurring(r)}
                        className="tap-icon shrink-0"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        aria-label="Apagar"
                        onClick={() => void handleDeleteRecurring(r)}
                        className="tap-icon shrink-0 hover:text-red-400"
                      >
                        <TrashIcon />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {entries.length === 0 ? (
            <EmptyState icon={CashIcon} title="Nenhum lançamento registrado ainda" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-stone-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-900 text-stone-400">
                  <tr>
                    <SortableHeader label="Data" active={entrySort === 'date'} dir={entrySortDir} onClick={() => toggleEntrySort('date')} />
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <SortableHeader label="Valor" active={entrySort === 'amount'} dir={entrySortDir} onClick={() => toggleEntrySort('amount')} align="right" />
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {sortedEntries.map((e) => (
                    <tr key={e.id} className="even:bg-stone-900/40 hover:bg-stone-800/60">
                      <td className="px-3 py-2 text-stone-400">{formatDate(e.entry_date)}</td>
                      <td className="px-3 py-2 text-stone-100">
                        {e.description ?? '—'}
                        {e.recurring_expense_id && <span className="ml-1.5 text-xs text-stone-500">(recorrente)</span>}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${e.kind === 'in' ? 'text-emerald-500' : 'text-red-400'}`}>
                        {e.kind === 'in' ? '+ ' : '− '}
                        {formatMoney(e.amount)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          aria-label="Apagar"
                          onClick={() => void handleDelete(e)}
                          className="tap-icon hover:text-red-400"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {creating && <CashEntryFormDialog onSave={handleSave} onClose={() => setCreating(false)} />}

      {editingRecurring && (
        <RecurringExpenseFormDialog
          expense={editingRecurring === 'new' ? null : editingRecurring}
          onSave={handleSaveRecurring}
          onClose={() => setEditingRecurring(null)}
        />
      )}
    </div>
  )
}

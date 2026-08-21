import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StoreProduct, StoreRecurringExpense } from '../../types/db'
import { fetchProducts } from '../products/api'
import { fetchSales, type SaleWithCustomer } from '../sales/api'
import { fetchLaunchedRecurringIdsThisMonth, fetchRecurringExpenses, launchRecurringExpense } from '../cash/api'
import { PAYMENT_LABELS } from '../sales/SalesPage'
import { formatDate, formatMoney } from '../../lib/format'
import { EmptyState } from '../../components/EmptyState'
import { useToast } from '../../components/ToastProvider'
import { CashIcon, ChartIcon, ClockIcon, PackageIcon, WarningIcon } from '../../components/icons'

/** Tela inicial — resumo do dia a dia: faturamento recente, vendas
 *  recentes, o que precisa de atenção (estoque baixo, contas a receber
 *  vencendo, despesa recorrente não lançada). Reaproveita 100% dos fetches
 *  já existentes (`fetchSales`/`fetchProducts`/`fetchRecurringExpenses`) —
 *  mesmo padrão "carrega tudo e agrega em memória" do `StatsPage.tsx`, sem
 *  nenhuma query nova. */
export function DashboardPage() {
  const [sales, setSales] = useState<SaleWithCustomer[]>([])
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [recurring, setRecurring] = useState<StoreRecurringExpense[]>([])
  const [launchedIds, setLaunchedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState<string | null>(null)
  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([fetchSales(), fetchProducts(), fetchRecurringExpenses(), fetchLaunchedRecurringIdsThisMonth()])
      .then(([s, p, r, launched]) => {
        setSales(s)
        setProducts(p)
        setRecurring(r)
        setLaunchedIds(launched)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleLaunch = async (expense: StoreRecurringExpense) => {
    setLaunching(expense.id)
    try {
      await launchRecurringExpense(expense)
      toast.success(`"${expense.description}" lançado.`)
      load()
    } finally {
      setLaunching(null)
    }
  }

  const stats = useMemo(() => {
    const now = new Date()
    const todayKey = now.toISOString().slice(0, 10)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const salesToday = sales.filter((s) => s.sale_date.slice(0, 10) === todayKey)
    const revenueToday = salesToday.reduce((sum, s) => sum + s.total, 0)
    const revenue7d = sales.filter((s) => new Date(s.sale_date) >= weekAgo).reduce((sum, s) => sum + s.total, 0)

    const lowStock = products.filter((p) => p.min_stock != null && p.stock_quantity <= p.min_stock)

    const receivable = sales
      .filter((s) => !s.paid)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

    const dueRecurring = recurring.filter((r) => r.active && !launchedIds.has(r.id))

    return { revenueToday, revenue7d, salesTodayCount: salesToday.length, lowStock, receivable, dueRecurring }
  }, [sales, products, recurring, launchedIds])

  if (loading) return <p className="text-sm text-stone-400">Carregando…</p>

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-stone-100">Início</h1>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-stone-800 p-4">
          <p className="flex items-center gap-1.5 text-xs text-stone-400">
            <CashIcon className="h-3.5 w-3.5" /> Faturamento hoje
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-100">{formatMoney(stats.revenueToday)}</p>
        </div>
        <div className="rounded-lg border border-stone-800 p-4">
          <p className="flex items-center gap-1.5 text-xs text-stone-400">
            <ChartIcon className="h-3.5 w-3.5" /> Faturamento (últimos 7 dias)
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-100">{formatMoney(stats.revenue7d)}</p>
        </div>
        <div className="rounded-lg border border-stone-800 p-4">
          <p className="flex items-center gap-1.5 text-xs text-stone-400">
            <PackageIcon className="h-3.5 w-3.5" /> Vendas hoje
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-100">{stats.salesTodayCount}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border border-stone-800 p-4">
          <h2 className="font-medium text-stone-200">Vendas recentes</h2>
          {sales.length === 0 ? (
            <EmptyState icon={PackageIcon} title="Nenhuma venda ainda" />
          ) : (
            <ul className="divide-y divide-stone-800 text-sm">
              {sales.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-stone-200">{s.customer?.name ?? 'Sem cliente'}</p>
                    <p className="text-xs text-stone-500">
                      {formatDate(s.sale_date)} · {PAYMENT_LABELS[s.payment_method]}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-stone-100">{formatMoney(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/vendas" className="inline-block text-xs text-amber-500 hover:underline">
            Ver todas as vendas →
          </Link>
        </section>

        <section className="space-y-3 rounded-lg border border-stone-800 p-4">
          <h2 className="flex items-center gap-1.5 font-medium text-stone-200">
            <WarningIcon className="h-4 w-4 text-amber-500" /> Estoque baixo
          </h2>
          {stats.lowStock.length === 0 ? (
            <EmptyState icon={PackageIcon} title="Nenhum produto com estoque baixo" description="Só aparece aqui quem tem estoque mínimo configurado." />
          ) : (
            <ul className="divide-y divide-stone-800 text-sm">
              {stats.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <Link to={`/produtos/${p.id}`} className="min-w-0 flex-1 truncate text-stone-200 hover:underline">
                    {p.name}
                  </Link>
                  <span className="shrink-0 text-amber-500">
                    {p.stock_quantity} / {p.min_stock} un.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-stone-800 p-4">
          <h2 className="font-medium text-stone-200">A receber</h2>
          {stats.receivable.length === 0 ? (
            <EmptyState icon={CashIcon} title="Nada pendente" description="Vendas fiado aparecem aqui até serem marcadas como pagas." />
          ) : (
            <ul className="divide-y divide-stone-800 text-sm">
              {stats.receivable.map((s) => {
                const overdue = !!s.due_date && s.due_date < new Date().toISOString().slice(0, 10)
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-stone-200">{s.customer?.name ?? 'Sem cliente'}</p>
                      <p className={`text-xs ${overdue ? 'text-red-400' : 'text-stone-500'}`}>
                        Vence {formatDate(s.due_date)} {overdue && '· vencida'}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium text-stone-100">{formatMoney(s.total)}</span>
                  </li>
                )
              })}
            </ul>
          )}
          <Link to="/caixa" className="inline-block text-xs text-amber-500 hover:underline">
            Ver Contas a receber →
          </Link>
        </section>

        <section className="space-y-3 rounded-lg border border-stone-800 p-4">
          <h2 className="flex items-center gap-1.5 font-medium text-stone-200">
            <ClockIcon className="h-4 w-4" /> Despesas recorrentes pendentes
          </h2>
          {stats.dueRecurring.length === 0 ? (
            <EmptyState icon={ClockIcon} title="Nenhuma pendência" description="Despesas recorrentes ativas já lançadas neste mês, ou nenhuma cadastrada." />
          ) : (
            <ul className="divide-y divide-stone-800 text-sm">
              {stats.dueRecurring.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-stone-200">{r.description}</p>
                    <p className="text-xs text-stone-500">
                      {formatMoney(r.amount)}/mês · dia {r.day_of_month}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleLaunch(r)}
                    disabled={launching === r.id}
                    className="shrink-0 rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-amber-500 disabled:opacity-60"
                  >
                    {launching === r.id ? 'Lançando…' : 'Lançar este mês'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

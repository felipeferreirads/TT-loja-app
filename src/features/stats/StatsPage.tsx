import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ITEM_KIND_LABELS, type StoreItemKind } from '../../types/db'
import { fetchSaleItemStats, type SaleItemStat } from './api'
import { fetchSales } from '../sales/api'
import { fetchPricingSettings } from '../pricing/api'
import { netFromSaleTotal, type PricingParams } from '../../lib/pricing'
import type { StoreSale } from '../../types/db'
import { formatMoney } from '../../lib/format'
import { presetRange, previousRange, isWithinRange, customRange, STATS_PRESET_LABELS, type StatsPreset, type DateRange } from '../../lib/statsPeriod'
import { BarChart } from '../../components/BarChart'
import { SortableHeader } from '../../components/SortableHeader'
import { EmptyState } from '../../components/EmptyState'
import { CalculatorIcon, CashIcon, ChartIcon, PackageIcon } from '../../components/icons'

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1).replace('.', ',')}%`
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function StatTile({
  label,
  value,
  sub,
  icon,
  trend,
}: {
  label: string
  value: string
  sub?: string
  icon?: ReactNode
  trend?: number
}) {
  return (
    <div className="rounded-lg border border-stone-800 p-4">
      <p className="flex items-center gap-1.5 text-xs text-stone-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold text-stone-100">
        {value}
        {trend != null && Number.isFinite(trend) && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {formatPercent(Math.abs(trend))}
          </span>
        )}
      </p>
      {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
    </div>
  )
}

interface ComputedStats {
  totalRevenue: number
  salesCount: number
  avgTicket: number
  totalCost: number
  hasAnyCost: boolean
  totalMargin: number
  totalNetRevenue: number
  totalNetProfit: number
  topProducts: { name: string; quantity: number; revenue: number }[]
  kindRows: { kind: StoreItemKind; revenue: number; netRevenue: number; cost: number; hasCost: boolean; quantity: number; margin: number; netMargin: number }[]
  months: [string, { revenue: number; count: number }][]
  maxMonthRevenue: number
}

/** Agregação em memória — extraída do componente pra poder rodar duas vezes
 *  (período atual + período anterior, pra tendência ↑/↓ nos tiles) sem
 *  duplicar a lógica. */
function computeStats(sales: StoreSale[], items: SaleItemStat[], pricing: PricingParams | null): ComputedStats {
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)
  const salesCount = sales.length
  const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0

  const totalCost = items.reduce((sum, i) => sum + (i.cost_price ?? 0) * i.quantity, 0)
  const hasAnyCost = items.some((i) => i.cost_price != null)
  const totalMargin = totalRevenue - totalCost

  const netBySale = new Map<string, number>()
  let totalNetRevenue = 0
  if (pricing) {
    for (const s of sales) {
      const net = netFromSaleTotal(s.total, s.payment_method, pricing)
      netBySale.set(s.id, net)
      totalNetRevenue += net
    }
  }
  const totalNetProfit = totalNetRevenue - totalCost

  const byProduct = new Map<string, { name: string; quantity: number; revenue: number }>()
  for (const i of items) {
    if (!i.product_id) continue
    const entry = byProduct.get(i.product_id) ?? { name: i.product_name ?? '(produto removido)', quantity: 0, revenue: 0 }
    entry.quantity += i.quantity
    entry.revenue += i.quantity * i.unit_price
    byProduct.set(i.product_id, entry)
  }
  const topProducts = [...byProduct.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5)

  const byKind = new Map<
    StoreItemKind,
    { revenue: number; netRevenue: number; cost: number; hasCost: boolean; quantity: number }
  >()
  for (const i of items) {
    if (!i.product_kind) continue
    const entry = byKind.get(i.product_kind) ?? { revenue: 0, netRevenue: 0, cost: 0, hasCost: false, quantity: 0 }
    const itemRevenue = i.quantity * i.unit_price
    entry.revenue += itemRevenue
    entry.quantity += i.quantity
    const saleGross = sales.find((s) => s.id === i.sale_id)?.total
    const saleNet = netBySale.get(i.sale_id)
    if (saleGross && saleNet != null && saleGross > 0) entry.netRevenue += itemRevenue * (saleNet / saleGross)
    if (i.cost_price != null) {
      entry.cost += i.quantity * i.cost_price
      entry.hasCost = true
    }
    byKind.set(i.product_kind, entry)
  }
  const kindRows = [...byKind.entries()]
    .map(([kind, v]) => ({ kind, ...v, margin: v.revenue - v.cost, netMargin: v.netRevenue - v.cost }))
    .sort((a, b) => b.revenue - a.revenue)

  const byMonth = new Map<string, { revenue: number; count: number }>()
  for (const s of sales) {
    const key = s.sale_date.slice(0, 7)
    const entry = byMonth.get(key) ?? { revenue: 0, count: 0 }
    entry.revenue += s.total
    entry.count += 1
    byMonth.set(key, entry)
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12)
  const maxMonthRevenue = Math.max(1, ...months.map(([, v]) => v.revenue))

  return {
    totalRevenue,
    salesCount,
    avgTicket,
    totalCost,
    hasAnyCost,
    totalMargin,
    totalNetRevenue,
    totalNetProfit,
    topProducts,
    kindRows,
    months,
    maxMonthRevenue,
  }
}

function trendOf(current: number, previous: number | undefined): number | undefined {
  if (previous == null || previous === 0) return undefined
  return (current - previous) / previous
}

type KindSortField = 'revenue' | 'margin' | 'netMargin'

export function StatsPage() {
  const [sales, setSales] = useState<StoreSale[]>([])
  const [items, setItems] = useState<SaleItemStat[]>([])
  const [pricing, setPricing] = useState<PricingParams | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [preset, setPreset] = useState<StatsPreset>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [kindSort, setKindSort] = useState<KindSortField>('revenue')
  const [kindSortDir, setKindSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    Promise.all([fetchSales(), fetchSaleItemStats(), fetchPricingSettings()])
      .then(([s, i, p]) => {
        setSales(s)
        setItems(i)
        setPricing(p)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  const range: DateRange = useMemo(
    () => (preset === 'custom' ? customRange(customFrom, customTo) : presetRange(preset)),
    [preset, customFrom, customTo],
  )
  const prevRange = useMemo(() => previousRange(range), [range])

  const filteredSales = useMemo(() => sales.filter((s) => isWithinRange(s.sale_date, range)), [sales, range])
  const filteredItems = useMemo(() => items.filter((i) => isWithinRange(i.sale_date, range)), [items, range])
  const prevSales = useMemo(
    () => (prevRange ? sales.filter((s) => isWithinRange(s.sale_date, prevRange)) : []),
    [sales, prevRange],
  )
  const prevItems = useMemo(
    () => (prevRange ? items.filter((i) => isWithinRange(i.sale_date, prevRange)) : []),
    [items, prevRange],
  )

  const stats = useMemo(() => computeStats(filteredSales, filteredItems, pricing), [filteredSales, filteredItems, pricing])
  const prevStats = useMemo(
    () => (prevRange ? computeStats(prevSales, prevItems, pricing) : null),
    [prevSales, prevItems, pricing, prevRange],
  )

  const kindRowsSorted = useMemo(() => {
    const field = kindSort === 'revenue' ? 'revenue' : kindSort === 'margin' ? 'margin' : 'netMargin'
    return [...stats.kindRows].sort((a, b) => (kindSortDir === 'asc' ? a[field] - b[field] : b[field] - a[field]))
  }, [stats.kindRows, kindSort, kindSortDir])

  const toggleKindSort = (field: KindSortField) => {
    if (field === kindSort) setKindSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setKindSort(field)
      setKindSortDir('desc')
    }
  }

  if (loading) return <p className="text-sm text-stone-400">Carregando…</p>
  if (error) return <p className="text-sm text-red-400">{error}</p>

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold text-stone-100">Estatísticas</h1>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {(Object.keys(STATS_PRESET_LABELS) as StatsPreset[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              preset === p ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            {STATS_PRESET_LABELS[p]}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="input" />
            <span className="text-stone-500">até</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="input" />
          </div>
        )}
      </div>

      {sales.length === 0 ? (
        <EmptyState icon={ChartIcon} title="Nenhuma venda registrada ainda" />
      ) : filteredSales.length === 0 ? (
        <EmptyState icon={ChartIcon} title="Nenhuma venda no período selecionado" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Faturamento"
              value={formatMoney(stats.totalRevenue)}
              icon={<CashIcon className="h-3.5 w-3.5" />}
              trend={trendOf(stats.totalRevenue, prevStats?.totalRevenue)}
            />
            <StatTile
              label="Vendas realizadas"
              value={String(stats.salesCount)}
              icon={<PackageIcon className="h-3.5 w-3.5" />}
              trend={trendOf(stats.salesCount, prevStats?.salesCount)}
            />
            <StatTile
              label="Ticket médio"
              value={formatMoney(stats.avgTicket)}
              icon={<CalculatorIcon className="h-3.5 w-3.5" />}
              trend={trendOf(stats.avgTicket, prevStats?.avgTicket)}
            />
            <StatTile
              label="Margem bruta"
              value={stats.hasAnyCost ? formatMoney(stats.totalMargin) : '—'}
              sub={stats.hasAnyCost ? formatPercent(stats.totalRevenue > 0 ? stats.totalMargin / stats.totalRevenue : 0) : 'Sem custo cadastrado'}
              icon={<ChartIcon className="h-3.5 w-3.5" />}
              trend={stats.hasAnyCost && prevStats?.hasAnyCost ? trendOf(stats.totalMargin, prevStats?.totalMargin) : undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Receita líquida" value={formatMoney(stats.totalNetRevenue)} sub="Após taxa de cartão/Pix, imposto e nota fiscal" />
            <StatTile
              label="Lucro líquido"
              value={stats.hasAnyCost ? formatMoney(stats.totalNetProfit) : '—'}
              sub={
                stats.hasAnyCost
                  ? `${formatPercent(stats.totalRevenue > 0 ? stats.totalNetProfit / stats.totalRevenue : 0)} sobre o faturamento`
                  : 'Sem custo cadastrado'
              }
            />
          </div>
          <p className="-mt-3 text-xs text-stone-500">
            Lucro líquido usa os parâmetros de <Link to="/precificacao" className="text-amber-500 hover:underline">Precificação</Link> — cartão
            sempre assume a taxa de 1x (a venda não guarda se foi parcelada).
            {prevRange && ' Tendência comparada ao período imediatamente anterior, de mesma duração.'}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-3 rounded-lg border border-stone-800 p-4">
              <h2 className="font-medium text-stone-200">Produtos mais vendidos</h2>
              {stats.topProducts.length === 0 ? (
                <p className="text-sm text-stone-400">Sem dados no período.</p>
              ) : (
                <ul className="divide-y divide-stone-800 text-sm">
                  {stats.topProducts.map((p) => (
                    <li key={p.name} className="flex items-center justify-between py-1.5">
                      <span className="min-w-0 flex-1 truncate text-stone-200">{p.name}</span>
                      <span className="shrink-0 text-stone-400">
                        {p.quantity} un · {formatMoney(p.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-lg border border-stone-800 p-4">
              <h2 className="font-medium text-stone-200">Margem por categoria</h2>
              {kindRowsSorted.length === 0 ? (
                <p className="text-sm text-stone-400">Sem dados no período.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-stone-500">
                    <tr>
                      <th className="pb-1 font-medium">Tipo</th>
                      <SortableHeader label="Receita" active={kindSort === 'revenue'} dir={kindSortDir} onClick={() => toggleKindSort('revenue')} align="right" />
                      <SortableHeader label="Bruta" active={kindSort === 'margin'} dir={kindSortDir} onClick={() => toggleKindSort('margin')} align="right" />
                      <SortableHeader label="Líquida" active={kindSort === 'netMargin'} dir={kindSortDir} onClick={() => toggleKindSort('netMargin')} align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {kindRowsSorted.map((row) => (
                      <tr key={row.kind} className="even:bg-stone-900/40 hover:bg-stone-800/60">
                        <td className="py-1.5 text-stone-200">{ITEM_KIND_LABELS[row.kind]}</td>
                        <td className="py-1.5 text-right text-stone-300">{formatMoney(row.revenue)}</td>
                        <td className="py-1.5 text-right text-stone-300">{row.hasCost ? formatMoney(row.margin) : '—'}</td>
                        <td className="py-1.5 text-right text-stone-300">{row.hasCost ? formatMoney(row.netMargin) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          <section className="space-y-3 rounded-lg border border-stone-800 p-4">
            <h2 className="font-medium text-stone-200">Faturamento mês a mês</h2>
            {stats.months.length === 0 ? (
              <p className="text-sm text-stone-400">Sem dados no período.</p>
            ) : (
              <BarChart data={stats.months.map(([key, v]) => ({ label: monthLabel(key), value: v.revenue }))} formatValue={formatMoney} />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

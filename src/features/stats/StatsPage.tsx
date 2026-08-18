import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ITEM_KIND_LABELS, type StoreItemKind } from '../../types/db'
import { fetchSaleItemStats, type SaleItemStat } from './api'
import { fetchSales } from '../sales/api'
import { fetchPricingSettings } from '../pricing/api'
import { netFromSaleTotal, type PricingParams } from '../../lib/pricing'
import type { StoreSale } from '../../types/db'
import { formatMoney } from '../../lib/format'

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1).replace('.', ',')}%`
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-stone-800 p-4">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-stone-100">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
    </div>
  )
}

export function StatsPage() {
  const [sales, setSales] = useState<StoreSale[]>([])
  const [items, setItems] = useState<SaleItemStat[]>([])
  const [pricing, setPricing] = useState<PricingParams | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)
    const salesCount = sales.length
    const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0

    const totalCost = items.reduce((sum, i) => sum + (i.cost_price ?? 0) * i.quantity, 0)
    const hasAnyCost = items.some((i) => i.cost_price != null)
    const totalMargin = totalRevenue - totalCost

    // Receita líquida (já descontando taxa de cartão/Pix, imposto e nota
    // fiscal, conforme os parâmetros da Precificação) — por venda, porque a
    // taxa depende da forma de pagamento de CADA venda.
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

    // Produto mais vendido, por quantidade.
    const byProduct = new Map<string, { name: string; quantity: number; revenue: number }>()
    for (const i of items) {
      if (!i.product_id) continue
      const entry = byProduct.get(i.product_id) ?? { name: i.product_name ?? '(produto removido)', quantity: 0, revenue: 0 }
      entry.quantity += i.quantity
      entry.revenue += i.quantity * i.unit_price
      byProduct.set(i.product_id, entry)
    }
    const topProducts = [...byProduct.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5)

    // Margem por categoria (tipo do produto) — bruta (receita − custo) e
    // líquida (receita líquida rateada da venda − custo). O rateio usa o
    // fator líquido/bruto da venda inteira aplicado à fatia do item, porque
    // taxa/imposto incidem sobre o total da venda, não item a item.
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

    // Comparação mês a mês (últimos 12 meses com venda).
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
  }, [sales, items, pricing])

  if (loading) return <p className="text-sm text-stone-400">Carregando…</p>
  if (error) return <p className="text-sm text-red-400">{error}</p>

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-stone-100">Estatísticas</h1>
      </header>

      {sales.length === 0 ? (
        <p className="text-sm text-stone-400">Nenhuma venda registrada ainda.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Faturamento total" value={formatMoney(stats.totalRevenue)} />
            <StatTile label="Vendas realizadas" value={String(stats.salesCount)} />
            <StatTile label="Ticket médio" value={formatMoney(stats.avgTicket)} />
            <StatTile
              label="Margem bruta"
              value={stats.hasAnyCost ? formatMoney(stats.totalMargin) : '—'}
              sub={stats.hasAnyCost ? formatPercent(stats.totalRevenue > 0 ? stats.totalMargin / stats.totalRevenue : 0) : 'Sem custo cadastrado'}
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
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-3 rounded-lg border border-stone-800 p-4">
              <h2 className="font-medium text-stone-200">Produtos mais vendidos</h2>
              {stats.topProducts.length === 0 ? (
                <p className="text-sm text-stone-400">Sem dados ainda.</p>
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
              {stats.kindRows.length === 0 ? (
                <p className="text-sm text-stone-400">Sem dados ainda.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-stone-500">
                    <tr>
                      <th className="pb-1 font-medium">Tipo</th>
                      <th className="pb-1 text-right font-medium">Receita</th>
                      <th className="pb-1 text-right font-medium">Bruta</th>
                      <th className="pb-1 text-right font-medium">Líquida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {stats.kindRows.map((row) => (
                      <tr key={row.kind}>
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
              <p className="text-sm text-stone-400">Sem dados ainda.</p>
            ) : (
              <div className="space-y-2">
                {stats.months.map(([key, v]) => (
                  <div key={key} className="flex items-center gap-3 text-sm">
                    <span className="w-16 shrink-0 text-stone-400 capitalize">{monthLabel(key)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-800">
                      <div
                        className="h-full rounded-full bg-amber-600"
                        style={{ width: `${(v.revenue / stats.maxMonthRevenue) * 100}%` }}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right text-stone-300">{formatMoney(v.revenue)}</span>
                    <span className="w-16 shrink-0 text-right text-stone-500">{v.count} vendas</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

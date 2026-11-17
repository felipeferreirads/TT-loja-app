// Copiado do catálogo pessoal (`src/features/documents/totals.ts`). Só o valor
// do item muda: na loja é o custo do produto (`cost_price`, R$).
import type { StoreProduct } from '../../types/db'

/** Total de uma moeda. */
export interface CurrencyTotal {
  currency: string
  total: number
}

/** Moedas oferecidas nos comprovantes; a lista é só de escolha, o cálculo aceita qualquer código ISO. */
export const PAYMENT_CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'CNY', 'INR', 'ZAR', 'AUD', 'CAD', 'CHF', 'JPY'] as const

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Soma valores agrupando por moeda (sem conversão). Ignora valores nulos ou
 * não numéricos. Ordem do resultado: BRL, USD e depois as demais em ordem
 * alfabética. Cada total é arredondado a centavos para não acumular erro de
 * ponto flutuante.
 */
export function sumByCurrency(rows: Iterable<{ amount: number | null | undefined; currency: string }>): CurrencyTotal[] {
  const acc = new Map<string, number>()
  for (const r of rows) {
    if (r.amount == null || !Number.isFinite(r.amount)) continue
    const cur = (r.currency || 'BRL').toUpperCase()
    acc.set(cur, (acc.get(cur) ?? 0) + r.amount)
  }
  const rank = (c: string) => (c === 'BRL' ? 0 : c === 'USD' ? 1 : 2)
  return [...acc.entries()]
    .map(([currency, total]) => ({ currency, total: round2(total) }))
    .sort((a, b) => rank(a.currency) - rank(b.currency) || a.currency.localeCompare(b.currency))
}

/** Custo de aquisição de um produto (R$) — o equivalente na loja ao valor pago do item no catálogo. */
export function itemPriceEntry(
  product: Pick<StoreProduct, 'cost_price'> | null | undefined,
): { amount: number; currency: string } | null {
  if (!product || product.cost_price == null) return null
  return { amount: product.cost_price, currency: 'BRL' }
}

/** Soma o custo dos produtos por moeda; também informa quantos não têm custo. */
export function sumItemPrices(
  products: Iterable<Pick<StoreProduct, 'cost_price'> | null | undefined>,
): { totals: CurrencyTotal[]; withoutPrice: number } {
  const entries: { amount: number; currency: string }[] = []
  let withoutPrice = 0
  for (const p of products) {
    const e = itemPriceEntry(p)
    if (e) entries.push(e)
    else withoutPrice++
  }
  return { totals: sumByCurrency(entries), withoutPrice }
}

/** Partes do valor geral da compra (0201). */
export type DocumentAmounts = { goods_amount: number | null; freight_amount: number | null; fees_amount: number | null }

/** Valor total da compra = produtos + frete + impostos e taxas; nulo quando nenhuma parte foi informada. */
export function documentAmountsTotal(d: DocumentAmounts): number | null {
  const parts = [d.goods_amount, d.freight_amount, d.fees_amount].filter(
    (v): v is number => v != null && Number.isFinite(v),
  )
  return parts.length === 0 ? null : round2(parts.reduce((a, b) => a + b, 0))
}

/**
 * Diferença de um valor de conferência em relação à referência (valor da
 * compra), arredondada a centavos: negativo = abaixo, positivo = acima,
 * 0 = igual. Nulo quando falta um dos lados.
 */
export function amountDifference(reference: number | null, other: number | null | undefined): number | null {
  if (reference == null || other == null || !Number.isFinite(other)) return null
  return round2(other - reference)
}

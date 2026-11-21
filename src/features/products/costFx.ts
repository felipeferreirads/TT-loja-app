import { useQuery } from '@tanstack/react-query'
import { computeUsd, fetchPtaxRate, todayISO } from '../../lib/exchangeRate'
import type { StoreProduct } from '../../types/db'
import type { Draft } from './form/draft'

/**
 * Custo em US$ e câmbio do produto (0040) — mesmo comportamento do preço
 * líquido do catálogo pessoal (`SpecimenFormPage.tsx`):
 *  • automático (padrão): R$ é a fonte; US$ = R$ ÷ câmbio. Sem câmbio digitado,
 *    busca o PTAX da data de aquisição e grava o valor como cache.
 *  • manual: US$ é o que foi digitado, sem busca nem cálculo.
 *
 * "Custo corrigido" = maior entre o custo pago (R$) e o custo em US$ pelo
 * câmbio de hoje — calculado na hora, nunca gravado.
 */

const toNum = (s: string | undefined): number | null => {
  const t = (s ?? '').trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Valores de `cost_usd`/`cost_exchange_rate` a gravar, conforme o modo do câmbio. */
export async function resolveCostFx(d: Draft): Promise<{ cost_usd: number | null; cost_exchange_rate: number | null }> {
  let rate = toNum(d.cost_exchange_rate)
  if (d.cost_exchange_rate_manual === 'true') return { cost_usd: toNum(d.cost_usd), cost_exchange_rate: rate }

  const brl = toNum(d.cost_price)
  if (brl != null && rate == null && d.acquisition_date) {
    try {
      rate = await fetchPtaxRate(d.acquisition_date)
    } catch {
      // Falha de rede não bloqueia o salvamento — fica sem conversão automática desta vez.
      rate = null
    }
  }
  return { cost_usd: computeUsd(brl, rate), cost_exchange_rate: rate }
}

/** Câmbio de hoje (PTAX do último dia útil), em cache por 6 h. `null` enquanto carrega ou se a busca falhar. */
export function useTodayFxRate(): number | null {
  const { data } = useQuery({
    queryKey: ['fx-ptax-today', todayISO()],
    queryFn: () => fetchPtaxRate(todayISO()),
    staleTime: 6 * 60 * 60_000,
    retry: 1,
  })
  return data ?? null
}

/**
 * Custo corrigido pelo câmbio: maior entre o custo pago e o custo em US$ ao
 * câmbio de hoje. Sem US$ ou sem câmbio, é o próprio custo pago.
 */
export function correctedCost(
  p: Pick<StoreProduct, 'cost_price' | 'cost_usd'>,
  todayRate: number | null,
): number | null {
  const fromUsd = p.cost_usd != null && todayRate != null ? p.cost_usd * todayRate : null
  if (p.cost_price == null) return fromUsd
  return fromUsd == null ? p.cost_price : Math.max(p.cost_price, fromUsd)
}

/** Mesmo cálculo, a partir do rascunho do formulário (strings). */
export function correctedCostFromDraft(d: Draft, todayRate: number | null): number | null {
  return correctedCost({ cost_price: toNum(d.cost_price), cost_usd: toNum(d.cost_usd) }, todayRate)
}

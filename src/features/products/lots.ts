import type { StoreProduct } from '../../types/db'

/**
 * Núcleo PURO do sistema de lotes — copiado de
 * `src/features/specimens/lots.ts` do catálogo pessoal (mesmo mecanismo,
 * ver claude.md §2 deste repo). Ordenação das peças, resumo e geração de
 * sufixo; fora de React/Supabase de propósito, é a parte que erra em
 * silêncio (um sufixo fora de ordem, uma colisão) e que os testes travam.
 *
 * Adaptado pro tipo `StoreProduct`: onde o catálogo pessoal usa `is_sold`
 * (specimen tem um campo próprio pra isso), aqui o equivalente é
 * `stock_quantity <= 0` — a peça do lote é um produto completo com seu
 * próprio estoque (decisão de arquitetura: peça = produto, não sub-item).
 */

/** Sufixo comparável: numérico vem antes de alfabético, e "10" depois de "9". */
function suffixRank(raw: string | null): [number, number, string] {
  const s = (raw ?? '').trim()
  if (!s) return [2, 0, ''] // sem sufixo por último
  const n = Number(s.replace(',', '.'))
  if (Number.isFinite(n)) return [0, n, s.toLowerCase()]
  return [1, 0, s.toLowerCase()]
}

/**
 * Ordena as peças de um lote pelo sufixo: 1, 2, 10 (numérico natural), depois
 * a, b, c, e por fim as sem sufixo. Sem isso a lista sai na ordem que o banco
 * devolveu — que muda entre um refetch e outro.
 */
export function sortLotItems(items: StoreProduct[]): StoreProduct[] {
  return [...items].sort((a, b) => {
    const [ka, na, sa] = suffixRank(a.lot_suffix)
    const [kb, nb, sb] = suffixRank(b.lot_suffix)
    if (ka !== kb) return ka - kb
    if (ka === 0 && na !== nb) return na - nb
    return sa.localeCompare(sb, 'pt-BR')
  })
}

/**
 * Próximo sufixo livre: o MAIOR numérico já usado + 1 (contar as peças erraria
 * assim que alguma saísse do lote, gerando colisão com quem ficou).
 */
export function nextLotSuffix(items: Pick<StoreProduct, 'lot_suffix'>[]): number {
  const used = items.map((i) => Number((i.lot_suffix ?? '').trim())).filter((n) => Number.isFinite(n))
  return Math.max(0, ...used) + 1
}

export type LotSuffixMode = 'numeric' | 'letter'

const LOWER_A = 'a'.charCodeAt(0)

/** Índice 0-based → sufixo estilo coluna de planilha: 0→a, 25→z, 26→aa, 27→ab… */
function indexToLetters(index: number): string {
  let n = index
  let s = ''
  do {
    s = String.fromCharCode(LOWER_A + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

/** Sufixo alfabético puro (a-z) → índice 0-based (inverso de `indexToLetters`); `null` se não for só letras. */
function lettersToIndex(raw: string | null): number | null {
  const s = (raw ?? '').trim().toLowerCase()
  if (!s || !/^[a-z]+$/.test(s)) return null
  let n = 0
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - LOWER_A + 1)
  return n - 1
}

/**
 * Gera `count` sufixos livres e sequenciais para novas peças, no modo
 * escolhido — a partir do maior já usado NO MESMO MODO (sufixo numérico e
 * alfabético não colidem entre si; `sortLotItems` já ordena numérico antes de
 * alfabético, então os dois convivem no mesmo lote sem ambiguidade).
 */
export function generateLotSuffixes(
  items: Pick<StoreProduct, 'lot_suffix'>[],
  count: number,
  mode: LotSuffixMode = 'numeric',
): string[] {
  if (mode === 'letter') {
    const used = items.map((i) => lettersToIndex(i.lot_suffix)).filter((n): n is number => n != null)
    const first = Math.max(-1, ...used) + 1
    return Array.from({ length: count }, (_, i) => indexToLetters(first + i))
  }
  const first = nextLotSuffix(items)
  return Array.from({ length: count }, (_, i) => String(first + i))
}

/** `true` se o sufixo já está em uso por outra peça do mesmo lote (ignora caixa/espaços). */
export function isSuffixTaken(items: Pick<StoreProduct, 'id' | 'lot_suffix'>[], suffix: string, exceptId?: string): boolean {
  const wanted = suffix.trim().toLowerCase()
  if (!wanted) return false
  return items.some((i) => i.id !== exceptId && (i.lot_suffix ?? '').trim().toLowerCase() === wanted)
}

export interface LotSummary {
  count: number
  sold: number
  weightG: number | null
  /** Peças sem peso cadastrado — o total soma só o que existe, e isso é dito na UI. */
  withoutWeight: number
}

/** Resumo das peças para o cabeçalho da seção. */
export function summarizeLot(items: StoreProduct[]): LotSummary {
  let weight = 0
  let withWeight = 0
  let sold = 0
  for (const i of items) {
    if (i.stock_quantity <= 0) sold++
    if (i.weight_g != null) {
      weight += i.weight_g
      withWeight++
    }
  }
  return {
    count: items.length,
    sold,
    weightG: withWeight > 0 ? Math.round(weight * 1000) / 1000 : null,
    withoutWeight: items.length - withWeight,
  }
}

export type AllocationMode = 'equal' | 'weight' | 'manual'

/**
 * Rateio do custo de aquisição do lote entre as peças.
 *
 * Você compra o lote, não a peça — sem dividir o valor, a precificação de
 * cada peça fica sem custo de referência. Regras:
 * - centavos: o resultado é arredondado em 2 casas e a SOBRA (ou falta) da
 *   soma vai para a ÚLTIMA peça, para o total ratear exatamente o valor pago;
 * - `weight`: proporcional ao peso em gramas. Peça sem peso recebe 0 — e quem
 *   chama avisa, em vez de a função inventar um peso médio;
 * - peso total zero (ou nenhuma peça com peso) cai em divisão igual, senão o
 *   modo simplesmente não produziria nada.
 */
export function allocateLotValue(
  items: Pick<StoreProduct, 'id' | 'weight_g'>[],
  total: number,
  mode: Exclude<AllocationMode, 'manual'>,
): Map<string, number> {
  const result = new Map<string, number>()
  if (items.length === 0) return result

  const totalWeight = items.reduce((sum, i) => sum + (i.weight_g ?? 0), 0)
  const byWeight = mode === 'weight' && totalWeight > 0

  let allocated = 0
  items.forEach((item, index) => {
    const isLast = index === items.length - 1
    if (isLast) {
      // A última peça absorve o resíduo do arredondamento — sem isso a soma
      // das partes ficava alguns centavos longe do valor pago.
      result.set(item.id, Math.round((total - allocated) * 100) / 100)
      return
    }
    const share = byWeight ? (item.weight_g ?? 0) / totalWeight : 1 / items.length
    const value = Math.round(total * share * 100) / 100
    allocated = Math.round((allocated + value) * 100) / 100
    result.set(item.id, value)
  })
  return result
}

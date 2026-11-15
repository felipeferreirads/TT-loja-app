// Copiado do catálogo pessoal (src/features/specimens/gridFill.ts), sem alteração de lógica.
/**
 * Plano de preenchimento da alça (modo planilha) — decide, POR COLUNA, se
 * arrastar repete os valores da seleção (como era antes) ou continua uma
 * SEQUÊNCIA numérica, como no Google Planilhas/Excel.
 *
 * Regras (as mesmas do Sheets, com um ajuste pras colunas de código):
 * - 2+ células fonte com números em progressão aritmética (5, 10, 15…) →
 *   série, continuando com o mesmo passo.
 * - 1 célula fonte → o Sheets COPIA; aqui, nas colunas de código
 *   (`codigo`/`codigo_tipo`), a série de passo 1 é o comportamento útil e
 *   esperado (01, 02, 03…), e copiar seria sempre erro — o schema tem
 *   `unique (owner_id, code_global)`, então repetir um código nem grava.
 * - Qualquer célula fonte vazia ou não numérica → copia (repete ciclando).
 */

export type FillPlan =
  | { kind: 'copy' }
  | { kind: 'series'; step: number; first: number; last: number; decimals: number }

function parseNum(raw: string): number | null {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function decimalsOf(raw: string): number {
  const t = raw.trim().replace(',', '.')
  const dot = t.indexOf('.')
  return dot < 0 ? 0 : t.length - dot - 1
}

/**
 * @param srcTexts textos crus das células fonte, de cima pra baixo.
 * @param singleCellStepsByOne quando há só UMA fonte, tratar como série de
 *   passo 1 em vez de cópia (colunas de código).
 */
export function planFill(srcTexts: string[], singleCellStepsByOne: boolean): FillPlan {
  if (srcTexts.length === 0) return { kind: 'copy' }
  const nums: number[] = []
  for (const raw of srcTexts) {
    const n = parseNum(raw)
    if (n == null) return { kind: 'copy' }
    nums.push(n)
  }
  const decimals = Math.max(...srcTexts.map(decimalsOf))
  if (nums.length === 1) {
    if (!singleCellStepsByOne) return { kind: 'copy' }
    return { kind: 'series', step: 1, first: nums[0], last: nums[0], decimals: 0 }
  }
  const step = nums[1] - nums[0]
  if (step === 0) return { kind: 'copy' }
  // tolerância relativa: 0.1+0.2 e afins não podem quebrar a detecção.
  const tol = Math.max(Math.abs(step), 1) * 1e-9
  for (let i = 2; i < nums.length; i++) {
    if (Math.abs(nums[i] - nums[i - 1] - step) > tol) return { kind: 'copy' }
  }
  return { kind: 'series', step, first: nums[0], last: nums[nums.length - 1], decimals }
}

/**
 * Valor da célula alvo a `distance` linhas da borda da seleção (1 = vizinha).
 */
export function fillValueAt(plan: FillPlan, srcTexts: string[], distance: number, goingDown: boolean): string | null {
  if (plan.kind === 'copy') {
    const n = srcTexts.length
    const i = goingDown ? (distance - 1) % n : n - 1 - ((distance - 1) % n)
    return srcTexts[i] ?? null
  }
  const raw = goingDown ? plan.last + plan.step * distance : plan.first - plan.step * distance
  const value = Number(raw.toFixed(Math.min(plan.decimals, 10)))
  return String(value)
}

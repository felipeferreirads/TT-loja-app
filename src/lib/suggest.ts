/**
 * Casamento de sugestões para campos de texto livre — copiado do catálogo
 * pessoal (`src/lib/suggest.ts`), com a adição de `frequentValues`.
 */

import { stripAccents } from './format'

/** Normalização comum aos dois lados: sem acento, sem caixa, sem borda em branco. */
export const normalizeSuggestion = (s: string) => stripAccents(s.trim().toLowerCase())

/**
 * Valores distintos (sem diferenciar acento/caixa, mantendo a grafia da
 * primeira ocorrência), do mais frequente para o menos; empate em ordem
 * alfabética.
 */
export function frequentValues(values: (string | null | undefined)[]): string[] {
  const seen = new Map<string, { value: string; count: number }>()
  for (const raw of values) {
    const value = raw?.trim()
    if (!value) continue
    const key = normalizeSuggestion(value)
    const hit = seen.get(key)
    if (hit) hit.count++
    else seen.set(key, { value, count: 1 })
  }
  return [...seen.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'pt-BR')).map((x) => x.value)
}

/**
 * Filtra as sugestões pelo que foi digitado. Casa por SUBSTRING ignorando
 * acento e caixa, mas quem COMEÇA com o termo vem antes. Termo vazio devolve
 * lista vazia e um valor idêntico ao já digitado é omitido.
 */
export function filterSuggestions(all: string[], term: string, limit = 8): string[] {
  const q = normalizeSuggestion(term)
  if (!q) return []
  const starts: string[] = []
  const contains: string[] = []
  for (const value of all) {
    const n = normalizeSuggestion(value)
    if (n === q) continue
    if (n.startsWith(q)) starts.push(value)
    else if (n.includes(q)) contains.push(value)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

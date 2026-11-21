import { supabase } from './supabase'
import type { GeologicalTime, GeologicalTimeRank } from '../types/db'
import { ancestorChain, RANK_ORDER } from './geologicalTimeTree'

// Tempo Geológico (escala ICS) — lado da loja, PT fixo. As funções puras da
// árvore vêm de `geologicalTimeTree.ts` (compartilhado com o catálogo); aqui
// ficam a busca, o nome do nó, o rótulo do rank e o formato da idade, que no
// catálogo dependem do idioma (`features/specimens/geologicalTime.ts`).

export {
  ancestorChain,
  childrenOf,
  geoTimeRangeIds,
  geoTimeRangeNode,
  isSelectableGeoTime,
  RANK_COLUMN,
  RANK_ORDER,
} from './geologicalTimeTree'

export const RANK_LABEL: Record<GeologicalTimeRank, string> = {
  eon: 'Éon',
  era: 'Era',
  period: 'Período',
  epoch: 'Época',
  subepoch: 'Subépoca',
  age: 'Estágio / Andar',
}

export function geoTimeName(node: Pick<GeologicalTime, 'name_pt' | 'name_en'>): string {
  return node.name_pt || node.name_en
}

/** 1 h de cache: é dado de referência que muda de tempos em tempos (mesma regra do catálogo). */
export const GEO_TIME_STALE_TIME = 1000 * 60 * 60

export async function fetchGeologicalTime(): Promise<GeologicalTime[]> {
  const { data, error } = await supabase.from('geological_time').select('*').order('sort_order')
  if (error) throw new Error(`Não foi possível carregar o Tempo Geológico: ${error.message}`)
  return data as GeologicalTime[]
}

/** "393,3–387,7 Ma" a partir do intervalo do nó. */
export function formatAgeRange(node: Pick<GeologicalTime, 'age_start_ma' | 'age_end_ma'>): string {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
  if (node.age_start_ma == null && node.age_end_ma == null) return ''
  if (node.age_start_ma == null) return `até ${fmt(node.age_end_ma!)} Ma`
  if (node.age_end_ma == null) return `desde ${fmt(node.age_start_ma)} Ma`
  return `${fmt(node.age_start_ma)}–${fmt(node.age_end_ma)} Ma`
}

/** Remove o Período quando a Época seguinte já começa com o mesmo nome ("Ordoviciano" → "Ordoviciano Superior"). */
function dedupeRedundantPeriod(chain: GeologicalTime[]): GeologicalTime[] {
  const pairs: [GeologicalTimeRank, GeologicalTimeRank][] = [
    ['period', 'epoch'],
    ['epoch', 'subepoch'],
  ]
  return chain.filter((node, i) => {
    const pair = pairs.find(([parent]) => parent === node.rank)
    if (!pair) return true
    const next = chain[i + 1]
    if (!next || next.rank !== pair[1]) return true
    const parentName = geoTimeName(node).trim().toLowerCase()
    const childName = geoTimeName(next).trim().toLowerCase()
    return childName !== parentName && !childName.startsWith(`${parentName} `)
  })
}

/** Rótulo da faixa ("Cenozoico > Paleogeno > Paleoceno – Eoceno"), como no catálogo. */
export function geoTimeRangeLabel(all: GeologicalTime[], startId: string | null | undefined, endId: string | null | undefined): string {
  const startChain = dedupeRedundantPeriod(ancestorChain(all, startId ?? null))
  const startLabel = startChain.map((n) => geoTimeName(n)).join(' > ')
  if (!endId || endId === startId) return startLabel
  const endChain = dedupeRedundantPeriod(ancestorChain(all, endId))
  if (endChain.length === 0) return startLabel
  let common = 0
  while (common < endChain.length - 1 && common < startChain.length - 1 && startChain[common].id === endChain[common].id) common++
  const endLabel = endChain.slice(common).map((n) => geoTimeName(n)).join(' > ')
  return startLabel ? `${startLabel} – ${endLabel}` : endLabel
}

/** Ordem dos ranks (reexportada para o seletor). */
export const GEO_RANKS = RANK_ORDER

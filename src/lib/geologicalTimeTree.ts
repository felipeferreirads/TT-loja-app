// Árvore do Tempo Geológico (escala ICS, tabela `geological_time`) — funções
// PURAS, sem idioma e sem domínio. Arquivo COMPARTILHADO com a loja
// (scripts/shared-ui.mjs): editar aqui e rodar `npm run ui:sync`.
//
// Nome do nó, rótulo do rank e formato da idade dependem do idioma de cada app
// e ficam fora daqui (catálogo: features/specimens/geologicalTime.ts; loja:
// lib/geologicalTime.ts).

export type GeoTimeRank = 'eon' | 'era' | 'period' | 'epoch' | 'subepoch' | 'age'

/** Campos mínimos de um nó da escala (compatível com `GeologicalTime` dos dois apps). */
export interface GeoTimeNode {
  id: string
  parent_id: string | null
  rank: GeoTimeRank
  name_en: string
  age_start_ma: number | null
  age_end_ma: number | null
  sort_order: number
}

/**
 * Ordem canônica dos ranks, mais rasa pra mais fina. RANK_COLUMN é a posição
 * 1-based de cada rank (índice de coluna/nível no gráfico e no seletor).
 */
export const RANK_ORDER: GeoTimeRank[] = ['eon', 'era', 'period', 'epoch', 'subepoch', 'age']

export const RANK_COLUMN: Record<GeoTimeRank, number> = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i + 1]),
) as Record<GeoTimeRank, number>

/**
 * Nós que o seletor não oferece como classificação nova. Hoje só o Hadeano:
 * éon anterior ao registro geológico preservado. O corte é de ESCOLHA, não de
 * existência (o nó continua no gráfico e num item já classificado nele).
 */
const UNSELECTABLE_GEO_TIME_EN = new Set(['Hadean'])

export function isSelectableGeoTime(node: Pick<GeoTimeNode, 'name_en'>): boolean {
  return !UNSELECTABLE_GEO_TIME_EN.has(node.name_en)
}

/** Filhos diretos de um nó (ou as raízes — Éons — quando parentId é null). */
export function childrenOf<T extends GeoTimeNode>(all: T[], parentId: string | null): T[] {
  return all.filter((n) => n.parent_id === parentId)
}

/** Cadeia [éon, era, período, …] até o nó escolhido. */
export function ancestorChain<T extends GeoTimeNode>(all: T[], id: string | null): T[] {
  if (!id) return []
  const byId = new Map(all.map((n) => [n.id, n]))
  const chain: T[] = []
  let current = byId.get(id)
  while (current) {
    chain.unshift(current)
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return chain
}

/**
 * Faixa de tempo geológico: `startId` é o mais antigo, `endId` o mais recente.
 * Idade da faixa = início do nó inicial → fim do nó final. Null sem fim ou com id inexistente.
 */
export function geoTimeRangeNode(
  all: GeoTimeNode[],
  startId: string | null | undefined,
  endId: string | null | undefined,
): Pick<GeoTimeNode, 'age_start_ma' | 'age_end_ma'> | null {
  if (!startId || !endId) return null
  const start = all.find((n) => n.id === startId)
  const end = all.find((n) => n.id === endId)
  if (!start || !end) return null
  return { age_start_ma: start.age_start_ma, age_end_ma: end.age_end_ma }
}

/**
 * Ids cobertos pela faixa: os dois nós e seus ancestrais, MAIS os nós
 * intermediários do mesmo rank dos extremos cujo intervalo cabe na faixa.
 * Sem `endId`, cobre só o nó inicial e seus ancestrais.
 */
export function geoTimeRangeIds(all: GeoTimeNode[], startId: string | null | undefined, endId: string | null | undefined): string[] {
  if (!startId) return []
  const ids = new Set(ancestorChain(all, startId).map((n) => n.id))
  const range = geoTimeRangeNode(all, startId, endId)
  if (!range || range.age_start_ma == null || range.age_end_ma == null) return [...ids]
  for (const n of ancestorChain(all, endId!)) ids.add(n.id)
  const start = all.find((n) => n.id === startId)!
  const end = all.find((n) => n.id === endId)!
  const ranks = new Set([start.rank, end.rank])
  for (const n of all) {
    if (!ranks.has(n.rank) || n.age_start_ma == null || n.age_end_ma == null) continue
    if (n.age_start_ma <= range.age_start_ma && n.age_end_ma >= range.age_end_ma) {
      for (const a of ancestorChain(all, n.id)) ids.add(a.id)
    }
  }
  return [...ids]
}

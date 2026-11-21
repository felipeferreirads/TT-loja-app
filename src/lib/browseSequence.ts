/**
 * Fila de navegação anterior/próximo (compartilhada entre o catálogo e a loja).
 *
 * Quem lista (grade, tabela, peças de um lote...) publica aqui a ordem EXATA que
 * está exibindo, sob uma chave; a ficha aberta a partir dela lê os vizinhos. A
 * chave viaja no estado do histórico (`{ browseSeq: <chave> }`), então link
 * direto, QR e busca chegam sem navegação, pois não há fila de origem.
 *
 * Só memória do módulo: a lista de ids muda a cada tecla da busca e gravar em
 * disco não compensa. Recarregar perde a fila; quem quiser refazê-la assina
 * `subscribeBrowseSequences` e publica de novo.
 *
 * `returnTarget` (só da grade): ao trocar de item pela ficha, guarda o último
 * visto; ao voltar, a grade rola até ele.
 */

export const GRID_SEQ = 'grid'
export const BROWSE_NAV_STATE = { browseSeq: GRID_SEQ } as const

interface Sequence {
  ids: string[]
  indexById: Map<string, number>
}

const sequences = new Map<string, Sequence>()
let returnTarget: string | null = null
let version = 0
const listeners = new Set<() => void>()

export function publishBrowseSequence(key: string, ids: string[]): void {
  sequences.set(key, { ids, indexById: new Map(ids.map((id, i) => [id, i])) })
  version++
  listeners.forEach((l) => l())
}

export function hasBrowseSequence(key: string): boolean {
  return sequences.has(key)
}

/** Pra `useSyncExternalStore`: muda a cada publicação. */
export function subscribeBrowseSequences(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function getBrowseSequencesVersion(): number {
  return version
}

/** Chave da sequência carregada no estado do histórico (`true` antigo = grade). */
export function getBrowseSeqKey(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null
  const v = (state as { browseSeq?: unknown }).browseSeq
  if (v === true) return GRID_SEQ
  return typeof v === 'string' && v ? v : null
}

export function hasBrowseNavState(state: unknown): boolean {
  return getBrowseSeqKey(state) != null
}

export interface BrowseNeighbors {
  prev: string | null
  next: string | null
  /** Posição 1-based. */
  position: number
  total: number
}

export function getBrowseNeighbors(key: string, id: string): BrowseNeighbors | null {
  const seq = sequences.get(key)
  const i = seq?.indexById.get(id)
  if (!seq || i == null || seq.ids.length < 2) return null
  return {
    prev: i > 0 ? seq.ids[i - 1] : null,
    next: i < seq.ids.length - 1 ? seq.ids[i + 1] : null,
    position: i + 1,
    total: seq.ids.length,
  }
}

/**
 * Itens vizinhos a pré-carregar, na ordem de prioridade: o próximo, o anterior,
 * depois os demais à frente e por último os demais atrás.
 */
export function getBrowseWindow(key: string, id: string, ahead: number, behind: number): string[] {
  const seq = sequences.get(key)
  const i = seq?.indexById.get(id)
  if (!seq || i == null) return []
  const order: number[] = []
  if (ahead >= 1) order.push(1)
  if (behind >= 1) order.push(-1)
  for (let k = 2; k <= ahead; k++) order.push(k)
  for (let k = 2; k <= behind; k++) order.push(-k)
  const out: string[] = []
  for (const off of order) {
    const target = seq.ids[i + off]
    if (target) out.push(target)
  }
  return out
}

export function setBrowseReturnTarget(id: string): void {
  returnTarget = id
}

/** Lê e limpa — a grade só rola até o item uma vez, ao voltar. */
export function consumeBrowseReturnTarget(): string | null {
  const id = returnTarget
  returnTarget = null
  return id
}

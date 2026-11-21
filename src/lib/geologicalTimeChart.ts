// Layout e cores do gráfico da Escala de Tempo Geológica (ICS) — funções
// PURAS, sem idioma e sem domínio. Arquivo COMPARTILHADO com a loja
// (scripts/shared-ui.mjs): editar aqui e rodar `npm run ui:sync`. Quem conta os
// itens por nó (fóssil × produto) é cada app; aqui só a geometria.

import { childrenOf, RANK_COLUMN, type GeoTimeNode, type GeoTimeRank } from './geologicalTimeTree'

/**
 * Filhos ordenados do mais novo (topo) pro mais antigo (embaixo), por
 * `age_start_ma`. NÃO usa `sort_order`: o valor gravado veio do import na ordem
 * "mais antigo primeiro" dentro de Período/Época.
 */
export function sortedChildren<T extends GeoTimeNode>(all: T[], parentId: string): T[] {
  return childrenOf(all, parentId)
    .slice()
    .sort((a, b) => (a.age_start_ma ?? a.age_end_ma ?? 0) - (b.age_start_ma ?? b.age_end_ma ?? 0))
}

/** Largura média de um caractere, em fração do `font-size` (estimativa generosa, ver catálogo). */
const CHAR_WIDTH_EM = 0.58

/** Largura aproximada de `text` renderizado deitado, em px. */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * CHAR_WIDTH_EM
}

/** O texto de uma célula precisa ser escrito de lado por não caber deitado? (layout horizontal) */
export function needsRotation(text: string, availableWidth: number, fontSize: number, padding: number): boolean {
  return estimateTextWidth(text, fontSize) > availableWidth - padding
}

export interface TimeRowRange {
  start: number
  end: number // exclusivo
}

/** Filhos de um nó que ainda cabem no rank mais fino visível (`maxColumn`). */
export function visibleChildren<T extends GeoTimeNode>(node: T, all: T[], maxColumn: number): T[] {
  if (RANK_COLUMN[node.rank] >= maxColumn) return []
  return sortedChildren(all, node.id).filter((k) => RANK_COLUMN[k.rank] <= maxColumn)
}

/**
 * Posição vertical (em "linhas-folha") de cada nó, via DFS. Uma folha ocupa 1
 * linha; um nó com filhos visíveis ocupa a união contígua das linhas dos filhos.
 */
export function assignTimeRows(all: GeoTimeNode[], maxColumn = RANK_COLUMN.age): { ranges: Map<string, TimeRowRange>; totalRows: number } {
  const ranges = new Map<string, TimeRowRange>()
  let cursor = 0

  function visit(node: GeoTimeNode) {
    const kids = visibleChildren(node, all, maxColumn)
    if (kids.length === 0) {
      ranges.set(node.id, { start: cursor, end: cursor + 1 })
      cursor += 1
      return
    }
    const start = cursor
    for (const k of kids) visit(k)
    ranges.set(node.id, { start, end: cursor })
  }

  const roots = all
    .filter((n) => n.parent_id === null)
    .sort((a, b) => (a.age_start_ma ?? a.age_end_ma ?? 0) - (b.age_start_ma ?? b.age_end_ma ?? 0))
  for (const r of roots) visit(r)

  return { ranges, totalRows: cursor }
}

/** Folha no layout: sem filho visível no rank mais fino exibido (`maxColumn`). */
export function isLeaf(node: GeoTimeNode, all: GeoTimeNode[], maxColumn = RANK_COLUMN.age): boolean {
  return visibleChildren(node, all, maxColumn).length === 0
}

// Paleta aproximada do ICS Chronostratigraphic Chart, priorizando legibilidade.
// Tons base por Era (Fanerozoico) ou por Éon (Pré-cambriano).
const ERA_BASE_HSL: Record<string, [number, number, number]> = {
  Cenozoic: [340, 55, 78],
  Mesozoic: [140, 40, 60],
  Paleozoic: [70, 45, 60],
}
const EON_BASE_HSL: Record<string, [number, number, number]> = {
  Phanerozoic: [210, 12, 72],
  Proterozoic: [28, 65, 68],
  Archean: [18, 60, 60],
  Hadean: [6, 55, 55],
}

function hsl([h, s, l]: [number, number, number]): string {
  return `hsl(${h}, ${s}%, ${Math.round(l)}%)`
}

function ancestorOfRank(node: GeoTimeNode, byId: Map<string, GeoTimeNode>, rank: GeoTimeRank): GeoTimeNode | null {
  let current: GeoTimeNode | undefined = node
  while (current) {
    if (current.rank === rank) return current
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return null
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Cor de fundo do bloco de um nó: tom base pela "família de cor" (Era no
 * Fanerozoico, Éon no Pré-cambriano) + variação de luminosidade por posição
 * entre os irmãos em cada nível abaixo da família.
 */
export function timeNodeColor(node: GeoTimeNode, all: GeoTimeNode[]): string {
  const byId = new Map(all.map((n) => [n.id, n]))
  const eon = ancestorOfRank(node, byId, 'eon')
  const era = ancestorOfRank(node, byId, 'era')

  let base: [number, number, number]
  let familyId: string
  if (era && ERA_BASE_HSL[era.name_en]) {
    base = ERA_BASE_HSL[era.name_en]
    familyId = era.id
  } else {
    base = eon ? (EON_BASE_HSL[eon.name_en] ?? [0, 0, 55]) : [0, 0, 55]
    familyId = eon?.id ?? node.id
  }

  const chain: GeoTimeNode[] = []
  let current: GeoTimeNode | undefined = node
  while (current && current.id !== familyId) {
    chain.unshift(current)
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }

  let lDelta = 0
  let step = 7
  for (const n of chain) {
    if (!n.parent_id) break
    const sibs = sortedChildren(all, n.parent_id)
    const idx = sibs.findIndex((s) => s.id === n.id)
    const mid = (sibs.length - 1) / 2
    lDelta += (idx - mid) * step
    step *= 0.55
  }

  return hsl([base[0], base[1], clamp(base[2] + lDelta, 22, 92)])
}

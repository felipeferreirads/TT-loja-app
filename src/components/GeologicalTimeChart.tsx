import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { RANK_COLUMN, RANK_ORDER, type GeoTimeNode, type GeoTimeRank } from '../lib/geologicalTimeTree'
import { estimateTextWidth, isLeaf, needsRotation, timeNodeColor, visibleChildren } from '../lib/geologicalTimeChart'

// Gráfico da Escala de Tempo Geológica (ICS). Arquivo COMPARTILHADO entre o
// catálogo e a loja (scripts/shared-ui.mjs): sem idioma e sem domínio — o nome
// do nó, os rótulos dos ranks e o formato da idade entram por props. Também
// usado pelo viewer público do Modo de Exibição (via TimeChart do catálogo).
//  - `countByNode` (contagem por nó) em vez da lista de itens inteira;
//  - clique parametrizável: `nodeLink` (rota, app logado) OU `onNodeClick`
//    (estado local, viewer público sem rota por nó).

/** true abaixo do breakpoint `sm` do Tailwind (640px) — mesmo limite usado pelas classes responsivas do gráfico. */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false))
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

export function GeologicalTimeChart<T extends GeoTimeNode>({
  all,
  ranges,
  totalRows,
  countByNode,
  maxColumn,
  horizontal,
  nodeLink,
  onNodeClick,
  nodeName,
  rankLabels: rankLabelMap,
  ageHeader,
  formatAge,
}: {
  all: T[]
  ranges: Map<string, { start: number; end: number }>
  totalRows: number
  /** Itens por nó (já somados aos ancestrais) — decide destaque e clicabilidade. */
  countByNode: Map<string, number>
  maxColumn: number
  horizontal: boolean
  /** Rota do nó em destaque (app logado). Ignorado quando `onNodeClick` é passado. */
  nodeLink?: (id: string) => string
  /** Clique no nó em destaque (viewer público, sem rota por nó). */
  onNodeClick?: (id: string) => void
  /** Nome do nó no idioma do app. */
  nodeName: (node: T) => string
  /** Rótulo de cada rank (Éon, Era, Período...). */
  rankLabels: Record<GeoTimeRank, string>
  /** Cabeçalho da faixa de idade, ex.: "Idade (Ma)". */
  ageHeader: string
  /** Idade do nó, ex.: "393,3–387,7 Ma". */
  formatAge: (node: T) => string
}) {
  const isMobile = useIsMobile()

  // Rótulos de coluna, na mesma ordem de RANK_ORDER — deriva de RANK_LABEL pra
  // não duplicar os nomes dos ranks num segundo lugar. Recalculado a cada
  // render (não é constante de módulo) pra acompanhar o idioma corrente.
  const colLabels = RANK_ORDER.map((r) => rankLabelMap[r])

  // Eixo de RANK: `maxColumn` faixas de rank + 1 faixa de "Idade (Ma)" no fim
  // (posição `ageAxisPos`). No layout vertical o rank é o eixo X (colunas) e o
  // tempo o eixo Y; no horizontal é o oposto — só trocamos row⇄column em `place`.
  const ageAxisPos = maxColumn + 1
  const rankLabels = [...colLabels.slice(0, maxColumn), ageHeader]

  // Dimensões (mobile ~20% menor). As fonts acompanham via `text-xs sm:text-sm`.
  const HEADER_H = isMobile ? 32 : 40 // vertical: altura da linha de header
  const HEADER_W = isMobile ? 84 : 102 // horizontal: largura da coluna de header ("Idade (Ma)" deitado, sem quebrar)
  const TIME_ROW_MIN = isMobile ? 21 : 26 // vertical: min altura de linha de tempo
  // horizontal: min largura de coluna de tempo. Estreita de propósito — o texto
  // que não couber deitado é escrito de lado (ver `rotated`), então a coluna só
  // precisa acomodar uma linha vertical + padding, e o gráfico inteiro cabe em
  // muito menos largura. As linhas de rank crescem sozinhas (`auto`) para o
  // texto de lado nunca ser cortado.
  const TIME_COL_MIN = isMobile ? 26 : 32
  const RANK_ROW_MIN = isMobile ? 30 : 40 // horizontal: min altura de linha de rank
  const AGE_ROW_H = isMobile ? 40 : 48 // horizontal: altura mínima da linha de Idade
  // vertical: Éon/Era ficam com largura fixa e estreita (igual à landing page)
  // — só cabe o texto de lado, sem sobrar espaço à toa como as demais colunas.
  const EON_COL_W = isMobile ? 30 : 38
  const ERA_COL_W = isMobile ? 36 : 45

  // Base da heurística de rotação: fonte real das células (`text-xs sm:text-sm`)
  // e padding horizontal real (`px-1 sm:px-1.5`, dos dois lados).
  const CELL_FONT = isMobile ? 12 : 14
  const CELL_PAD_X = isMobile ? 8 : 12
  /** Largura de uma célula que ocupa `span` colunas de tempo (+ o gap de 1px entre elas). */
  const timeSpanWidth = (span: number) => span * TIME_COL_MIN + (span - 1)
  const rotateIfNeeded = (text: string, span: number) =>
    horizontal && needsRotation(text, timeSpanWidth(span), CELL_FONT, CELL_PAD_X)

  // No layout vertical, Éon e Era ficam com texto de lado (igual à landing
  // page) sempre que a célula fica confinada à própria coluna (span de 1) —
  // é decisão fixa de estilo por rank, não a heurística de "não coube"
  // (`rotateIfNeeded`, só do horizontal). Blocos sem filho visível (folha
  // recolhida, ex. Mesoproterozoico sem Período) se espalham por várias
  // colunas e ficam de fora: nesses o texto deitado continua correto.
  const alwaysRotated = (rank: GeoTimeRank, span: number) =>
    !horizontal && span === 1 && (rank === 'eon' || rank === 'era')

  const wideRankCols = Math.max(maxColumn - 2, 0)

  // Larguras mínimas do layout vertical calculadas pelo texto real, não fixas:
  // a coluna de rank precisa caber a palavra mais longa (o resto quebra linha)
  // e a de Idade, a faixa de idade mais longa (não quebra). Com isso o gráfico
  // inteiro cabe sem rolagem lateral quando a tela permite (tablet) e só rola
  // quando nem a palavra mais longa cabe (celular). Fonte em negrito: +8%.
  const { rankColMin, ageColW } = useMemo(() => {
    const bold = (text: string) => estimateTextWidth(text, CELL_FONT) * 1.08
    let longestWord = 0
    for (const node of all) {
      if (!ranges.has(node.id) || RANK_COLUMN[node.rank] < 3 || RANK_COLUMN[node.rank] > maxColumn) continue
      for (const word of nodeName(node).split(/\s+/)) longestWord = Math.max(longestWord, bold(word))
    }
    for (const label of colLabels.slice(2, maxColumn)) longestWord = Math.max(longestWord, estimateTextWidth(label, CELL_FONT + 2) * 1.08)
    let longestAge = estimateTextWidth(ageHeader, CELL_FONT + 2) * 1.08
    for (const node of all) {
      if (isLeaf(node, all, maxColumn) && ranges.has(node.id)) longestAge = Math.max(longestAge, estimateTextWidth(formatAge(node), CELL_FONT))
    }
    return {
      rankColMin: Math.ceil(Math.max(isMobile ? 64 : 80, longestWord + CELL_PAD_X + 4)),
      ageColW: Math.ceil(Math.max(isMobile ? 96 : 112, longestAge + CELL_PAD_X + 8)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- colLabels é derivado de rankLabelMap
  }, [all, ranges, maxColumn, nodeName, formatAge, ageHeader, rankLabelMap, isMobile, CELL_FONT, CELL_PAD_X])

  const gridStyle: CSSProperties = horizontal
    ? {
        gridTemplateRows: `${`minmax(${RANK_ROW_MIN}px, auto) `.repeat(maxColumn)}minmax(${AGE_ROW_H}px, auto)`,
        gridTemplateColumns: `${HEADER_W}px repeat(${totalRows}, minmax(${TIME_COL_MIN}px, auto))`,
        minWidth: HEADER_W + totalRows * TIME_COL_MIN,
      }
    : {
        gridTemplateColumns: `${EON_COL_W}px ${ERA_COL_W}px ${`minmax(${rankColMin}px, 1fr) `.repeat(wideRankCols)}${ageColW}px`,
        gridTemplateRows: `${HEADER_H}px repeat(${totalRows}, minmax(${TIME_ROW_MIN}px, auto))`,
        minWidth: EON_COL_W + ERA_COL_W + wideRankCols * rankColMin + ageColW,
      }

  // Posiciona uma célula pelos intervalos de rank (r1..r2) e de tempo (t1..t2,
  // já com o offset de 1 faixa do header). Vertical: rank=coluna, tempo=linha;
  // horizontal: transposto.
  const place = (r1: number, r2: number, t1: number, t2: number): CSSProperties =>
    horizontal
      ? { gridRow: `${r1} / ${r2}`, gridColumn: `${t1} / ${t2}` }
      : { gridColumn: `${r1} / ${r2}`, gridRow: `${t1} / ${t2}` }

  const blocks = useMemo(() => {
    return all
      .map((node) => {
        const range = ranges.get(node.id)
        if (!range) return null
        const kids = visibleChildren(node, all, maxColumn)
        const leaf = kids.length === 0
        const colStart = RANK_COLUMN[node.rank]
        // Folha mais rasa que o rank mais fino visível se espalha até a última
        // faixa de rank (antes da Idade); nó-pai cujo filho real pula uma
        // coluna (ex. época sem Subépoca, cujo Andar é filho direto) se
        // espalha até a coluna do filho, preenchendo o vão; folha no rank mais
        // fino ocupa só a própria faixa.
        const colEnd = leaf ? (colStart < maxColumn ? maxColumn + 1 : colStart + 1) : RANK_COLUMN[kids[0].rank]
        return {
          node,
          t1: range.start + 2, // +1 (1-index) +1 (header)
          t2: range.end + 2,
          colStart,
          colEnd,
          color: timeNodeColor(node, all),
          count: countByNode.get(node.id) ?? 0,
          leaf,
        }
      })
      .filter((b): b is NonNullable<typeof b> => b !== null)
  }, [all, ranges, countByNode, maxColumn])

  // Coluna/linha de rótulos de rank: fica fora da rolagem (sticky) e por cima
  // dos blocos, que passam por baixo dela. `z-20` porque os blocos em destaque
  // são <Link> (mesmo contexto de empilhamento) e encostariam por cima.
  // `border-b` (horizontal) fecha explicitamente a borda entre rótulos de rank
  // empilhados: sem ela, a separação dependia só do gap-px do grid por baixo da
  // coluna sticky, que alguns navegadores renderizam como uma linha clara e
  // com aparência semitransparente por desalinhamento de subpixel com o scroll.
  const headerSticky = horizontal
    ? 'sticky left-0 z-20 border-r border-b border-stone-700'
    : 'sticky top-0 z-20'

  return (
    <div className="grid gap-px bg-stone-800 text-xs sm:text-sm" style={gridStyle}>
      {rankLabels.map((label, i) => (
        <div
          key={label}
          className={`${headerSticky} flex items-center justify-center bg-stone-900 px-1.5 text-center text-sm leading-tight font-bold text-stone-300 sm:px-2 sm:text-base ${
            horizontal ? 'whitespace-normal break-words' : 'whitespace-nowrap'
          }`}
          style={place(i + 1, i + 2, 1, 2)}
        >
          {label}
        </div>
      ))}

      {blocks.map((b) => {
        const highlighted = b.count > 0
        const name = nodeName(b.node)
        const rotated = alwaysRotated(b.node.rank, b.colEnd - b.colStart) || rotateIfNeeded(name, b.t2 - b.t1)
        // Célula com texto de lado (Éon/Era estreitos): a altura reservada pelas
        // linhas de tempo que ela cobre nem sempre acompanha o comprimento do
        // nome rotacionado — reforça um mínimo pra "Neoproterozoico" etc não
        // ficarem espremidos.
        const style: CSSProperties = {
          ...place(b.colStart, b.colEnd, b.t1, b.t2),
          backgroundColor: highlighted ? b.color : undefined,
          ...(rotated ? { minHeight: estimateTextWidth(name, CELL_FONT) + CELL_PAD_X } : {}),
        }
        const commonClasses = `flex items-center justify-center px-1 py-0.5 text-center font-bold leading-tight break-words sm:px-1.5 sm:py-1 ${
          highlighted ? 'text-stone-900' : 'border border-stone-600 bg-stone-950 text-stone-400'
        }`
        const label = <CellText text={name} rotated={rotated} />

        if (!highlighted) {
          return (
            <div key={b.node.id} style={style} className={commonClasses}>
              {label}
            </div>
          )
        }
        if (onNodeClick) {
          return (
            <button
              key={b.node.id}
              type="button"
              onClick={() => onNodeClick(b.node.id)}
              style={style}
              className={`${commonClasses} cursor-pointer hover:brightness-95`}
            >
              {label}
            </button>
          )
        }
        return (
          <Link
            key={b.node.id}
            to={nodeLink ? nodeLink(b.node.id) : '#'}
            style={style}
            className={`${commonClasses} cursor-pointer hover:brightness-95`}
          >
            {label}
          </Link>
        )
      })}

      {all
        .filter((n) => isLeaf(n, all, maxColumn) && ranges.has(n.id))
        .map((n) => {
          const range = ranges.get(n.id)!
          const age = formatAge(n)
          return (
            <div
              key={`age-${n.id}`}
              style={place(ageAxisPos, ageAxisPos + 1, range.start + 2, range.end + 2)}
              className={`flex items-center justify-center bg-stone-900 px-1 py-0.5 text-center text-stone-100 sm:px-1.5 sm:py-1 ${
                horizontal ? '' : 'whitespace-nowrap'
              }`}
            >
              <CellText text={age} rotated={rotateIfNeeded(age, range.end - range.start)} />
            </div>
          )
        })}
    </div>
  )
}

/**
 * Texto de uma célula do gráfico. `rotated` (só acontece no layout horizontal,
 * quando o nome não cabe deitado na largura da coluna) escreve de baixo para
 * cima com `writing-mode: vertical-rl` + `rotate-180`; como fica `nowrap`, a
 * altura intrínseca do span é o nome inteiro e a linha de rank (`minmax(_, auto)`)
 * cresce sozinha para caber — nunca corta.
 */
function CellText({ text, rotated }: { text: string; rotated: boolean }) {
  if (!rotated) return <>{text}</>
  return <span className="rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">{text}</span>
}

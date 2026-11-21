import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { countryName } from '../lib/format'
import { Flag } from './Flag'
import { CloseIcon, ExpandIcon } from './icons'
import { FullscreenOverlay } from './FullscreenOverlay'
import { useWorldTopo, buildWorldGeographies } from '../lib/worldTopo'
import { COUNTRY_CONTINENT, CONTINENT_COLORS, CONTINENT_NEUTRAL_COLOR, CONTINENT_LEGEND } from '../lib/geoContinents'
import type { ContinentMapLabels } from './ContinentMap'

// Arquivo COMPARTILHADO entre o catálogo e a loja (scripts/shared-ui.mjs):
// textos por `labels`, clique por `onCountryClick`.
//
// Versão MOBILE do mapa-múndi de Geografia (ContinentMap.tsx escolhe esta
// abaixo do breakpoint `md`), no estilo do Google Maps:
// - moldura alta (60vh); em zoom 1 o mundo INTEIRO cabe na altura (Antártida
//   incluída, de propósito — o dono não quis cortar), e na largura ele passa
//   da tela: arrasta-se pros lados.
// - arrasto horizontal SEM FIM: projeção equirretangular (bordas retas, ver
//   `cylindrical` em worldTopo.ts) repetida lado a lado; o centro `cx` é
//   normalizado módulo MAP_W.
// - um dedo SEMPRE move o mapa (opção escolhida pelo dono); a página rola
//   tocando fora da moldura.
// - pinça e toque duplo ampliam NO PONTO tocado (não no centro).
// - tocar num país SELECIONA (realce + cartão embaixo com "Abrir") — no
//   celular não há hover, e país pequeno é fácil de tocar errado. Tocar de
//   novo no país já selecionado abre a categoria dele (atalho do "Abrir").

const MAP_W = 800
const MAP_H = 400
const ZOOM_MAX = 10
const DOUBLE_TAP_MS = 300
const TAP_SLOP_PX = 8

interface Props {
  countryItemCounts: Map<string, number>
  onCountryClick: (code: string) => void
  labels: ContinentMapLabels
}

interface View {
  cx: number
  cy: number
  zoom: number
}

interface Selection {
  code: string | null
  label?: string
  flagCode?: string
}

const mod = (n: number, m: number) => ((n % m) + m) % m

export function ContinentMapMobile({ countryItemCounts, onCountryClick, labels }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const closeFullscreen = useCallback(() => setFullscreen(false), [])
  // Ref por callback (não useRef): entrar/sair da tela cheia remonta a
  // moldura em outro lugar do DOM (portal), e o ResizeObserver precisa
  // seguir o elemento novo. O estado da view (zoom/pan/seleção) fica neste
  // componente, então sobrevive à troca.
  const [box, setBox] = useState<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (!box) return
    const update = () => setSize({ w: box.clientWidth, h: box.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(box)
    return () => ro.disconnect()
  }, [box])

  const { data: topo, isLoading, error } = useWorldTopo()
  const geographies = useMemo(() => (topo ? buildWorldGeographies(topo, MAP_W, MAP_H, { cylindrical: true }) : null), [topo])

  const aspect = size && size.h > 0 ? size.w / size.h : 0.75
  // Nunca deixar a janela mais larga que um mundo inteiro (só aconteceria
  // numa moldura mais larga que 2:1, que não é o caso no celular em pé).
  const zoomMin = Math.max(1, (MAP_H * aspect) / MAP_W)

  const clampView = (v: View): View => {
    const zoom = Math.min(ZOOM_MAX, Math.max(zoomMin, v.zoom))
    const viewH = MAP_H / zoom
    return { zoom, cx: mod(v.cx, MAP_W), cy: Math.min(MAP_H - viewH / 2, Math.max(viewH / 2, v.cy)) }
  }

  const [rawView, setRawView] = useState<View>({ cx: MAP_W / 2, cy: MAP_H / 2, zoom: 1 })
  const view = clampView(rawView)
  const viewH = MAP_H / view.zoom
  const viewW = viewH * aspect
  const viewX = view.cx - viewW / 2
  const viewY = view.cy - viewH / 2

  // Abre centralizado onde estão os itens: média CIRCULAR (o mapa dá a volta)
  // do x dos países, ponderada pela contagem.
  const centeredRef = useRef(false)
  useEffect(() => {
    if (!geographies || centeredRef.current) return
    centeredRef.current = true
    let sx = 0
    let sy = 0
    for (const s of geographies.shapes) {
      const n = s.code ? countryItemCounts.get(s.code) ?? 0 : 0
      if (!n || s.cx == null) continue
      const a = (s.cx / MAP_W) * 2 * Math.PI
      sx += Math.cos(a) * n
      sy += Math.sin(a) * n
    }
    if (sx === 0 && sy === 0) return
    const cx = mod((Math.atan2(sy, sx) / (2 * Math.PI)) * MAP_W, MAP_W)
    setRawView((v) => ({ ...v, cx }))
  }, [geographies, countryItemCounts])

  const [selected, setSelected] = useState<Selection | null>(null)

  /** Converte um ponto da tela (clientX/Y) pra coordenada do mapa na view `v`. */
  const toMap = (clientX: number, clientY: number, v: View) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const vh = MAP_H / v.zoom
    const vw = vh * aspect
    return {
      x: v.cx - vw / 2 + ((clientX - rect.left) / rect.width) * vw,
      y: v.cy - vh / 2 + ((clientY - rect.top) / rect.height) * vh,
      fx: (clientX - rect.left) / rect.width,
      fy: (clientY - rect.top) / rect.height,
    }
  }

  /** View com zoom `zoom` mantendo o ponto do mapa (mx,my) sob a fração (fx,fy) da tela. */
  const viewAt = (mx: number, my: number, fx: number, fy: number, zoom: number): View => {
    const z = Math.min(ZOOM_MAX, Math.max(zoomMin, zoom))
    const vh = MAP_H / z
    const vw = vh * aspect
    return clampView({ zoom: z, cx: mx - (fx - 0.5) * vw, cy: my - (fy - 0.5) * vh })
  }

  const zoomBy = (factor: number) => setRawView((v) => clampView({ ...v, zoom: clampView(v).zoom * factor }))

  // ── Gestos (Pointer Events: mouse/toque/caneta no mesmo caminho) ──
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<
    | { kind: 'pan'; startX: number; startY: number; startView: View; moved: boolean; target: Selection | null; multi: boolean }
    | { kind: 'pinch'; startDist: number; startView: View; mx: number; my: number }
    | null
  >(null)
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null)
  const openTimerRef = useRef<number | null>(null)
  const cancelPendingOpen = () => {
    if (openTimerRef.current != null) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
  }
  useEffect(() => cancelPendingOpen, [])

  const shapeFromTarget = (el: EventTarget | null): Selection | null => {
    const node = (el as Element | null)?.closest?.('[data-shape]') as SVGElement | null
    if (!node) return null
    return { code: node.dataset.code || null, label: node.dataset.label, flagCode: node.dataset.flag }
  }

  const startPinch = () => {
    const [a, b] = [...pointersRef.current.values()]
    const start = clampView(rawView)
    const mid = toMap((a.x + b.x) / 2, (a.y + b.y) / 2, start)
    gestureRef.current = { kind: 'pinch', startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1, startView: start, mx: mid.x, my: mid.y }
  }

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 1) {
      gestureRef.current = {
        kind: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        startView: clampView(rawView),
        moved: false,
        target: shapeFromTarget(e.target),
        multi: false,
      }
    } else if (pointersRef.current.size === 2) {
      startPinch()
    }
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gestureRef.current
    if (!g || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()

    if (g.kind === 'pinch' && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const fx = ((a.x + b.x) / 2 - rect.left) / rect.width
      const fy = ((a.y + b.y) / 2 - rect.top) / rect.height
      setRawView(viewAt(g.mx, g.my, fx, fy, g.startView.zoom * (dist / g.startDist)))
      return
    }
    if (g.kind === 'pan') {
      const dx = e.clientX - g.startX
      const dy = e.clientY - g.startY
      if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP_PX) return
      g.moved = true
      const vh = MAP_H / g.startView.zoom
      const scale = (vh * aspect) / rect.width
      setRawView(clampView({ ...g.startView, cx: g.startView.cx - dx * scale, cy: g.startView.cy - dy * scale }))
    }
  }

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.delete(e.pointerId)
    const g = gestureRef.current

    if (pointersRef.current.size === 1) {
      // Saiu da pinça com 1 dedo na tela: recomeça o arrasto da posição
      // atual dele (senão o mapa "pula"), e esse gesto não vira toque.
      const [pos] = [...pointersRef.current.values()]
      gestureRef.current = { kind: 'pan', startX: pos.x, startY: pos.y, startView: clampView(rawView), moved: true, target: null, multi: true }
      return
    }
    if (pointersRef.current.size > 0) return
    gestureRef.current = null

    if (e.type !== 'pointerup' || !g || g.kind !== 'pan' || g.moved || g.multi) return
    // Toque simples. Segundo toque rápido no mesmo lugar = zoom ali.
    const now = performance.now()
    const last = lastTapRef.current
    if (last && now - last.time < DOUBLE_TAP_MS && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30) {
      lastTapRef.current = null
      cancelPendingOpen()
      const p = toMap(e.clientX, e.clientY, clampView(rawView))
      setRawView(viewAt(p.x, p.y, p.fx, p.fy, clampView(rawView).zoom * 2))
      return
    }
    lastTapRef.current = { time: now, x: e.clientX, y: e.clientY }
    cancelPendingOpen()
    // Tocar de novo num país já selecionado (e com itens) abre a categoria,
    // sem precisar do botão do cartão. A abertura espera o intervalo do toque
    // duplo, pra o zoom por toque duplo continuar funcionando nesse país.
    const code = g.target?.code
    if (code && selected?.code === code && countFor(code) > 0) {
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = null
        openCountry(code)
      }, DOUBLE_TAP_MS)
      return
    }
    setSelected(g.target)
  }

  const countFor = (code: string | null | undefined) => (code ? countryItemCounts.get(code) ?? 0 : 0)

  const openCountry = (code: string) => onCountryClick(code)

  // Só desenha as cópias do mundo que aparecem na janela atual (no máx. 2).
  const offsets = [0]
  if (viewX < 0) offsets.push(-MAP_W)
  if (viewX + viewW > MAP_W) offsets.push(MAP_W)

  const selectedShapes = selected && geographies
    ? geographies.shapes.filter((s) => (selected.code ? s.code === selected.code : s.label === selected.label))
    : []
  const selectedCount = countFor(selected?.code)

  const content = (
    <>
      <div
        ref={setBox}
        className={`relative overflow-hidden bg-[#E0ECFF] ${fullscreen ? 'min-h-0 flex-1' : 'h-[60vh] max-h-[640px] min-h-[320px] rounded-lg'}`}
      >
        {isLoading && <p className="absolute inset-0 flex items-center justify-center text-stone-500">{labels.loading}</p>}
        {error && <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-red-500">{(error as Error).message}</p>}
        {geographies && size && (
          <>
            <svg
              ref={svgRef}
              viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
              className="absolute inset-0 h-full w-full touch-none select-none"
              role="img"
              aria-label={labels.ariaLabel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <rect x={-MAP_W} y={0} width={MAP_W * 3} height={MAP_H} fill="#E0ECFF" />
              {offsets.map((ox) => (
                <g key={ox} transform={ox ? `translate(${ox} 0)` : undefined}>
                  {geographies.shapes.map((s, i) => {
                    const count = countFor(s.code)
                    const continentKey = s.code ? COUNTRY_CONTINENT[s.code] : undefined
                    const fill = count > 0 && continentKey ? CONTINENT_COLORS[continentKey] : CONTINENT_NEUTRAL_COLOR
                    return (
                      <path
                        key={s.code ?? `x${i}`}
                        d={s.d}
                        fill={fill}
                        stroke="#0c0a09"
                        strokeWidth={0.5}
                        vectorEffect="non-scaling-stroke"
                        data-shape=""
                        data-code={s.code ?? ''}
                        data-label={s.label}
                        data-flag={s.flagCode}
                      />
                    )
                  })}
                  {selectedShapes.map((s, i) => (
                    <path
                      key={`sel${i}`}
                      d={s.d}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      vectorEffect="non-scaling-stroke"
                      pointerEvents="none"
                    />
                  ))}
                </g>
              ))}
            </svg>

            <div className="absolute top-2 right-2 z-10 flex flex-col overflow-hidden rounded-lg border border-stone-700 bg-stone-800/90 shadow">
              <button
                type="button"
                onClick={() => zoomBy(1.6)}
                disabled={view.zoom >= ZOOM_MAX}
                title={labels.zoomIn}
                aria-label={labels.zoomIn}
                className="flex h-8 w-8 items-center justify-center text-stone-200 transition active:bg-stone-700 disabled:opacity-40"
              >
                +
              </button>
              <div className="border-t border-stone-700" />
              <button
                type="button"
                onClick={() => zoomBy(1 / 1.6)}
                disabled={view.zoom <= zoomMin}
                title={labels.zoomOut}
                aria-label={labels.zoomOut}
                className="flex h-8 w-8 items-center justify-center text-stone-200 transition active:bg-stone-700 disabled:opacity-40"
              >
                −
              </button>
              {!fullscreen && (
                <>
                  <div className="border-t border-stone-700" />
                  <button
                    type="button"
                    onClick={() => setFullscreen(true)}
                    title={labels.fullscreen}
                    aria-label={labels.fullscreen}
                    className="flex h-8 w-8 items-center justify-center text-stone-200 transition active:bg-stone-700"
                  >
                    <ExpandIcon />
                  </button>
                </>
              )}
            </div>

          </>
        )}
      </div>

      {/* Cartão do país FORA do mapa (logo abaixo), pra não cobrir nada.
          Altura fixa: alternar dica ⇄ cartão não empurra a página. */}
      {geographies && (
        <div className={`flex h-16 shrink-0 items-center ${fullscreen ? 'px-3' : 'mt-2'}`}>
          {selected ? (
            <div className="flex w-full items-center gap-3 rounded-xl border border-stone-700 bg-stone-950/80 px-3 py-2">
              <Flag code={selected.code ?? selected.flagCode} className="h-6 w-9 shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-stone-100">{selected.code ? countryName(selected.code) : selected.label}</p>
                <p className="text-xs text-stone-400">
                  {selectedCount > 0
                    ? `${selectedCount} ${selectedCount === 1 ? labels.itemSingular : labels.itemPlural}`
                    : labels.noItems}
                </p>
              </div>
              {selected.code && selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => openCountry(selected.code!)}
                  className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition active:bg-amber-700"
                >
                  {labels.open}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                title={labels.close}
                aria-label={labels.close}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition active:bg-stone-800"
              >
                <CloseIcon />
              </button>
            </div>
          ) : (
            <p className="w-full text-center text-xs text-stone-500">{labels.tapHint}</p>
          )}
        </div>
      )}

      {geographies && (
        <div className={`grid shrink-0 grid-cols-3 gap-x-3 gap-y-1 text-xs text-stone-400 ${fullscreen ? 'px-3 pb-3' : 'px-1'}`}>
          {CONTINENT_LEGEND.map((l) => (
            <span key={l.label} className="flex min-w-0 items-center gap-1.5">
              <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: l.color }} />
              <span className="truncate">{l.label}</span>
            </span>
          ))}
        </div>
      )}
    </>
  )

  if (fullscreen) {
    return (
      <>
        {/* Marca o lugar na página enquanto o mapa está em tela cheia. */}
        <section className="h-[60vh] max-h-[640px] min-h-[320px] rounded-xl border border-stone-800 bg-stone-900" />
        <FullscreenOverlay title={labels.title} closeLabel={labels.closeFullscreen} onClose={closeFullscreen} bodyClassName="flex min-h-0 flex-1 flex-col">
          {content}
        </FullscreenOverlay>
      </>
    )
  }

  return <section className="rounded-xl border border-stone-800 bg-stone-900 p-2">{content}</section>
}

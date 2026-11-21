import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { countryName } from '../lib/format'
import { Flag } from './Flag'
import { useWorldTopo, buildWorldGeographies } from '../lib/worldTopo'
import { COUNTRY_CONTINENT, CONTINENT_COLORS, CONTINENT_NEUTRAL_COLOR, CONTINENT_LEGEND } from '../lib/geoContinents'
import { ContinentMapMobile } from './ContinentMapMobile'
import { BELOW_MD_QUERY, useMediaQuery } from '../lib/useMediaQuery'

// Arquivo COMPARTILHADO entre o catálogo e a loja (scripts/shared-ui.mjs):
// textos por `labels`, clique por `onCountryClick` (cada app decide a rota).
//
// Mapa-múndi da raiz de "Geografia" — mesma fonte de topojson/projeção e
// mesmo sistema de zoom/pan/pinça do mapa coroplético da aba Estatísticas
// (WorldMap.tsx), mas clique direto no PAÍS (não no continente): cada país
// usa a cor do seu continente (categórico) quando tem pelo menos 1 item,
// senão fica cinza e não-clicável.

const MAP_W = 800
const MAP_H = 380
const ZOOM_MIN = 1
const ZOOM_MAX = 8
const ZOOM_STEP = 1.5

/** Textos do mapa (cada app passa os seus, no idioma dele). */
export interface ContinentMapLabels {
  loading: string
  ariaLabel: string
  zoomIn: string
  zoomOut: string
  tapHint: string
  open: string
  noItems: string
  itemSingular: string
  itemPlural: string
  close: string
  fullscreen: string
  title: string
  closeFullscreen: string
}

interface Props {
  /** Contagem de itens por país (ISO alpha-2). País ausente/zero = cinza, não-clicável. */
  countryItemCounts: Map<string, number>
  /** Clique num país com item (rota da categoria no app logado, estado local no viewer público). */
  onCountryClick: (code: string) => void
  labels: ContinentMapLabels
}

/** Abaixo de `md` usa a versão estilo Google Maps (ContinentMapMobile); acima, este mapa. */
export function ContinentMap(props: Props) {
  return useMediaQuery(BELOW_MD_QUERY) ? <ContinentMapMobile {...props} /> : <ContinentMapDesktop {...props} />
}

function ContinentMapDesktop({ countryItemCounts, onCountryClick, labels }: Props) {
  const [hover, setHover] = useState<{ code: string | null; label?: string; flagCode?: string; x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  // Deslocamento do centro do viewBox (em unidades do mapa), pra arrastar
  // quando estiver com zoom. Em zoom 1 não há pra onde arrastar.
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ startClientX: number; startClientY: number; startPan: { x: number; y: number }; dragged: boolean } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  // Evita que soltar o arrasto em cima de um país dispare o clique dele.
  const suppressClickRef = useRef(false)
  // Pointer Events já unificam mouse/touch/caneta — um dedo só usa o mesmo
  // caminho de arrasto do mouse. Pinça (2 dedos) precisa rastrear os dois
  // pointers simultâneos pra medir a distância entre eles.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null)

  const viewW = MAP_W / zoom
  const viewH = MAP_H / zoom

  const clampPan = (p: { x: number; y: number }) => ({
    x: Math.max(-(MAP_W - viewW) / 2, Math.min((MAP_W - viewW) / 2, p.x)),
    y: Math.max(-(MAP_H - viewH) / 2, Math.min((MAP_H - viewH) / 2, p.y)),
  })

  // Zoom centralizado: recorta o viewBox mantendo o centro (+ pan) fixo.
  const viewBox = `${(MAP_W - viewW) / 2 + pan.x} ${(MAP_H - viewH) / 2 + pan.y} ${viewW} ${viewH}`

  const zoomIn = () => setZoom((z) => Math.min(z * ZOOM_STEP, ZOOM_MAX))
  const zoomOut = () => setZoom((z) => Math.max(z / ZOOM_STEP, ZOOM_MIN))

  // Se o zoom mudar (inclusive voltando a 1), o pan precisa ser recortado
  // para o novo viewBox — senão fica "preso" fora dos limites do mapa.
  useEffect(() => {
    setPan((p) => clampPan(p))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom])

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    // Cada interação nova começa "limpa" — evita que um arrasto solto fora
    // de qualquer país (sem clique pra consumir a flag) trave o próximo clique.
    suppressClickRef.current = false
    ;(e.target as Element).setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2) {
      // Segundo dedo pousou: começa a pinça, cancela arrasto de 1 dedo em curso.
      dragRef.current = null
      setIsDragging(false)
      const [a, b] = [...pointersRef.current.values()]
      pinchRef.current = { startDist: Math.hypot(a.x - b.x, a.y - b.y), startZoom: zoom }
    } else if (pointersRef.current.size === 1 && zoom > ZOOM_MIN) {
      dragRef.current = { startClientX: e.clientX, startClientY: e.clientY, startPan: pan, dragged: false }
      setIsDragging(true)
    }
  }
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (dist > 0) {
        const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchRef.current.startZoom * (dist / pinchRef.current.startDist)))
        setZoom(nextZoom)
      }
      return
    }

    const drag = dragRef.current
    if (!drag || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const scale = viewW / rect.width
    const dxPx = e.clientX - drag.startClientX
    const dyPx = e.clientY - drag.startClientY
    if (Math.abs(dxPx) > 3 || Math.abs(dyPx) > 3) drag.dragged = true
    setPan(clampPan({ x: drag.startPan.x - dxPx * scale, y: drag.startPan.y - dyPx * scale }))
  }
  const endDrag = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId)

    if (pointersRef.current.size < 2) pinchRef.current = null

    if (pointersRef.current.size === 0) {
      if (dragRef.current?.dragged) suppressClickRef.current = true
      dragRef.current = null
      setIsDragging(false)
    } else if (pointersRef.current.size === 1) {
      // Saiu da pinça com 1 dedo ainda na tela: reinicia o arrasto a partir
      // da posição atual dele, senão o mapa "pula" pro delta acumulado da pinça.
      const [pos] = [...pointersRef.current.values()]
      if (zoom > ZOOM_MIN) {
        dragRef.current = { startClientX: pos.x, startClientY: pos.y, startPan: pan, dragged: false }
        setIsDragging(true)
      }
    }
  }

  const { data: topo, isLoading, error } = useWorldTopo()
  const geographies = useMemo(() => (topo ? buildWorldGeographies(topo, MAP_W, MAP_H) : null), [topo])

  const countFor = (code: string | null) => (code ? countryItemCounts.get(code) ?? 0 : 0)

  const showHover = (code: string | null, label: string | undefined, flagCode: string | undefined, x: number, y: number) => {
    if (label) {
      setHover({ code: null, label, flagCode, x, y })
      return
    }
    if (!code) return
    setHover({ code, x, y })
  }
  const handleClick = (code: string | null) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (!code || countFor(code) === 0) return
    onCountryClick(code)
  }

  return (
    <section className="relative rounded-xl border border-stone-800 bg-stone-900 p-3">
      {isLoading && <p className="py-16 text-center text-stone-500">{labels.loading}</p>}
      {error && <p className="py-16 text-center text-red-400">{(error as Error).message}</p>}
      {geographies && (
        <>
          <div className="absolute top-5 right-5 z-10 flex flex-col overflow-hidden rounded-lg border border-stone-700 bg-stone-800/90 shadow">
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              title={labels.zoomIn}
              aria-label={labels.zoomIn}
              className="flex h-8 w-8 items-center justify-center text-stone-200 transition hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              +
            </button>
            <div className="border-t border-stone-700" />
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              title={labels.zoomOut}
              aria-label={labels.zoomOut}
              className="flex h-8 w-8 items-center justify-center text-stone-200 transition hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              −
            </button>
          </div>
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className={`h-auto w-full touch-none ${zoom > ZOOM_MIN ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            role="img"
            aria-label={labels.ariaLabel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onPointerCancel={endDrag}
          >
            <path d={geographies.sphere} fill="#E0ECFF" stroke="#1c1917" strokeWidth={0.5} />
            {geographies.shapes.map((s, i) => {
              const count = countFor(s.code)
              const clickable = count > 0
              const continentKey = s.code ? COUNTRY_CONTINENT[s.code] : undefined
              const fill = clickable && continentKey ? CONTINENT_COLORS[continentKey] : CONTINENT_NEUTRAL_COLOR
              return (
                <path
                  key={s.code ?? `x${i}`}
                  d={s.d}
                  fill={fill}
                  stroke="#0c0a09"
                  strokeWidth={0.4}
                  className={clickable ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}
                  onMouseEnter={(e) => showHover(s.code, s.label, s.flagCode, e.clientX, e.clientY)}
                  onMouseMove={(e) => setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => handleClick(s.code)}
                />
              )
            })}
          </svg>

          {hover && (
            <div
              className="pointer-events-none fixed z-50 rounded-lg border border-stone-700 bg-stone-950/95 px-3 py-1.5 text-sm shadow-xl"
              style={{ left: hover.x + 12, top: hover.y + 12 }}
            >
              <span className="inline-flex items-center gap-1.5 font-medium text-stone-100">
                <Flag code={hover.code ?? hover.flagCode} />
                {hover.code ? countryName(hover.code) : hover.label}
              </span>
              <span className="ml-2 text-stone-400">
                {countFor(hover.code)} {countFor(hover.code) === 1 ? labels.itemSingular : labels.itemPlural}
              </span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
            {CONTINENT_LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

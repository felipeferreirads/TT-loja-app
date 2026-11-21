// Geometria do mapa-múndi (TopoJSON do world-atlas → paths SVG por país) —
// funções PURAS, sem idioma e sem domínio. Arquivo COMPARTILHADO com a loja
// (scripts/shared-ui.mjs): editar aqui e rodar `npm run ui:sync`. A busca do
// TopoJSON (com ou sem cache offline) é de cada app: lib/worldTopo.ts.

import { geoEquirectangular, geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, Geometry } from 'geojson'
import isoCountries from 'i18n-iso-countries'

export const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

export interface WorldGeographies {
  sphere: string
  /** `cx` = x do centroide do território principal (unidades do viewBox) — usado pra centralizar o mapa mobile. */
  shapes: { code: string | null; d: string; label?: string; flagCode?: string; cx?: number }[]
}

// Alguns países têm, no MultiPolygon do Natural Earth, anéis de território
// destacado que ficam visualmente longe do território principal (Alasca e
// Havaí dos EUA; Guiana Francesa da França). Como o mapa colore o país
// inteiro como um único path, esses anéis herdavam a cor/continente do país
// mesmo sem nenhum item catalogado ali — dava a impressão de haver coleção
// na Guiana Francesa só porque há itens da França continental, por exemplo.
// Cada regra identifica um anel destacado pelo bounding box (long, lat) e dá
// um rótulo + bandeira (do país "dono") pro hover — desenhado à parte, com
// `code: null` (mesmo tratamento "sem dados"/cinza/não-clicável que qualquer
// país sem itens já recebe).
const DETACHED_RING_RULES: Record<string, { label: string; flagCode: string; test: (bbox: [number, number, number, number]) => boolean }[]> = {
  '840': [
    { label: 'Alaska (EUA)', flagCode: 'US', test: ([, minY]) => minY > 50 },
    { label: 'Havaí (EUA)', flagCode: 'US', test: ([, minY]) => minY < 24 },
  ],
  '250': [{ label: 'Guiana Francesa (França)', flagCode: 'FR', test: ([minX]) => minX < -20 }],
}

function ringBBox(ring: number[][]): [number, number, number, number] {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of ring) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return [minX, minY, maxX, maxY]
}

interface DetachedGroup {
  label: string
  flagCode: string
  feature: Feature<Geometry>
}

/** Separa, de um Feature MultiPolygon, os anéis "destacados" (ver DETACHED_RING_RULES) do restante, agrupados por rótulo. */
function splitDetachedRings(f: Feature<Geometry, { name?: string }>): { main: Feature<Geometry>; detached: DetachedGroup[] } {
  const rules = f.id != null ? DETACHED_RING_RULES[String(f.id)] : undefined
  if (!rules || f.geometry.type !== 'MultiPolygon') return { main: f, detached: [] }
  const kept: number[][][][] = []
  const groups = new Map<string, { flagCode: string; coordinates: number[][][][] }>()
  for (const polygon of f.geometry.coordinates) {
    const bbox = ringBBox(polygon[0])
    const rule = rules.find((r) => r.test(bbox))
    if (!rule) {
      kept.push(polygon)
      continue
    }
    const group = groups.get(rule.label) ?? { flagCode: rule.flagCode, coordinates: [] }
    group.coordinates.push(polygon)
    groups.set(rule.label, group)
  }
  const detached: DetachedGroup[] = [...groups.entries()].map(([label, { flagCode, coordinates }]) => ({
    label,
    flagCode,
    feature: { ...f, id: undefined, geometry: { type: 'MultiPolygon', coordinates } },
  }))
  return { main: { ...f, geometry: { type: 'MultiPolygon', coordinates: kept } }, detached }
}

/**
 * Projeta o topojson em paths SVG (código ISO alpha-2 por país) para um viewBox `width`x`height`.
 *
 * `cylindrical`: projeção equirretangular encaixada na ESFERA (não nos países),
 * ocupando exatamente a largura toda (use `height = width / 2`). Bordas
 * laterais retas = dá pra repetir o mundo lado a lado e arrastar sem fim (mapa
 * mobile estilo Google Maps, ver ContinentMapMobile.tsx). Natural Earth (o
 * padrão) é oval e deixaria um vão entre as cópias.
 */
export function buildWorldGeographies(
  topo: unknown,
  width: number,
  height: number,
  opts: { cylindrical?: boolean } = {},
): WorldGeographies {
  const t = topo as { objects: { countries: unknown } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fc = feature(topo as any, t.objects.countries as any) as unknown as {
    features: Feature<Geometry, { name?: string }>[]
  }
  // `fitExtent` com uma pequena margem em vez de `fitSize`: encostado no topo
  // do viewBox, o traço da borda da esfera (e da borda norte dos países) era
  // cortado pela aresta do SVG — a linha superior do mapa não aparecia.
  const PAD = 2
  const projection = opts.cylindrical
    ? geoEquirectangular().fitSize([width, height], { type: 'Sphere' } as never)
    : geoNaturalEarth1().fitExtent(
        [
          [PAD, PAD],
          [width - PAD, height - PAD],
        ],
        { type: 'FeatureCollection', features: fc.features } as never,
      )
  const path = geoPath(projection)
  const sphere = path({ type: 'Sphere' } as never) ?? ''
  return {
    sphere,
    shapes: fc.features
      .flatMap((f) => {
        const { main, detached } = splitDetachedRings(f)
        const code = f.id != null ? isoCountries.numericToAlpha2(String(f.id)) : undefined
        const shapes: WorldGeographies['shapes'] = [{ code: code ?? null, d: path(main) ?? '', cx: path.centroid(main)[0] }]
        for (const group of detached) {
          shapes.push({ code: null, label: group.label, flagCode: group.flagCode, d: path(group.feature) ?? '' })
        }
        return shapes
      })
      .filter((s) => s.d),
  }
}

import type { SizeClass } from '../../types/db'

/**
 * Classe de tamanho do produto (migration 0031) — copiado do catálogo pessoal
 * (`src/features/specimens/sizeClass.ts`), só em português e sem a camada de
 * unidades (a loja trabalha em mm/cm). Nomenclatura tradicional do
 * colecionismo; os limites são padrão do app, não norma. A classe se baseia
 * na MAIOR dimensão linear, incluindo a matriz.
 */

/** Da menor para a maior. `maxMm` é o limite superior inclusivo da faixa. */
const SCALE: { value: SizeClass; maxMm: number }[] = [
  { value: 'thumbnail', maxMm: 25 },
  { value: 'miniature', maxMm: 50 },
  { value: 'cabinet', maxMm: 100 },
  { value: 'large_cabinet', maxMm: 200 },
  { value: 'museum', maxMm: 400 },
  { value: 'large', maxMm: Infinity },
]

/** Micromount é definido pela observação ao microscópio: nunca é calculado, só atribuído manualmente. */
export const SIZE_CLASS_VALUES: SizeClass[] = ['micromount', ...SCALE.map((c) => c.value)]

export const SIZE_CLASS_LABELS: Record<SizeClass, string> = {
  micromount: 'Micromount',
  thumbnail: 'Thumbnail',
  miniature: 'Miniatura',
  cabinet: 'Cabinet',
  large_cabinet: 'Cabinet grande',
  museum: 'Museu',
  large: 'Grande porte',
}

/** Faixa de cada classe, em cm. */
export const SIZE_CLASS_RANGES: Record<SizeClass, string> = {
  micromount: 'sem faixa de tamanho',
  thumbnail: 'até 2,5 cm',
  miniature: '2,5–5 cm',
  cabinet: '5–10 cm',
  large_cabinet: '10–20 cm',
  museum: '20–40 cm',
  large: 'acima de 40 cm',
}

export function isSizeClass(v: unknown): v is SizeClass {
  return typeof v === 'string' && (SIZE_CLASS_VALUES as string[]).includes(v)
}

/** Classe correspondente a uma dimensão em milímetros. */
export function sizeClassFromMm(mm: number): SizeClass {
  return SCALE.find((c) => mm <= c.maxMm)!.value
}

/**
 * Maior medida (mm) de um texto como "30 × 20 × 10 mm" ou "12,3 x 7 cm".
 * Aceita ponto ou vírgula decimal e as unidades mm/cm/m; sem unidade o número
 * é ignorado. Em texto com várias linhas vale o maior valor. Null se nada for
 * reconhecido.
 */
export function maxDimensionMm(text: string | null | undefined): number | null {
  const raw = (text ?? '').trim()
  if (!raw) return null
  let best: number | null = null
  for (const line of raw.split(/\r?\n/)) {
    const unit = /(mm|cm|m)\s*$/i.exec(line.trim())
    if (!unit) continue
    const factor = unit[1].toLowerCase() === 'mm' ? 1 : unit[1].toLowerCase() === 'cm' ? 10 : 1000
    for (const n of line.match(/\d+(?:[.,]\d+)?/g) ?? []) {
      const v = parseFloat(n.replace(',', '.')) * factor
      if (Number.isFinite(v) && (best == null || v > best)) best = v
    }
  }
  return best
}

/** Classe calculada a partir de `dimensions`; null quando não há medida legível. */
export function computedSizeClass(dimensions: string | null | undefined): SizeClass | null {
  const mm = maxDimensionMm(dimensions)
  return mm == null ? null : sizeClassFromMm(mm)
}

/** Classe efetiva: a manual prevalece sobre a calculada. */
export function effectiveSizeClass(p: { size_class?: SizeClass | null; dimensions?: string | null }): SizeClass | null {
  return p.size_class ?? computedSizeClass(p.dimensions)
}

// Paleta de cores das categorias.
//
// O banco guarda o SLUG ('amber', 'sky'…), não o hex — assim dá para afinar a
// paleta depois sem migrar dado, e um valor inesperado (categoria antiga,
// slug renomeado) cai no padrão em vez de pintar de branco.
//
// Hex inline, não classe do Tailwind: `bg-${cor}-500` montado em runtime não
// existe no CSS gerado (o Tailwind varre o código estaticamente), então
// precisaria de safelist. Cor de dado é caso clássico de estilo inline.

export interface CategoryColor {
  slug: string
  label: string
  /** Cor do ícone/ponto. Escolhidas para ter contraste sobre stone-800/900. */
  hex: string
}

export const CATEGORY_COLORS: CategoryColor[] = [
  { slug: 'stone', label: 'Padrão', hex: '#a8a29e' },
  { slug: 'red', label: 'Vermelho', hex: '#f87171' },
  { slug: 'orange', label: 'Laranja', hex: '#fb923c' },
  { slug: 'amber', label: 'Âmbar', hex: '#fbbf24' },
  { slug: 'yellow', label: 'Amarelo', hex: '#facc15' },
  { slug: 'lime', label: 'Lima', hex: '#a3e635' },
  { slug: 'green', label: 'Verde', hex: '#4ade80' },
  { slug: 'teal', label: 'Verde-azulado', hex: '#2dd4bf' },
  { slug: 'sky', label: 'Azul-céu', hex: '#38bdf8' },
  { slug: 'blue', label: 'Azul', hex: '#60a5fa' },
  { slug: 'violet', label: 'Violeta', hex: '#a78bfa' },
  { slug: 'fuchsia', label: 'Magenta', hex: '#e879f9' },
  { slug: 'pink', label: 'Rosa', hex: '#f472b6' },
  { slug: 'brown', label: 'Marrom', hex: '#b08968' },
]

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0]

const BY_SLUG = new Map(CATEGORY_COLORS.map((c) => [c.slug, c]))

/** Hex da cor de uma categoria. `null`/slug desconhecido → cor padrão. */
export function categoryColorHex(slug: string | null | undefined): string {
  return (slug ? BY_SLUG.get(slug) : undefined)?.hex ?? DEFAULT_CATEGORY_COLOR.hex
}

/**
 * Cor de texto (escura ou clara) com contraste adequado sobre um fundo `hex`.
 * Luminância relativa aproximada (sRGB ponderado) — acima do meio pede texto
 * escuro; abaixo, texto claro. Usada ao pintar o FUNDO de um chip com a cor da
 * categoria.
 */
export function contrastTextColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#1c1917'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1c1917' : '#fafaf9'
}

/**
 * Cor EFETIVA: uma subcategoria sem cor própria herda a da mãe, para o álbum
 * inteiro ficar visualmente coeso sem precisar pintar filha por filha.
 * Percorre até a raiz; ciclo é cortado pelo `seen`.
 */
export function effectiveCategoryColor(
  categorias: Array<{ id: string; parent_id: string | null; color: string | null }>,
  id: string,
): string {
  const byId = new Map(categorias.map((c) => [c.id, c]))
  const seen = new Set<string>()
  let atual = byId.get(id)
  while (atual && !seen.has(atual.id)) {
    seen.add(atual.id)
    if (atual.color && BY_SLUG.has(atual.color)) return categoryColorHex(atual.color)
    atual = atual.parent_id ? byId.get(atual.parent_id) : undefined
  }
  return DEFAULT_CATEGORY_COLOR.hex
}

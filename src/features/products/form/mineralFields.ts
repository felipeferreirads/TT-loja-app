// Copiado de src/features/specimens/formFields.ts (MINERAL_PROPS,
// DEFAULT_SPECIAL_PROPS, splitProps, FLUORESCENCE_COLOR_OPTIONS,
// SPECTRUM_COLOR_OPTIONS) do catálogo pessoal — sem i18n, rótulos fixos em
// PT (claude.md §2).

import { COLOR_OPTIONS } from '../colorOptions'

// Propriedades de um mineral da amostra (colunas de store_product_minerals),
// ordenadas por tipo de característica: químicas → físicas → ópticas.
export const MINERAL_PROPS = [
  // Químicas
  { key: 'formula', label: 'Fórmula' },
  { key: 'formula_name', label: 'Nome químico' },
  { key: 'mineral_class', label: 'Classe / Subclasse' },
  { key: 'group_name', label: 'Grupo' },
  {
    key: 'color_cause',
    label: 'Origem da cor',
    options: ['Idiocromático', 'Alocromático', 'Pseudocromático', 'Alocromático e Pseudocromático'] as readonly string[] | undefined,
  },
  { key: 'chromophore', label: 'Cromóforo' },
  // Físicas
  { key: 'hardness', label: 'Dureza (Mohs)' },
  { key: 'tenacity', label: 'Tenacidade' },
  { key: 'cleavage', label: 'Clivagem' },
  { key: 'fracture', label: 'Fratura' },
  { key: 'streak', label: 'Traço' },
  { key: 'density', label: 'Densidade (g/cm³)' },
  { key: 'crystal_system', label: 'Sistema cristalino' },
  // Ópticas
  { key: 'luster', label: 'Brilho' },
  { key: 'transparency', label: 'Transparência' },
  { key: 'refractive_index', label: 'Índice de refração' },
] as const

export type MineralPropKey = (typeof MINERAL_PROPS)[number]['key']

// Propriedades especiais (item multi-seleção; o usuário pode criar novas)
export const DEFAULT_SPECIAL_PROPS = [
  'Fluorescência',
  'Fosforescência',
  'Iridescência',
  'Pleocroísmo',
  'Chatoyancy / Olho-de-gato',
  'Opalescência',
  'Jogo de Cor',
  'Radioatividade',
  'Asterismo',
  'Aventurescência',
  'Adularescência',
  'Termoluminescência',
]

/** "Fluorescência, Iridescência" (texto no banco) → lista para os chips. */
export const splitProps = (s: string | null | undefined): string[] =>
  s ? s.split(/[;,]/).map((x) => x.trim()).filter(Boolean) : []

/**
 * Paleta reduzida para fluorescência: fluorescência é luz EMITIDA (a peça
 * "brilha" no escuro sob UV), então cores que dependem de reflexo —
 * metálicas (Dourado/Prateado/Cobre) — ou que são a ausência/opacidade de
 * luz (Preto, Cinza, Incolor) não descrevem o fenômeno.
 */
export const FLUORESCENCE_COLOR_OPTIONS = COLOR_OPTIONS.filter(
  (c) => !['Vinho', 'Marrom', 'Preto', 'Cinza', 'Incolor', 'Dourado', 'Prateado', 'Cobre'].includes(c),
)

/**
 * Paleta para iridescência/jogo de cor: fica só o espectro cromático
 * saturado. "Espectro completo" é acrescentado à parte (labradorita/opala
 * mostrando todo o espectro, não uma cor isolada).
 */
export const SPECTRUM_COLOR_OPTIONS = [
  ...COLOR_OPTIONS.filter(
    (c) => !['Preto', 'Branco', 'Cinza', 'Incolor', 'Marrom', 'Bege', 'Creme', 'Dourado', 'Prateado', 'Cobre'].includes(c),
  ),
  'Espectro completo',
]

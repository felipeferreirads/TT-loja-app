// Opções dos campos exclusivos de gema — adaptado de `formFields.ts` do
// catálogo pessoal (claude.md §2), simplificado: sem `ShapeSelect`
// gerenciável (tabela `gem_shapes` própria, criar/renomear/apagar formato) —
// aqui é uma lista fixa, como as demais listas fechadas da loja
// (`colorOptions.ts`). Se o dono precisar de formatos personalizados no
// futuro, portar `features/gems/` de lá é o caminho.

export const CUT_TYPE_OPTIONS = ['Facetado', 'Cabochão', 'Misto', 'Escultura', 'Esfera']

export const GEM_SHAPE_OPTIONS = [
  'Gota',
  'Oval',
  'Redondo',
  'Quadrado',
  'Retangular',
  'Cushion',
  'Coração',
  'Marquise / Navete',
  'Pentagonal',
  'Hexagonal',
  'Octogonal',
  'Livre',
  'Trapézio',
  'Triangular / Trillion',
]

// Só faz sentido pra pedra Facetado ou Misto — a geometria das facetas não
// existe em Cabochão/Escultura/Esfera.
export const GEM_STYLE_OPTIONS = [
  'Brilhante',
  'Degrau / Step Cut',
  'Misto',
  'Rose',
  'Português',
  'Barion',
  'Fantasy',
  'Tabuleiro / Checkerboard',
  'Antique',
  'Retrato / Portrait Cut',
  'Tesoura / Scissor Cut',
  'Briolette',
  'Esmeralda',
  'Baguete',
]

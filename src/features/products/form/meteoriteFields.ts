// Opções dos campos exclusivos de meteorito — cópia das listas de
// `formFields.ts` do catálogo pessoal (claude.md §2), sem alteração: mesma
// nomenclatura/escala, pra dado importado da coleção (`importFromCollection.ts`)
// bater exatamente com o valor de origem.

export const MET_CATEGORIES = ['Rochoso', 'Rochoso-metálico', 'Metálico']
export const MET_CLASSES_BY_CATEGORY: Record<string, string[]> = {
  Rochoso: ['Condrito', 'Acondrito'],
  'Rochoso-metálico': ['Pallasito', 'Mesossiderito'],
  Metálico: ['Octaedrito', 'Hexaedrito', 'Ataxito'],
}
export const MET_ALL_CLASSES = Object.values(MET_CLASSES_BY_CATEGORY).flat()

// Grau de choque/intemperismo — mesma escala usada nas Estatísticas do
// catálogo pessoal (stats/meteoriteStats.ts), pra distribuição bater.
export const MET_SHOCK = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
export const MET_WEATHERING = ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'Baixo', 'Moderado', 'Alto']

export const MET_YES_NO_PARTIAL = ['Sim', 'Não', 'Parcial']
export const MET_MAGNETISM = ['Baixo', 'Médio', 'Alto']
export const MET_ACID_ETCHED = ['Não', 'Sim', 'Sim, padrão de Widmanstätten visível']

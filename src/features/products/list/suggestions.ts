import type { StoreProduct } from '../../../types/db'
import { frequentValues } from '../../../lib/suggest'
import type { ColumnDef } from './columns'

// Colunas de texto livre em que valores já usados valem como sugestão ao
// editar a célula. Ficam de fora o que é único por produto (nome, SKU, NCM),
// as observações e as listas separadas por vírgula (propriedades, tags), em
// que escolher uma sugestão substituiria a lista inteira.
const SUGGEST_FIELDS = new Set<keyof StoreProduct>([
  'origin',
  'origin_short',
  'dimensions',
  'treatment',
  'fossil_restoration',
  'fossil_host_rock',
  'cut_name',
  'met_class',
  'met_group',
  'met_type',
  'jwl_material',
  'jwl_stone',
  'jwl_size',
  'ecommerce_category_path',
])

/**
 * Sugestões da coluna: valores já gravados em qualquer produto, do mais usado
 * para o menos. Sugestão não é validação — valor inédito continua aceito.
 * Calculado sob demanda (ao abrir o editor), não para todas as colunas.
 */
export function suggestionsFor(col: ColumnDef, products: StoreProduct[]): string[] {
  const e = col.edit
  if (!e || e.type !== 'text' || !SUGGEST_FIELDS.has(e.field)) return []
  return frequentValues(products.map((p) => p[e.field] as string | null))
}

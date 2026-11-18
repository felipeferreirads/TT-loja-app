import { describe, expect, it } from 'vitest'
import { filterSuggestions, frequentValues } from './suggest'
import { COLUMN_BY_KEY, type ColumnContext } from '../features/products/list/columns'
import type { StoreProduct } from '../types/db'

const ctx: ColumnContext = { supplierNames: new Map() }
const product = (p: Partial<StoreProduct>) => p as StoreProduct

describe('frequentValues', () => {
  it('agrupa por acento/caixa, mantém a 1ª grafia e ordena do mais usado', () => {
    expect(frequentValues(['Minas Gerais', 'Bahia', 'minas gerais', null, '', 'Bahia', 'Minas Gerais'])).toEqual(['Minas Gerais', 'Bahia'])
    expect(frequentValues(['Etiópia', 'etiopia', 'Brasil'])).toEqual(['Etiópia', 'Brasil'])
  })
})

describe('filterSuggestions', () => {
  it('começo do texto antes de casamento no meio, sem o valor idêntico', () => {
    expect(filterSuggestions(['Província de Wollo', 'Wollo', 'Wolloy'], 'wollo')).toEqual(['Wolloy', 'Província de Wollo'])
    expect(filterSuggestions(['A'], '')).toEqual([])
  })
})

describe('ordenação das colunas Dimensões e Tamanho', () => {
  it('Dimensões pela maior medida em mm', () => {
    const col = COLUMN_BY_KEY.get('dimensoes')!
    const a = col.sort!(product({ dimensions: '100 mm' }), ctx) as number
    const b = col.sort!(product({ dimensions: '20 mm' }), ctx) as number
    expect(a).toBeGreaterThan(b)
    expect(col.sort!(product({ dimensions: null }), ctx)).toBe(-Infinity)
  })
  it('Tamanho pela classe e, dentro dela, pela medida', () => {
    const col = COLUMN_BY_KEY.get('tamanho')!
    const small = col.sort!(product({ dimensions: '30 mm' }), ctx) as number // miniatura
    const smallBigger = col.sort!(product({ dimensions: '45 mm' }), ctx) as number
    const cabinet = col.sort!(product({ dimensions: '70 mm' }), ctx) as number
    expect(smallBigger).toBeGreaterThan(small)
    expect(cabinet).toBeGreaterThan(smallBigger)
    expect(col.sort!(product({ dimensions: null, size_class: null }), ctx)).toBe(-Infinity)
  })
})

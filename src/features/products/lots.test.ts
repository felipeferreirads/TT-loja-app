import { describe, expect, it } from 'vitest'
import type { StoreProduct } from '../../types/db'
import { allocateLotValue, generateLotSuffixes, isSuffixTaken, nextLotSuffix, sortLotItems, summarizeLot } from './lots'

function mk(id: string, over: Partial<StoreProduct> = {}): StoreProduct {
  return {
    id,
    owner_id: 'owner',
    name: 'Produto',
    kind: 'mineral',
    species_or_type: null,
    sku: null,
    cost_price: null,
    sale_price: 0,
    stock_quantity: 1,
    notes: null,
    source_specimen_id: null,
    disposition: 'in_stock',
    parent_id: 'lot',
    lot_suffix: null,
    is_lot: false,
    is_lot_summary: false,
    origin_country: null,
    origin_state: null,
    origin: null,
    weight_g: null,
    dimensions: null,
    color: null,
    color_secondary: null,
    special_properties: null,
    uv_color: null,
    iridescence_color: null,
    play_of_color: null,
    gem_cut: null,
    weight_ct: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  } as StoreProduct
}

describe('sortLotItems', () => {
  it('ordena numericamente, não em texto (10 depois de 9)', () => {
    const items = [mk('c', { lot_suffix: '10' }), mk('a', { lot_suffix: '2' }), mk('b', { lot_suffix: '9' })]
    expect(sortLotItems(items).map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('numérico antes de alfabético, e sem sufixo por último', () => {
    const items = [mk('sem'), mk('letra', { lot_suffix: 'b' }), mk('num', { lot_suffix: '3' })]
    expect(sortLotItems(items).map((i) => i.id)).toEqual(['num', 'letra', 'sem'])
  })

  it('não muta a lista recebida', () => {
    const items = [mk('b', { lot_suffix: '2' }), mk('a', { lot_suffix: '1' })]
    sortLotItems(items)
    expect(items.map((i) => i.id)).toEqual(['b', 'a'])
  })
})

describe('nextLotSuffix', () => {
  it('continua do maior usado, não da contagem', () => {
    // Peça 2 saiu do lote: contar daria 3, que colidiria com a peça 3.
    expect(nextLotSuffix([mk('a', { lot_suffix: '1' }), mk('c', { lot_suffix: '3' })])).toBe(4)
  })

  it('ignora sufixo não numérico e começa em 1 no lote vazio', () => {
    expect(nextLotSuffix([mk('a', { lot_suffix: 'b' })])).toBe(1)
    expect(nextLotSuffix([])).toBe(1)
  })
})

describe('generateLotSuffixes', () => {
  it('modo numérico continua do maior usado, uma unidade por vez', () => {
    const items = [mk('a', { lot_suffix: '1' }), mk('c', { lot_suffix: '3' })]
    expect(generateLotSuffixes(items, 3, 'numeric')).toEqual(['4', '5', '6'])
  })

  it('lote vazio em modo numérico começa em 1', () => {
    expect(generateLotSuffixes([], 2, 'numeric')).toEqual(['1', '2'])
  })

  it('modo letra começa em "a" e segue o alfabeto', () => {
    expect(generateLotSuffixes([], 3, 'letter')).toEqual(['a', 'b', 'c'])
  })

  it('modo letra continua depois de "z" com "aa", "ab"…', () => {
    const items = [mk('a', { lot_suffix: 'y' }), mk('b', { lot_suffix: 'z' })]
    expect(generateLotSuffixes(items, 3, 'letter')).toEqual(['aa', 'ab', 'ac'])
  })

  it('modo letra ignora sufixos numéricos existentes (sequências independentes)', () => {
    const items = [mk('a', { lot_suffix: '5' }), mk('b', { lot_suffix: 'c' })]
    expect(generateLotSuffixes(items, 2, 'letter')).toEqual(['d', 'e'])
  })

  it('modo numérico ignora sufixos alfabéticos existentes', () => {
    const items = [mk('a', { lot_suffix: 'z' }), mk('b', { lot_suffix: '2' })]
    expect(generateLotSuffixes(items, 2, 'numeric')).toEqual(['3', '4'])
  })
})

describe('isSuffixTaken', () => {
  const items = [mk('a', { lot_suffix: '1' }), mk('b', { lot_suffix: 'B' })]

  it('casa ignorando caixa e espaços', () => {
    expect(isSuffixTaken(items, ' b ')).toBe(true)
    expect(isSuffixTaken(items, '2')).toBe(false)
  })

  it('não acusa a própria peça', () => {
    expect(isSuffixTaken(items, '1', 'a')).toBe(false)
  })

  it('sufixo vazio nunca conflita', () => {
    expect(isSuffixTaken(items, '   ')).toBe(false)
  })
})

describe('summarizeLot', () => {
  it('soma só quem tem peso e conta quantas peças ficaram de fora', () => {
    const s = summarizeLot([mk('a', { weight_g: 10.5 }), mk('b', { weight_g: 4.25 }), mk('c')])
    expect(s).toEqual({ count: 3, sold: 0, weightG: 14.75, withoutWeight: 1 })
  })

  it('peso nulo quando nenhuma peça tem peso; vendida = estoque zerado', () => {
    expect(summarizeLot([mk('a'), mk('b', { stock_quantity: 0 })])).toEqual({
      count: 2,
      sold: 1,
      weightG: null,
      withoutWeight: 2,
    })
  })
})

describe('allocateLotValue', () => {
  it('divide igual e fecha exatamente no total (resíduo na última)', () => {
    const items = [mk('a'), mk('b'), mk('c')]
    const alloc = allocateLotValue(items, 100, 'equal')
    expect(alloc.get('a')).toBe(33.33)
    expect(alloc.get('b')).toBe(33.33)
    expect(alloc.get('c')).toBe(33.34)
    expect([...alloc.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10)
  })

  it('rateia por peso', () => {
    const items = [mk('a', { weight_g: 30 }), mk('b', { weight_g: 70 })]
    const alloc = allocateLotValue(items, 200, 'weight')
    expect(alloc.get('a')).toBe(60)
    expect(alloc.get('b')).toBe(140)
  })

  it('peça sem peso recebe 0 no modo peso', () => {
    const items = [mk('a', { weight_g: 100 }), mk('b'), mk('c', { weight_g: 100 })]
    const alloc = allocateLotValue(items, 50, 'weight')
    expect(alloc.get('b')).toBe(0)
    expect(alloc.get('a')).toBe(25)
    expect(alloc.get('c')).toBe(25)
  })

  it('sem nenhum peso cadastrado cai em divisão igual', () => {
    const alloc = allocateLotValue([mk('a'), mk('b')], 10, 'weight')
    expect(alloc.get('a')).toBe(5)
    expect(alloc.get('b')).toBe(5)
  })

  it('lote vazio devolve mapa vazio', () => {
    expect(allocateLotValue([], 100, 'equal').size).toBe(0)
  })
})

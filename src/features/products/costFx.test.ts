import { describe, expect, it } from 'vitest'
import { correctedCost } from './costFx'

describe('correctedCost', () => {
  it('usa o US$ pelo câmbio de hoje quando supera o custo pago', () => {
    expect(correctedCost({ cost_price: 500, cost_usd: 100 }, 6)).toBe(600)
  })

  it('mantém o custo pago quando o dólar caiu (nunca reduz)', () => {
    expect(correctedCost({ cost_price: 600, cost_usd: 100 }, 5)).toBe(600)
  })

  it('sem US$ ou sem câmbio de hoje, devolve o custo pago', () => {
    expect(correctedCost({ cost_price: 500, cost_usd: null }, 6)).toBe(500)
    expect(correctedCost({ cost_price: 500, cost_usd: 100 }, null)).toBe(500)
  })

  it('sem custo em R$, usa só o US$ convertido; sem nada, é nulo', () => {
    expect(correctedCost({ cost_price: null, cost_usd: 100 }, 6)).toBe(600)
    expect(correctedCost({ cost_price: null, cost_usd: null }, 6)).toBeNull()
  })
})

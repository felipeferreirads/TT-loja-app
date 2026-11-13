import { describe, expect, it } from 'vitest'
import type { StoreProduct } from '../../../types/db'
import { buildNuvemshopCsv } from './nuvemshop'

/** Cabeçalho do modelo `produtos.csv` baixado da Nuvemshop (13/11/2026). */
const TEMPLATE_HEADER = [
  'Identificador URL', 'Nome', 'Categorias',
  'Nome da variação 1', 'Valor da variação 1', 'Nome da variação 2', 'Valor da variação 2',
  'Nome da variação 3', 'Valor da variação 3',
  'Preço', 'Preço promocional', 'Peso (kg)', 'Altura (cm)', 'Largura (cm)', 'Comprimento (cm)',
  'Estoque', 'SKU', 'Código de barras', 'Exibir na loja', 'Frete gratis', 'Descrição', 'Tags',
  'Título para SEO', 'Descrição para SEO', 'Marca', 'Produto Físico',
  'MPN (Cód. Exclusivo Modelo Fabricante)', 'Sexo', 'Faixa etária', 'Custo', 'Visibilidade',
]

const product = {
  name: 'Quartzo; "bruto"',
  sale_price: 220,
  cost_price: 1.21,
  stock_quantity: 3,
  weight_g: 1500,
  sku: 'M001',
  ecommerce_published: false,
  ecommerce_free_shipping: true,
  ecommerce_description: 'Linha 1\nLinha 2',
} as unknown as StoreProduct

describe('buildNuvemshopCsv', () => {
  const lines = buildNuvemshopCsv([product], 'Tesouros da Terra').split('\r\n')

  it('usa ponto e vírgula e os nomes exatos de coluna do modelo da Nuvemshop', () => {
    expect(lines[0].split(';')).toEqual(TEMPLATE_HEADER)
  })

  it('escapa o separador, aspas e quebras de linha dentro do campo', () => {
    expect(buildNuvemshopCsv([product], 'x')).toContain('"Quartzo; ""bruto"""')
    expect(buildNuvemshopCsv([product], 'x')).toContain('"Linha 1\nLinha 2"')
  })

  it('preenche peso em kg, frete e visibilidade', () => {
    const csv = buildNuvemshopCsv([product], 'x')
    expect(csv).toContain(';1.500;')
    expect(csv).toMatch(/;Oculto$/)
    expect(buildNuvemshopCsv([{ ...product, ecommerce_published: true }], 'x')).toMatch(/;Visível$/)
  })
})

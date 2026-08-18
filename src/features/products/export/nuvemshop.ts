import type { StoreProduct } from '../../../types/db'
import { buildRow, toCsv } from './csv'
import { slugify, csvNumber } from './shared'

// Colunas da planilha de carga em massa da Nuvemshop, na ordem exigida —
// ver docs em atendimento.nuvemshop.com.br (link no pedido original).
const HEADERS = [
  'Identificador URL',
  'Nome',
  'Categorias',
  'Nome da Variação 1',
  'Valor da Variação 1',
  'Nome da Variação 2',
  'Valor da Variação 2',
  'Nome da Variação 3',
  'Valor da Variação 3',
  'Preço',
  'Preço Promocional',
  'Peso',
  'Altura',
  'Largura',
  'Comprimento',
  'Estoque',
  'SKU',
  'Código de Barras',
  'Exibir na Loja',
  'Frete Grátis',
  'Descrição',
  'Tags',
  'Título para SEO',
  'Descrição para SEO',
  'Marca',
  'Produto Físico',
  'MPN',
  'Sexo',
  'Faixa Etária',
  'Custo',
]

/**
 * Sexo, Faixa Etária, MPN e Código de Barras ficam sempre em branco — não
 * fazem sentido pra peça natural única (sem fabricante, sem GTIN). Condição
 * (novo/usado) nem existe como coluna própria: a planilha não tem esse
 * campo, só "Produto Físico" (sempre "SIM" aqui).
 */
export function buildNuvemshopCsv(products: StoreProduct[], brand: string): string {
  const rows = products.map((p) =>
    buildRow(HEADERS, {
      'Identificador URL': p.ecommerce_slug || slugify(p.name),
      Nome: p.name,
      Categorias: p.ecommerce_category_path ?? '',
      Preço: csvNumber(p.sale_price),
      Peso: p.weight_g != null ? (p.weight_g / 1000).toFixed(3) : '',
      Altura: csvNumber(p.ecommerce_package_height_cm, 1),
      Largura: csvNumber(p.ecommerce_package_width_cm, 1),
      Comprimento: csvNumber(p.ecommerce_package_length_cm, 1),
      Estoque: String(p.stock_quantity),
      SKU: p.sku ?? '',
      'Exibir na Loja': p.ecommerce_published ? 'SIM' : 'NÃO',
      'Frete Grátis': p.ecommerce_free_shipping ? 'SIM' : 'NÃO',
      Descrição: p.ecommerce_description ?? '',
      Tags: p.ecommerce_tags ?? '',
      'Título para SEO': p.ecommerce_seo_title ?? '',
      'Descrição para SEO': p.ecommerce_seo_description ?? '',
      Marca: brand,
      'Produto Físico': 'SIM',
      Custo: csvNumber(p.cost_price),
    }),
  )
  return toCsv(HEADERS, rows)
}

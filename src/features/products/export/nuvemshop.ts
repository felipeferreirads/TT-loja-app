import type { StoreProduct } from '../../../types/db'
import { buildRow, toCsv } from './csv'
import { slugify, csvNumber } from './shared'

// Colunas da planilha de carga em massa da Nuvemshop, na ordem e com os
// nomes EXATOS do modelo atual exportado pela própria loja (conferido em
// 13/11/2026 contra um `produtos.csv` baixado da Nuvemshop): separador `;`,
// nomes com unidade ("Peso (kg)", "Altura (cm)") e a coluna final
// "Visibilidade". O modelo NÃO tem colunas fiscais (NCM, origem, tipo,
// CEST) — esses dados vivem só no app e são preenchidos na loja à mão.
const HEADERS = [
  'Identificador URL',
  'Nome',
  'Categorias',
  'Nome da variação 1',
  'Valor da variação 1',
  'Nome da variação 2',
  'Valor da variação 2',
  'Nome da variação 3',
  'Valor da variação 3',
  'Preço',
  'Preço promocional',
  'Peso (kg)',
  'Altura (cm)',
  'Largura (cm)',
  'Comprimento (cm)',
  'Estoque',
  'SKU',
  'Código de barras',
  'Exibir na loja',
  'Frete gratis',
  'Descrição',
  'Tags',
  'Título para SEO',
  'Descrição para SEO',
  'Marca',
  'Produto Físico',
  'MPN (Cód. Exclusivo Modelo Fabricante)',
  'Sexo',
  'Faixa etária',
  'Custo',
  'Visibilidade',
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
      'Peso (kg)': p.weight_g != null ? (p.weight_g / 1000).toFixed(3) : '',
      'Altura (cm)': csvNumber(p.ecommerce_package_height_cm, 1),
      'Largura (cm)': csvNumber(p.ecommerce_package_width_cm, 1),
      'Comprimento (cm)': csvNumber(p.ecommerce_package_length_cm, 1),
      Estoque: String(p.stock_quantity),
      SKU: p.sku ?? '',
      'Exibir na loja': p.ecommerce_published ? 'SIM' : 'NÃO',
      'Frete gratis': p.ecommerce_free_shipping ? 'SIM' : 'NÃO',
      Descrição: p.ecommerce_description ?? '',
      Tags: p.ecommerce_tags ?? '',
      'Título para SEO': p.ecommerce_seo_title ?? '',
      'Descrição para SEO': p.ecommerce_seo_description ?? '',
      Marca: brand,
      'Produto Físico': 'SIM',
      Custo: csvNumber(p.cost_price),
      Visibilidade: p.ecommerce_published ? 'Visível' : 'Oculto',
    }),
  )
  return toCsv(HEADERS, rows, ';')
}

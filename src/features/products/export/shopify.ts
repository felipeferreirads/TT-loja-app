import type { StoreProduct } from '../../../types/db'
import { buildRow, toCsv } from './csv'
import { slugify, csvNumber } from './shared'

// Colunas do CSV de produtos da Shopify, na ordem do template oficial — ver
// help.shopify.com/manual/products/import-export (link no pedido original).
// Produtos sem variação usam só a primeira linha; linhas extras por produto
// (mesmo Handle) servem só pra fotos adicionais, como no formato real deles.
const HEADERS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Product Category',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option2 Name',
  'Option2 Value',
  'Option3 Name',
  'Option3 Value',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Variant Barcode',
  'Image Src',
  'Image Position',
  'Image Alt Text',
  'Gift Card',
  'SEO Title',
  'SEO Description',
  'Google Shopping / Google Product Category',
  'Google Shopping / Gender',
  'Google Shopping / Age Group',
  'Google Shopping / MPN',
  'Google Shopping / AdWords Grouping',
  'Google Shopping / AdWords Labels',
  'Google Shopping / Condition',
  'Google Shopping / Custom Product',
  'Google Shopping / Custom Label 0',
  'Google Shopping / Custom Label 1',
  'Google Shopping / Custom Label 2',
  'Google Shopping / Custom Label 3',
  'Google Shopping / Custom Label 4',
  'Variant Image',
  'Variant Weight Unit',
  'Variant Tax Code',
  'Cost per item',
  'Status',
]

/** Parágrafos separados por linha em branco viram `<p>`; quebra de linha simples vira `<br>`. */
function textToHtml(text: string): string {
  if (!text.trim()) return ''
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/**
 * `mediaByProduct`: URLs assinadas (válidas por dias, não horas — a Shopify
 * baixa as imagens durante a importação, que pode não ser imediata) das fotos
 * de cada produto, já na ordem de exibição. Gênero, Faixa Etária, MPN e
 * Código de Barras ficam em branco (peça natural única, sem fabricante).
 * Condição sai sempre "new" — não existe campo de novo/usado no app.
 */
export function buildShopifyCsv(
  products: StoreProduct[],
  brand: string,
  mediaByProduct: Record<string, string[]>,
): string {
  const rows: string[][] = []

  for (const p of products) {
    const handle = p.ecommerce_slug || slugify(p.name)
    const images = mediaByProduct[p.id] ?? []
    const published = p.ecommerce_published ? 'true' : 'false'
    const status = p.ecommerce_published ? 'active' : 'draft'

    rows.push(
      buildRow(HEADERS, {
        Handle: handle,
        Title: p.name,
        'Body (HTML)': textToHtml(p.ecommerce_description ?? ''),
        Vendor: brand,
        'Product Category': p.ecommerce_google_category ?? '',
        Type: p.ecommerce_category_path ?? '',
        Tags: p.ecommerce_tags ?? '',
        Published: published,
        'Variant SKU': p.sku ?? '',
        'Variant Grams': p.weight_g != null ? String(Math.round(p.weight_g)) : '0',
        'Variant Inventory Tracker': 'shopify',
        'Variant Inventory Qty': String(p.stock_quantity),
        'Variant Inventory Policy': 'deny',
        'Variant Fulfillment Service': 'manual',
        'Variant Price': csvNumber(p.sale_price),
        'Variant Requires Shipping': 'true',
        'Variant Taxable': 'true',
        'Image Src': images[0] ?? '',
        'Image Position': images[0] ? '1' : '',
        'Image Alt Text': images[0] ? p.name : '',
        'Gift Card': 'false',
        'SEO Title': p.ecommerce_seo_title ?? '',
        'SEO Description': p.ecommerce_seo_description ?? '',
        'Google Shopping / Google Product Category': p.ecommerce_google_category ?? '',
        'Google Shopping / Condition': 'new',
        'Variant Weight Unit': 'g',
        'Cost per item': csvNumber(p.cost_price),
        Status: status,
      }),
    )

    for (let i = 1; i < images.length; i++) {
      rows.push(
        buildRow(HEADERS, {
          Handle: handle,
          'Image Src': images[i],
          'Image Position': String(i + 1),
          'Image Alt Text': p.name,
        }),
      )
    }
  }

  return toCsv(HEADERS, rows)
}

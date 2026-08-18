/** Handle/identificador de URL usado como fallback quando o produto não tem
 *  `ecommerce_slug` preenchido — igual nas duas plataformas. */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Número no formato que as duas planilhas esperam: ponto decimal, sem separador de milhar. */
export function csvNumber(value: number | null | undefined, decimals = 2): string {
  return value == null ? '' : value.toFixed(decimals)
}

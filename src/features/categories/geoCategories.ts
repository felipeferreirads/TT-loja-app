import type { StoreProduct } from '../../types/db'
import { countryName, NWA_CODE } from '../../lib/format'
import { CONTINENTS, COUNTRY_CONTINENT, type ContinentKey } from '../../lib/geoContinents'

// Árvore de localização (Categorias → "Distribuição Geográfica") — 100%
// virtual, computada a partir de `origin_country` sobre o cache de produtos.
// Mesma regra do catálogo pessoal (features/categories/geoCategories.ts); os
// dados de continente moram em lib/geoContinents.ts, compartilhado.

export { CONTINENTS, COUNTRY_CONTINENT, countCountries, countryTotal, type ContinentKey } from '../../lib/geoContinents'

export interface GeoCountryNode {
  code: string
  items: StoreProduct[]
}

export interface GeoContinentNode {
  key: ContinentKey
  label: string
  icon: string
  countries: GeoCountryNode[]
  itemCount: number
}

/** Agrupa os produtos por país reconhecido → continente; só entra o que tem pelo menos 1 item. */
export function buildGeoTree(products: StoreProduct[]): GeoContinentNode[] {
  const byCountry = new Map<string, StoreProduct[]>()
  for (const p of products) {
    const code = p.origin_country?.toUpperCase()
    if (!code || !COUNTRY_CONTINENT[code]) continue
    if (!byCountry.has(code)) byCountry.set(code, [])
    byCountry.get(code)!.push(p)
  }
  return CONTINENTS.map((c) => {
    const countries = [...byCountry.entries()]
      .filter(([code]) => COUNTRY_CONTINENT[code] === c.key)
      .map(([code, items]) => ({ code, items }))
      // NWA (meteoritos sem país confirmado) sempre por último.
      .sort((a, b) => {
        if (a.code === NWA_CODE) return 1
        if (b.code === NWA_CODE) return -1
        return countryName(a.code).localeCompare(countryName(b.code), 'pt-BR')
      })
    return { ...c, countries, itemCount: countries.reduce((n, cc) => n + cc.items.length, 0) }
  }).filter((c) => c.countries.length > 0)
}

/** Total de produtos com país reconhecido (contagem do cartão da categoria). */
export function countGeoItems(products: StoreProduct[]): number {
  return buildGeoTree(products).reduce((n, c) => n + c.itemCount, 0)
}

// Núcleo PURO de leitura de QR para produtos — adaptado de
// src/features/specimens/datasheet/qr.ts do catálogo pessoal (claude.md §2).
// Diferente de lá: aqui não existe geração de folha de QR/código curto por
// tipo (a loja não tem `code_global`/`code_type_seq`), então este arquivo só
// cobre a metade de LEITURA — normalizar um valor escaneado e resolvê-lo
// contra a lista de produtos já carregada (cache local, sem ida ao servidor).

import type { StoreProduct } from '../../types/db'

/** Remove o prefixo decorativo do código, se houver ("#ABC123" → "ABC123"). */
function stripCodePrefix(code: string): string {
  return code.replace(/^[^0-9A-Za-z]+/, '')
}

/**
 * Normaliza um texto lido pelo leitor (ou digitado à mão) para comparação:
 * maiúsculas, sem espaço nas pontas e sem prefixo decorativo. Assim
 * "#abc123", "ABC123" e " abc123 " casam com o mesmo produto.
 */
export function normalizeScannedValue(value: string): string {
  return stripCodePrefix(value.trim().toUpperCase())
}

/** Formato canônico de UUID (8-4-4-4-12 hex), já normalizado (maiúsculas). Usado para
 * distinguir uma etiqueta "reservada" (uuid gerado no cliente, sem produto ainda) de um
 * SKU digitado errado. */
const UUID_SHAPE = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/

export function isUuidLike(value: string): boolean {
  return UUID_SHAPE.test(value)
}

/**
 * Acha na lista de produtos já carregada o produto correspondente a um valor
 * lido/digitado: pelo `id`, pelo `sku` ou por uma etiqueta QR "alias"
 * (`qr_aliases`, ver `store_product_qr_aliases`). Resolução 100% local — a
 * lista de produtos já está em memória (`['products']`), sem round-trip por
 * leitura.
 */
export function resolveScannedValue(products: StoreProduct[], value: string): StoreProduct | null {
  const needle = normalizeScannedValue(value)
  if (!needle) return null
  for (const p of products) {
    if (p.id.toUpperCase() === needle) return p
    if (p.sku && normalizeScannedValue(p.sku) === needle) return p
    if (p.qr_aliases?.some((a) => a.id.toUpperCase() === needle)) return p
  }
  return null
}

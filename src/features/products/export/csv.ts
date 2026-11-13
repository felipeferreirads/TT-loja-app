const BOM = '﻿'

function escapeCsvField(value: string, delimiter: string): string {
  if (value.includes(delimiter) || /["\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** Monta uma linha na ordem dos headers a partir de um objeto {header: valor} —
 *  evita erro de índice nas planilhas com dezenas de colunas posicionais. */
export function buildRow(headers: string[], values: Record<string, string>): string[] {
  return headers.map((h) => values[h] ?? '')
}

/** `delimiter` padrão é vírgula (Shopify); a planilha da Nuvemshop usa ponto e vírgula. */
export function toCsv(headers: string[], rows: string[][], delimiter = ','): string {
  return [headers, ...rows].map((row) => row.map((v) => escapeCsvField(v, delimiter)).join(delimiter)).join('\r\n')
}

/** BOM UTF-8 na frente do conteúdo — evita acentuação quebrada ao abrir a planilha no Excel. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

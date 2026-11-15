import qrcode from 'qrcode-generator'

/**
 * QR code como path SVG vetorial (um retângulo por módulo escuro), mesma
 * biblioteca do catálogo pessoal (`datasheet/qr.ts`). Correção de erro 'M':
 * aguenta etiqueta um pouco gasta sem engrossar demais o código.
 */
export function qrSvgPath(text: string): { size: number; path: string } {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  let path = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`
    }
  }
  return { size: n, path }
}

// Copia os módulos wasm do pdfjs-dist (decodificadores JBIG2/OpenJPEG/qcms)
// para public/pdfjs-wasm/, servidos como asset estático. Sem isso, PDFs com
// imagens JPEG2000 renderizam em branco. Mesmo script do catálogo pessoal.
// Roda no `postinstall`; public/pdfjs-wasm/ não é versionado.
import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(root, 'node_modules', 'pdfjs-dist', 'wasm')
const dest = join(root, 'public', 'pdfjs-wasm')

if (!existsSync(src)) {
  console.error(`Não achei ${src} — pdfjs-dist instalado?`)
  process.exit(1)
}
mkdirSync(dest, { recursive: true })
let count = 0
for (const name of readdirSync(src)) {
  copyFileSync(join(src, name), join(dest, name))
  count++
}
console.log(`${count} arquivo(s) copiado(s) de pdfjs-dist/wasm para public/pdfjs-wasm/.`)

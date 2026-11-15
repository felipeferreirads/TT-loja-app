import { useEffect, useRef, useState } from 'react'
import type { StoreProduct } from '../../../types/db'
import { countryName, formatMoney } from '../../../lib/format'
import { fetchCompany } from '../../company/api'
import { CloseIcon, DownloadIcon, ShareIcon } from '../../../components/icons'
import { FilterPill } from '../../../components/ListToolbar'
import { speciesOf } from '../list/columns'
import { useToast } from '../../../components/ToastProvider'

/**
 * Cartão para redes sociais — PNG com foto, nome, espécie, origem e preço.
 * Mesma ideia do cartão da ficha no catálogo pessoal (`social/`), mas
 * desenhado direto em canvas (sem react-pdf/pdfjs, que a loja não carrega) e
 * com o preço, que é o que interessa numa postagem de venda.
 */

type Format = 'square' | 'portrait' | 'story'
const FORMATS: Record<Format, { label: string; w: number; h: number }> = {
  square: { label: 'Quadrado', w: 1080, h: 1080 },
  portrait: { label: 'Retrato', w: 1080, h: 1350 },
  story: { label: 'Story', w: 1080, h: 1920 },
}
type Theme = 'dark' | 'light'
const THEMES: Record<Theme, { bg: string; text: string; muted: string; accent: string; photoBg: string }> = {
  dark: { bg: '#141210', text: '#f5f5f4', muted: '#a8a29e', accent: '#f59e0b', photoBg: '#1c1917' },
  light: { bg: '#faf7f2', text: '#1c1917', muted: '#57534e', accent: '#b45309', photoBg: '#ede8df' },
}

interface Options {
  format: Format
  theme: Theme
  price: boolean
  origin: boolean
  species: boolean
  weight: boolean
}

async function loadBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(url, { cache: 'reload' })
    if (!res.ok) return null
    return await createImageBitmap(await res.blob())
  } catch {
    return null // Sem CORS liberado no armazenamento: o cartão sai sem a foto.
  }
}

async function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo.svg'
  })
}

/** Quebra o texto em linhas que cabem em `maxWidth`, no máximo `maxLines` (com reticências). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width <= maxWidth || !line) line = test
    else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last}…`
  return kept
}

async function drawCard(
  canvas: HTMLCanvasElement,
  p: StoreProduct,
  o: Options,
  photo: ImageBitmap | null,
  logo: HTMLImageElement | null,
  brand: string,
) {
  const { w, h } = FORMATS[o.format]
  const t = THEMES[o.theme]
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const pad = 72
  ctx.fillStyle = t.bg
  ctx.fillRect(0, 0, w, h)

  // Foto no topo, recortada para preencher a área (object-fit: cover).
  const photoH = Math.round(h * (o.format === 'square' ? 0.62 : o.format === 'portrait' ? 0.64 : 0.6))
  ctx.fillStyle = t.photoBg
  ctx.fillRect(0, 0, w, photoH)
  if (photo) {
    const scale = Math.max(w / photo.width, photoH / photo.height)
    const dw = photo.width * scale
    const dh = photo.height * scale
    ctx.drawImage(photo, (w - dw) / 2, (photoH - dh) / 2, dw, dh)
  }

  let y = photoH + pad
  const maxW = w - pad * 2
  const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

  ctx.textBaseline = 'top'
  ctx.fillStyle = t.text
  ctx.font = `700 64px ${sans}`
  for (const line of wrap(ctx, p.name, maxW, 2)) {
    ctx.fillText(line, pad, y)
    y += 76
  }

  const species = speciesOf(p)
  if (o.species && species && species !== p.name) {
    ctx.fillStyle = t.muted
    ctx.font = `italic 400 40px ${sans}`
    ctx.fillText(wrap(ctx, species, maxW, 1)[0], pad, y + 4)
    y += 56
  }

  const origin = p.origin_short || [p.origin, p.origin_country ? countryName(p.origin_country) : ''].filter(Boolean).join(', ')
  if (o.origin && origin) {
    ctx.fillStyle = t.muted
    ctx.font = `400 36px ${sans}`
    for (const line of wrap(ctx, origin, maxW, 2)) {
      ctx.fillText(line, pad, y + 6)
      y += 46
    }
  }
  if (o.weight && p.weight_g != null) {
    ctx.fillStyle = t.muted
    ctx.font = `400 36px ${sans}`
    ctx.fillText(`${p.weight_g.toLocaleString('pt-BR')} g${p.dimensions ? ` · ${p.dimensions} mm` : ''}`, pad, y + 6)
    y += 46
  }

  // Rodapé: preço à esquerda, marca à direita.
  const footerY = h - pad
  ctx.textBaseline = 'alphabetic'
  if (o.price) {
    ctx.fillStyle = t.accent
    ctx.font = `800 84px ${sans}`
    ctx.fillText(formatMoney(p.sale_price), pad, footerY)
  }
  const logoH = 72
  let right = w - pad
  if (brand) {
    ctx.fillStyle = t.muted
    ctx.font = `500 30px ${sans}`
    const bw = ctx.measureText(brand).width
    ctx.fillText(brand, right - bw, footerY - 4)
    right -= bw + 20
  }
  if (logo) {
    const lw = (logo.naturalWidth / logo.naturalHeight || 1) * logoH
    ctx.save()
    // A logo é branca: no tema claro, inverte (mesmo truque do `.app-logo-themed`).
    if (o.theme === 'light') ctx.filter = 'invert(1)'
    ctx.drawImage(logo, right - lw, footerY - logoH + 8, lw, logoH)
    ctx.restore()
  }
}

export function SocialCardDialog({ product, coverUrl, onClose }: { product: StoreProduct; coverUrl?: string; onClose: () => void }) {
  const toast = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [opts, setOpts] = useState<Options>({ format: 'portrait', theme: 'dark', price: true, origin: true, species: true, weight: false })
  const [assets, setAssets] = useState<{ photo: ImageBitmap | null; logo: HTMLImageElement | null; brand: string } | null>(null)

  useEffect(() => {
    let alive = true
    void Promise.all([coverUrl ? loadBitmap(coverUrl) : Promise.resolve(null), loadLogo(), fetchCompany().catch(() => null)]).then(
      ([photo, logo, company]) => {
        if (!alive) return
        setAssets({ photo, logo, brand: company?.trade_name || company?.legal_name || '' })
        if (coverUrl && !photo) toast.error('Não foi possível carregar a foto. O cartão foi gerado sem ela.')
      },
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverUrl])

  useEffect(() => {
    if (assets && canvasRef.current) void drawCard(canvasRef.current, product, opts, assets.photo, assets.logo, assets.brand)
  }, [assets, opts, product])

  const fileName = `${(product.sku || product.name).replace(/[^\p{L}\p{N}-]+/gu, '-').toLowerCase()}-cartao.png`
  const toBlob = () => new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob(resolve, 'image/png'))

  const download = async () => {
    const blob = await toBlob()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  const file = async () => {
    const blob = await toBlob()
    return blob ? new File([blob], fileName, { type: 'image/png' }) : null
  }
  const canShare = typeof navigator !== 'undefined' && 'canShare' in navigator
  const share = async () => {
    const f = await file()
    if (!f) return
    try {
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: product.name })
      else await download()
    } catch {
      /* compartilhamento cancelado */
    }
  }
  const set = (patch: Partial<Options>) => setOpts((o) => ({ ...o, ...patch }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-title"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-xl bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-800 p-5 pb-4">
          <div className="min-w-0">
            <h2 id="social-title" className="text-lg font-bold text-stone-100">
              Cartão para redes sociais
            </h2>
            <p className="mt-1 truncate text-xs text-stone-500">{product.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="tap-icon text-stone-400 hover:text-stone-200">
            <CloseIcon />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-5 sm:grid-cols-[1fr_15rem]">
          <div className="flex items-center justify-center rounded-lg bg-stone-950 p-3">
            {assets ? (
              <canvas ref={canvasRef} className="max-h-[60dvh] w-auto max-w-full rounded shadow-lg" />
            ) : (
              <p className="py-16 text-sm text-stone-500">Preparando o cartão…</p>
            )}
          </div>
          <div className="space-y-4">
            <OptionRow label="Formato">
              {(Object.keys(FORMATS) as Format[]).map((f) => (
                <FilterPill key={f} active={opts.format === f} onClick={() => set({ format: f })}>
                  {FORMATS[f].label}
                </FilterPill>
              ))}
            </OptionRow>
            <OptionRow label="Tema">
              <FilterPill active={opts.theme === 'dark'} onClick={() => set({ theme: 'dark' })}>
                Escuro
              </FilterPill>
              <FilterPill active={opts.theme === 'light'} onClick={() => set({ theme: 'light' })}>
                Claro
              </FilterPill>
            </OptionRow>
            <OptionRow label="Mostrar">
              <FilterPill active={opts.price} onClick={() => set({ price: !opts.price })}>
                Preço
              </FilterPill>
              <FilterPill active={opts.species} onClick={() => set({ species: !opts.species })}>
                Espécie
              </FilterPill>
              <FilterPill active={opts.origin} onClick={() => set({ origin: !opts.origin })}>
                Origem
              </FilterPill>
              <FilterPill active={opts.weight} onClick={() => set({ weight: !opts.weight })}>
                Peso e medidas
              </FilterPill>
            </OptionRow>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-800 p-4">
          {canShare && (
            <button type="button" onClick={() => void share()} disabled={!assets} className="btn-secondary gap-1.5">
              <ShareIcon />
              Compartilhar
            </button>
          )}
          <button type="button" onClick={() => void download()} disabled={!assets} className="btn-primary gap-1.5">
            <DownloadIcon />
            Baixar imagem
          </button>
        </div>
      </div>
    </div>
  )
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-stone-400">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

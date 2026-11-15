import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { StoreProduct } from '../../../types/db'
import { countryName, formatMoney } from '../../../lib/format'
import { qrSvgPath } from '../../../lib/qrSvg'
import { CloseIcon, PrinterIcon } from '../../../components/icons'
import { FilterPill } from '../../../components/ListToolbar'
import { speciesOf } from '../list/columns'

/**
 * Etiquetas de preço com QR — folha A4 para imprimir (ou salvar em PDF pelo
 * diálogo de impressão do navegador). O QR leva o id do produto, o mesmo que
 * o leitor da loja (`ScanPage`) e o do catálogo pessoal resolvem — um item
 * importado da coleção mantém o mesmo id, então a etiqueta vale nos dois apps.
 */

type LabelSize = 'small' | 'medium' | 'large'
const SIZES: Record<LabelSize, { label: string; w: number; h: number; qr: number }> = {
  small: { label: '50 × 30 mm', w: 50, h: 30, qr: 20 },
  medium: { label: '70 × 40 mm', w: 70, h: 40, qr: 26 },
  large: { label: '90 × 55 mm', w: 90, h: 55, qr: 34 },
}

type FieldKey = 'species' | 'origin' | 'sku' | 'price' | 'qr' | 'weight'
const FIELD_LABELS: Record<FieldKey, string> = {
  price: 'Preço',
  qr: 'QR code',
  sku: 'SKU',
  species: 'Espécie',
  origin: 'Origem',
  weight: 'Peso',
}
const PREFS_KEY = 'tt_loja_label_prefs'

interface Prefs {
  size: LabelSize
  fields: FieldKey[]
  copies: number
}
function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null') as Partial<Prefs> | null
    if (p && p.size && SIZES[p.size] && Array.isArray(p.fields)) return { size: p.size, fields: p.fields, copies: Math.max(1, Math.min(20, p.copies ?? 1)) }
  } catch {
    /* padrão */
  }
  return { size: 'medium', fields: ['price', 'qr', 'sku', 'species', 'origin'], copies: 1 }
}

export function LabelsDialog({ products, onClose }: { products: StoreProduct[]; onClose: () => void }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next))
    } catch {
      /* só não persiste */
    }
  }
  const toggleField = (f: FieldKey) => update({ fields: prefs.fields.includes(f) ? prefs.fields.filter((x) => x !== f) : [...prefs.fields, f] })
  const size = SIZES[prefs.size]
  const has = (f: FieldKey) => prefs.fields.includes(f)
  const labels = useMemo(() => products.flatMap((p) => Array.from({ length: prefs.copies }, () => p)), [products, prefs.copies])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="labels-title"
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col rounded-xl bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-800 p-5 pb-4">
          <div>
            <h2 id="labels-title" className="text-lg font-bold text-stone-100">
              Etiquetas de preço
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {products.length} {products.length === 1 ? 'produto' : 'produtos'}. Para gerar um PDF, escolha "Salvar como PDF" na janela de impressão.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="tap-icon text-stone-400 hover:text-stone-200">
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-3 border-b border-stone-800 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-24 text-xs font-medium text-stone-400">Tamanho</span>
            {(Object.keys(SIZES) as LabelSize[]).map((s) => (
              <FilterPill key={s} active={prefs.size === s} onClick={() => update({ size: s })}>
                {SIZES[s].label}
              </FilterPill>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-24 text-xs font-medium text-stone-400">Conteúdo</span>
            {(Object.keys(FIELD_LABELS) as FieldKey[]).map((f) => (
              <FilterPill key={f} active={has(f)} onClick={() => toggleField(f)}>
                {FIELD_LABELS[f]}
              </FilterPill>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-24 text-xs font-medium text-stone-400">Cópias</span>
            <input
              type="number"
              min={1}
              max={20}
              value={prefs.copies}
              onChange={(e) => update({ copies: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
              className="input min-h-9 w-20 py-1"
              aria-label="Cópias de cada etiqueta"
            />
            <span className="text-xs text-stone-500">por produto</span>
          </div>
        </div>

        {/* Prévia em fundo claro, já na escala real (mm). Também é a área impressa. */}
        <div className="min-h-0 flex-1 overflow-auto bg-stone-800/40 p-4">
          <div className="mx-auto flex flex-wrap content-start gap-[2mm] bg-white p-[6mm] text-black" style={{ width: '210mm' }}>
            {labels.map((p, i) => (
              <Label key={`${p.id}-${i}`} product={p} size={size} has={has} />
            ))}
          </div>
        </div>
        {/* Cópia só para impressão, fora do diálogo (ver `#labels-print-area` em index.css). */}
        {createPortal(
          <div id="labels-print-area" className="hidden flex-wrap content-start gap-[2mm] bg-white text-black print:flex">
            {labels.map((p, i) => (
              <Label key={`${p.id}-${i}`} product={p} size={size} has={has} />
            ))}
          </div>,
          document.body,
        )}

        <div className="flex justify-end gap-2 border-t border-stone-800 p-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Fechar
          </button>
          <button type="button" onClick={() => window.print()} className="btn-primary gap-1.5">
            <PrinterIcon />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

function Label({ product: p, size, has }: { product: StoreProduct; size: (typeof SIZES)[LabelSize]; has: (f: FieldKey) => boolean }) {
  const qr = useMemo(() => (has('qr') ? qrSvgPath(p.id) : null), [p.id, has])
  const species = speciesOf(p)
  const origin = p.origin_short || [p.origin, p.origin_country ? countryName(p.origin_country) : ''].filter(Boolean).join(', ')
  return (
    <div
      className="flex overflow-hidden rounded-[1mm] border border-dashed border-stone-400 bg-white"
      style={{ width: `${size.w}mm`, height: `${size.h}mm`, padding: '2mm', gap: '2mm', breakInside: 'avoid' }}
    >
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: '0.8mm' }}>
        <span className="line-clamp-2 leading-tight font-semibold" style={{ fontSize: size.h >= 50 ? '11pt' : '8.5pt' }}>
          {p.name}
        </span>
        {has('species') && species && species !== p.name && (
          <span className="truncate italic" style={{ fontSize: '7pt' }}>
            {species}
          </span>
        )}
        {has('origin') && origin && (
          <span className="line-clamp-2 leading-tight" style={{ fontSize: '6.5pt' }}>
            {origin}
          </span>
        )}
        {has('weight') && p.weight_g != null && <span style={{ fontSize: '6.5pt' }}>{p.weight_g.toLocaleString('pt-BR')} g</span>}
        <span className="mt-auto flex items-end justify-between" style={{ gap: '1mm' }}>
          {has('price') && (
            <span className="font-bold" style={{ fontSize: size.h >= 50 ? '14pt' : '11pt' }}>
              {formatMoney(p.sale_price)}
            </span>
          )}
          {has('sku') && p.sku && (
            <span className="font-mono" style={{ fontSize: '6pt' }}>
              {p.sku}
            </span>
          )}
        </span>
      </div>
      {qr && (
        <svg viewBox={`-1 -1 ${qr.size + 2} ${qr.size + 2}`} style={{ width: `${size.qr}mm`, height: `${size.qr}mm`, flexShrink: 0, alignSelf: 'center' }} shapeRendering="crispEdges">
          <path d={qr.path} fill="#000" />
        </svg>
      )}
    </div>
  )
}

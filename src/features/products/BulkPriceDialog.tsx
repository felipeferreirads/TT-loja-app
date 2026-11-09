import { useMemo, useState } from 'react'
import type { StoreProduct } from '../../types/db'
import { formatMoney } from '../../lib/format'
import { CloseIcon } from '../../components/icons'
import { updateProduct } from './api'

type Mode = 'set' | 'percent'

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * "Alterar preço" em massa: define um valor único OU aplica um percentual
 * (+/−) sobre o preço atual de cada produto. Mostra uma prévia do primeiro
 * item antes de gravar. Cada produto é atualizado individualmente (o novo
 * preço depende do atual quando o modo é percentual).
 */
export function BulkPriceDialog({
  products,
  onClose,
  onDone,
}: {
  products: StoreProduct[]
  onClose: () => void
  onDone: () => void
}) {
  const [mode, setMode] = useState<Mode>('percent')
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const value = Number(raw.replace(',', '.'))
  const valid = raw.trim() !== '' && Number.isFinite(value) && (mode === 'percent' ? value > -100 : value >= 0)

  const next = useMemo(() => {
    return (p: StoreProduct) => (mode === 'set' ? round2(value) : round2(p.sale_price * (1 + value / 100)))
  }, [mode, value])

  const apply = async () => {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await Promise.all(products.map((p) => updateProduct(p.id, { sale_price: next(p) })))
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao alterar o preço.')
      setBusy(false)
    }
  }

  const sample = products[0]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-stone-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-100">
            Alterar preço de {products.length} {products.length === 1 ? 'item' : 'itens'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="tap-icon">
            <CloseIcon />
          </button>
        </div>

        <div className="flex overflow-hidden rounded-full bg-stone-800 text-sm">
          {(
            [
              ['percent', 'Reajustar em %'],
              ['set', 'Definir valor'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 px-3 py-2 transition ${mode === m ? 'bg-amber-600 text-white' : 'text-stone-300 hover:bg-stone-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-xs text-stone-400">
            {mode === 'percent' ? 'Percentual (use − para reduzir, ex.: -10)' : 'Novo preço de venda (R$)'}
          </span>
          <input
            autoFocus
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void apply()}
            placeholder={mode === 'percent' ? '10' : '0,00'}
            className="input mt-1"
          />
        </label>

        {valid && sample && (
          <p className="text-sm text-stone-400">
            Ex.: <span className="text-stone-200">{sample.name}</span> — {formatMoney(sample.sale_price)} →{' '}
            <span className="font-medium text-amber-400">{formatMoney(next(sample))}</span>
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={() => void apply()} disabled={!valid || busy} className="btn-primary disabled:opacity-40">
            {busy ? 'Aplicando…' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import type { StoreProduct } from '../../types/db'
import { createProduct } from './api'
import { generateLotSuffixes, type LotSuffixMode } from './lots'
import { fetchSkuPrefixes, suggestSku } from './skuPrefixes'
import { CloseIcon } from '../../components/icons'

/**
 * Cria N peças de uma vez ("dividir o lote") — versão enxuta de
 * `SplitLotDialog.tsx` do catálogo pessoal, sem o fluxo de foto em massa
 * (drag/merge/split) de lá: a loja não tem esse recurso hoje e não foi
 * pedido aqui. Cada peça nasce com sufixo sequencial (`generateLotSuffixes`)
 * e um nome provisório "{lote} (peça N)" — `name` é obrigatório no schema,
 * diferente do catálogo pessoal onde a peça podia nascer sem nome; o dono
 * renomeia depois, na ficha de cada peça.
 */
export function SplitLotDialog({
  lot,
  items,
  onClose,
  onDone,
}: {
  lot: StoreProduct
  items: StoreProduct[]
  onClose: () => void
  onDone: () => void
}) {
  const [count, setCount] = useState('6')
  const [suffixMode, setSuffixMode] = useState<LotSuffixMode>('numeric')
  const [inheritOrigin, setInheritOrigin] = useState(true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const n = Math.min(200, Math.max(0, Math.trunc(Number(count) || 0)))
  const suffixes = useMemo(() => generateLotSuffixes(items, Math.max(n, 1), suffixMode), [items, n, suffixMode])

  const run = async () => {
    if (n <= 0) return
    setBusy(true)
    setError(null)
    try {
      // Mesmo autofill de SKU do formulário normal (tipo → prefixo → próximo
      // número) — sequencial de propósito: cada `suggestSku` olha o maior SKU
      // já gravado, então precisa da peça anterior já persistida.
      const prefixes = await fetchSkuPrefixes().catch(() => [])
      for (let i = 0; i < n; i++) {
        const sku = await suggestSku(lot.kind, null, false, prefixes).catch(() => null)
        await createProduct({
          name: `${lot.name} (peça ${suffixes[i]})`,
          kind: lot.kind,
          sku,
          parent_id: lot.id,
          lot_suffix: suffixes[i],
          stock_quantity: 1,
          sale_price: 0,
          origin_country: inheritOrigin ? lot.origin_country : null,
          origin_state: inheritOrigin ? lot.origin_state : null,
          origin: inheritOrigin ? lot.origin : null,
        })
        setDone(i + 1)
      }
      onDone()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar as peças.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-xl bg-stone-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-100">Dividir lote em peças</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="tap-icon">
            <CloseIcon />
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-stone-400">Quantidade de peças</span>
          <input type="number" min="1" max="200" value={count} onChange={(e) => setCount(e.target.value)} className="input w-28" />
        </label>

        <div>
          <span className="mb-1 block text-xs text-stone-400">Sufixo</span>
          <div className="flex gap-2">
            {(
              [
                { value: 'numeric', label: 'Numérico (1, 2, 3…)' },
                { value: 'letter', label: 'Letra (a, b, c…)' },
              ] as { value: LotSuffixMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSuffixMode(opt.value)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
                  suffixMode === opt.value ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {n > 0 && (
          <p className="text-sm text-stone-400">
            Vai criar peças de #{suffixes[0]} até #{suffixes[suffixes.length - 1]}.
          </p>
        )}

        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            checked={inheritOrigin}
            onChange={(e) => setInheritOrigin(e.target.checked)}
            className="accent-amber-600"
          />
          Herdar origem do lote
        </label>

        {busy && (
          <p className="text-sm text-stone-400">
            Criando… {done}/{n}
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="button" onClick={() => void run()} disabled={n <= 0 || busy} className="btn-primary flex-1">
            {busy ? 'Criando…' : `Criar ${n} peças`}
          </button>
        </div>
      </div>
    </div>
  )
}

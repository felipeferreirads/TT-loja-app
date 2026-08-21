import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StoreProduct } from '../../types/db'
import { fetchProductChildren, fetchProducts, updateProduct } from './api'
import { formatMoney } from '../../lib/format'
import { sortLotItems, summarizeLot } from './lots'
import { useConfirm } from '../../components/DialogProvider'
import { PickProductsDialog } from '../documents/PickProductsDialog'
import { SplitLotDialog } from './SplitLotDialog'
import { LinkIcon, PlusIcon, SplitIcon, StackIcon, UnlinkIcon } from '../../components/icons'
import { Section } from './form/Field'

/**
 * Peças de um lote — versão enxuta de `LotItemsSection.tsx` do catálogo
 * pessoal (só lista, sem grid/seleção em massa/categorias — a loja não tem
 * esse volume nem esse recurso). Cada peça é um `store_products` completo
 * (`parent_id` aponta pra este lote), com SKU/foto/preço/venda próprios.
 */
export function LotItemsSection({ lot }: { lot: StoreProduct }) {
  const [items, setItems] = useState<StoreProduct[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'split' | 'link' | null>(null)
  const [excludeIds, setExcludeIds] = useState<string[]>([])
  const confirm = useConfirm()

  const load = () =>
    fetchProductChildren(lot.id)
      .then((rows) => setItems(sortLotItems(rows)))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lot.id])

  const openLinkDialog = async () => {
    // Só produtos que ainda não pertencem a NENHUM lote podem ser vinculados
    // — mover uma peça de um lote pra outro é decisão que merece abrir a
    // ficha dela, não um clique aqui.
    const all = await fetchProducts().catch(() => [])
    setExcludeIds([lot.id, ...all.filter((p) => p.parent_id).map((p) => p.id)])
    setDialog('link')
  }

  const handleLink = async (ids: string[]) => {
    setDialog(null)
    const existing = items ?? []
    const used = existing.map((i) => Number((i.lot_suffix ?? '').trim())).filter((n) => Number.isFinite(n))
    let next = Math.max(0, ...used) + 1
    for (const id of ids) {
      await updateProduct(id, { parent_id: lot.id, lot_suffix: String(next) })
      next++
    }
    load()
  }

  const handleUnlink = async (item: StoreProduct) => {
    if (!(await confirm(`Desvincular "${item.name}" deste lote?`))) return
    await updateProduct(item.id, { parent_id: null, lot_suffix: null })
    load()
  }

  if (!items) return null

  const summary = summarizeLot(items)

  return (
    <Section
      title={`Peças do lote (${summary.count})`}
      icon={<StackIcon />}
    >
      {summary.count > 0 && (
        <p className="-mt-1 text-xs text-stone-500">
          {summary.weightG != null && `${summary.weightG} g total`}
          {summary.weightG != null && summary.withoutWeight > 0 && ` (${summary.withoutWeight} sem peso)`}
          {summary.weightG != null && summary.sold > 0 && ' · '}
          {summary.sold > 0 && `${summary.sold} sem estoque`}
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhuma peça ainda.</p>
      ) : (
        <ul className="divide-y divide-stone-800 overflow-hidden rounded-lg border border-stone-800">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <Link to={`/produtos/${item.id}`} className="flex min-w-0 flex-1 items-center gap-2 hover:underline">
                {item.lot_suffix && <span className="shrink-0 font-mono text-xs text-amber-500">#{item.lot_suffix}</span>}
                <span className="min-w-0 flex-1 truncate text-stone-100">{item.name}</span>
                {item.sku && <span className="shrink-0 text-xs text-stone-500">{item.sku}</span>}
              </Link>
              <span className="shrink-0 text-xs text-stone-400">{formatMoney(item.sale_price)}</span>
              <button
                type="button"
                onClick={() => void handleUnlink(item)}
                className="shrink-0 text-stone-500 hover:text-red-400"
                aria-label="Desvincular peça"
                title="Desvincular"
              >
                <UnlinkIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to={`/produtos/novo?lot=${lot.id}`} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <PlusIcon className="h-4 w-4" />
          Adicionar peça
        </Link>
        <button type="button" onClick={() => setDialog('split')} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <SplitIcon className="h-4 w-4" />
          Dividir em N peças
        </button>
        <button type="button" onClick={() => void openLinkDialog()} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <LinkIcon className="h-4 w-4" />
          Vincular existente
        </button>
      </div>

      {dialog === 'link' && (
        <PickProductsDialog excludeIds={excludeIds} onCancel={() => setDialog(null)} onConfirm={(ids) => void handleLink(ids)} />
      )}
      {dialog === 'split' && <SplitLotDialog lot={lot} items={items} onClose={() => setDialog(null)} onDone={load} />}
    </Section>
  )
}

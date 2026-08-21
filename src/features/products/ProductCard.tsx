import { Link } from 'react-router-dom'
import { ITEM_KIND_LABELS, type StoreProduct } from '../../types/db'
import { formatMoney } from '../../lib/format'
import { PhotoIcon, StackIcon, WarningIcon } from '../../components/icons'

/** Tile da visualização em grade — capa, nome, tipo, preço e estoque. */
export function ProductCard({ product, coverUrl }: { product: StoreProduct; coverUrl?: string }) {
  const outOfStock = product.stock_quantity <= 0
  // Opt-in (`min_stock`) — só acende pra quem o dono escolheu monitorar, não
  // pra toda peça única sem estoque de reposição.
  const lowStock = !outOfStock && product.min_stock != null && product.stock_quantity <= product.min_stock
  return (
    <Link
      to={`/produtos/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-stone-800 transition hover:border-stone-600"
    >
      <div className="relative flex aspect-square w-full items-center justify-center bg-stone-900">
        {coverUrl ? (
          <img src={coverUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <PhotoIcon className="h-8 w-8 text-stone-700" />
        )}
        {product.lot_suffix && (
          <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
            #{product.lot_suffix}
          </span>
        )}
        {product.is_lot && (
          <span className="absolute top-1 right-1 rounded bg-black/60 p-1" title="Lote">
            <StackIcon className="h-3 w-3 text-stone-300" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <span className="truncate text-sm text-stone-100">{product.name}</span>
        <span className="truncate text-xs text-stone-500">
          {ITEM_KIND_LABELS[product.kind]}
          {product.minerals?.[0]?.name ? ` · ${product.minerals[0].name}` : ''}
        </span>
        <span className="mt-auto flex items-center justify-between pt-1 text-xs">
          <span className="text-stone-200">{formatMoney(product.sale_price)}</span>
          <span
            className={`inline-flex items-center gap-1 ${outOfStock ? 'text-red-400' : lowStock ? 'text-amber-500' : 'text-stone-500'}`}
          >
            {lowStock && <WarningIcon className="h-3 w-3" />}
            {product.stock_quantity} un.
          </span>
        </span>
      </div>
    </Link>
  )
}

import { Link } from 'react-router-dom'
import { ITEM_KIND_LABELS, type StoreProduct } from '../../types/db'
import { formatMoney } from '../../lib/format'
import { PhotoIcon } from '../../components/icons'

/** Tile da visualização em grade — capa, nome, tipo, preço e estoque. */
export function ProductCard({ product, coverUrl }: { product: StoreProduct; coverUrl?: string }) {
  const outOfStock = product.stock_quantity <= 0
  return (
    <Link
      to={`/produtos/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-stone-800 transition hover:border-stone-600"
    >
      <div className="flex aspect-square w-full items-center justify-center bg-stone-900">
        {coverUrl ? (
          <img src={coverUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <PhotoIcon className="h-8 w-8 text-stone-700" />
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
          <span className={outOfStock ? 'text-red-400' : 'text-stone-500'}>{product.stock_quantity} un.</span>
        </span>
      </div>
    </Link>
  )
}

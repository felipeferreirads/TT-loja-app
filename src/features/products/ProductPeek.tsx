import { ArrowLeftIcon, PhotoIcon } from '../../components/icons'
import { formatMoney } from '../../lib/format'
import { ITEM_KIND_LABELS } from '../../types/db'
import { useCoverUrls, useProducts } from './queries'

/**
 * Prévia do produto vizinho, encostada ao lado da ficha (fora da tela) enquanto
 * o dedo arrasta: a próxima ficha entra junto com o dedo, em vez de só aparecer
 * depois de soltar (ver `lib/useSwipeNavigation.ts`, que posiciona e anima).
 *
 * A ficha da loja é um formulário, então a prévia mostra só o topo: cabeçalho,
 * nome, tipo/SKU/preço e a capa. Posição (`side`): +1 = direita (próximo),
 * -1 = esquerda (anterior). Dados e capa vêm do cache da lista, sem rede.
 */
export function ProductPeek({ id, side }: { id: string; side: 1 | -1 }) {
  const { data: products } = useProducts()
  const { data: covers } = useCoverUrls()
  const p = products?.find((x) => x.id === id)
  if (!p) return null
  const cover = covers?.[id]
  const meta = [ITEM_KIND_LABELS[p.kind], p.sku, formatMoney(p.sale_price)].filter(Boolean).join(' · ')

  return (
    <div
      data-browse-peek
      aria-hidden="true"
      inert
      // `overflow-hidden` + `maxHeight`: o gesto acerta o teto junto com o `top`.
      className="pointer-events-none absolute top-0 w-full overflow-hidden"
      style={{ left: side === 1 ? '100vw' : '-100vw', maxHeight: '100%' }}
    >
      <header className="mb-4">
        <span className="inline-flex items-center gap-1 text-sm text-stone-400">
          <ArrowLeftIcon />
          Produtos
        </span>
        <h1 className="text-xl font-bold break-words text-stone-100">{p.name || 'Produto'}</h1>
        {meta && <p className="text-sm text-stone-400">{meta}</p>}
      </header>
      <div className="aspect-square max-w-md overflow-hidden rounded-xl bg-stone-800">
        {cover ? (
          <img src={cover} alt="" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-stone-600">
            <PhotoIcon />
          </div>
        )}
      </div>
    </div>
  )
}

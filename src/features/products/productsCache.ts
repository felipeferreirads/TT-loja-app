import { queryClient } from '../../lib/queryClient'

// Cache COMPARTILHADO da lista de produtos (`['products']`) e das capas
// assinadas (`['product-cover-urls']`). Antes, cada tela (Produtos, Vendas,
// Painel, seletores, Lotes) chamava `fetchProducts()` no próprio `useEffect` e
// relia a lista inteira (com etiquetas, minerais e rochas embutidos) a cada
// visita; a tela de Produtos ainda reassinava todas as capas. Agora todas leem
// o mesmo cache (`products/queries.ts`) e só voltam ao servidor quando algo
// muda.
//
// Quem muda: toda função de gravação de produto chama `markProductsChanged`
// (em `products/api.ts`, `sales/api.ts`, `stockHistory.ts`,
// `importFromCollection.ts`) — a invalidação mora na camada de dados, não em
// cada tela, para nenhuma gravação nova esquecer de avisar.

export const PRODUCTS_KEY = ['products'] as const
export const COVER_URLS_KEY = ['product-cover-urls'] as const

/** Espera antes de reler as telas abertas: um laço de gravações (dividir lote,
 *  importar vários itens) vira UMA releitura no fim, não uma por item. */
const REFETCH_DEBOUNCE_MS = 600

let timer: ReturnType<typeof setTimeout> | null = null
let pendingCovers = false

/**
 * Marca o cache como desatualizado NA HORA (qualquer tela montada depois disto
 * já busca de novo) e relê as telas abertas uma única vez, ao fim de uma
 * sequência de gravações.
 *
 * `covers`: a gravação mexeu em foto/vídeo (capa pode ter mudado). Estoque,
 * preço, nome etc. não mudam a capa — não reassina à toa.
 */
export function markProductsChanged({ covers = false }: { covers?: boolean } = {}): void {
  void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY, refetchType: 'none' })
  if (covers) {
    pendingCovers = true
    void queryClient.invalidateQueries({ queryKey: COVER_URLS_KEY, refetchType: 'none' })
  }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void queryClient.refetchQueries({ queryKey: PRODUCTS_KEY, type: 'active' })
    if (pendingCovers) {
      pendingCovers = false
      void queryClient.refetchQueries({ queryKey: COVER_URLS_KEY, type: 'active' })
    }
  }, REFETCH_DEBOUNCE_MS)
}

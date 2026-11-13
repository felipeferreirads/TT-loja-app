import { useQuery } from '@tanstack/react-query'
import { queryClient } from '../../lib/queryClient'
import type { StoreProduct } from '../../types/db'
import { fetchCoverUrls, fetchProducts } from './api'
import { COVER_URLS_KEY, PRODUCTS_KEY } from './productsCache'

// Leitura da lista de produtos e das capas pelo cache compartilhado — ver
// `productsCache.ts` (por que existe e quem invalida).

/**
 * As URLs de capa são assinadas: o cache precisa vencer bem antes delas. A
 * assinatura do R2 vale 24 h (ver `r2-storage`); 30 min deixa folga larga.
 */
const COVER_URLS_STALE_MS = 30 * 60_000

export function useProducts() {
  return useQuery({ queryKey: PRODUCTS_KEY, queryFn: fetchProducts })
}

export function useCoverUrls() {
  return useQuery({ queryKey: COVER_URLS_KEY, queryFn: fetchCoverUrls, staleTime: COVER_URLS_STALE_MS })
}

/** Para código fora de componente (ação de botão): usa o cache se estiver fresco, senão busca. */
export function getProducts(): Promise<StoreProduct[]> {
  return queryClient.fetchQuery({ queryKey: PRODUCTS_KEY, queryFn: fetchProducts })
}

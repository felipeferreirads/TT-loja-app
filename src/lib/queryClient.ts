import { QueryClient } from '@tanstack/react-query'

// Instância única do React Query, fora do React: as funções de gravação de
// `features/*/api.ts` invalidam o cache por aqui (ver `products/productsCache.ts`)
// sem depender de um hook.
//
// Catálogos de referência (minerais, subdivisões) e geocode são dados
// compartilhados e praticamente imutáveis dentro de uma sessão — cache longo.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, refetchOnWindowFocus: false } },
})

import { useQuery } from '@tanstack/react-query'
import { WORLD_TOPO_URL } from './worldGeographies'

// TopoJSON do mapa-múndi (mapa de continentes da categoria de localização) —
// buscado uma vez via CDN e mantido em cache. Mesmo nome e mesma interface de
// `lib/worldTopo.ts` do catálogo (os componentes de mapa compartilhados
// importam daqui), mas sem o cache offline em IndexedDB, que a loja não tem.
export { buildWorldGeographies, WORLD_TOPO_URL, type WorldGeographies } from './worldGeographies'

async function fetchWorldTopo(): Promise<unknown> {
  const res = await fetch(WORLD_TOPO_URL)
  if (!res.ok) throw new Error('Não foi possível carregar o mapa-múndi.')
  return res.json()
}

export function useWorldTopo() {
  return useQuery({
    queryKey: ['world-atlas-110m'],
    queryFn: fetchWorldTopo,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

import { supabase } from './supabase'

/**
 * Busca de localidade tipo Google Maps (digitar a cidade, puxar
 * estado/país/região) — chama a Edge Function "geocode" (proxy do Nominatim/
 * OpenStreetMap), a MESMA do catálogo pessoal, no mesmo projeto Supabase.
 *
 * Atenção: essa Edge Function pode ainda não estar implantada em produção —
 * enquanto não estiver, `searchLocality` devolve lista vazia (não quebra o
 * formulário, só não sugere nada).
 */

export interface LocalityCandidate {
  placeId: number
  /** Nome hierárquico completo ("Mahajanga, Boeny, Madagascar") — vira `origin`. */
  displayName: string
  city: string | null
  /** Estado/província em texto livre — casa com `matchSubdivision`, não é o código ISO. */
  state: string | null
  country: string | null
  /** ISO 3166-1 alpha-2, maiúsculo. */
  countryCode: string | null
  lat: number
  lon: number
}

export async function searchLocality(query: string): Promise<LocalityCandidate[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const { data, error } = await supabase.functions.invoke<{ results?: LocalityCandidate[]; error?: string }>(
    'geocode',
    { body: { q, lang: 'pt' } },
  )
  if (error || !data || data.error) return []
  return data.results ?? []
}

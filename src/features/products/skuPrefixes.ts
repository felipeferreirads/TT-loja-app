import { supabase } from '../../lib/supabase'
import { stripAccents } from '../../lib/format'
import type { StoreItemKind, StoreSkuPrefix, StoreSkuPrefixInput } from '../../types/db'

/** Prefixo padrão por tipo quando o dono não cadastrou nenhum em Empresa. */
export const DEFAULT_KIND_PREFIX: Record<StoreItemKind, string> = {
  mineral: 'MIN',
  fossil: 'FOS',
  meteorite: 'MET',
  jewelry: 'JOI',
  other: 'OUT',
}

/** Fallback do prefixo de gema (0021) quando o dono não configurou um em Empresa — "gema" não é `kind`, é `is_gem` no mineral. */
export const DEFAULT_GEM_PREFIX = 'GEM'

export const DEFAULT_DIGITS = 4

export function normalizeMatchKey(name: string): string {
  return stripAccents(name).trim()
}

export async function fetchSkuPrefixes(): Promise<StoreSkuPrefix[]> {
  const { data, error } = await supabase.from('store_sku_prefixes').select('*').order('kind').order('match_key')
  if (error) throw new Error(`Falha ao carregar prefixos de SKU: ${error.message}`)
  return data
}

export async function upsertSkuPrefix(input: StoreSkuPrefixInput): Promise<StoreSkuPrefix> {
  const { data, error } = await supabase
    .from('store_sku_prefixes')
    .upsert(
      { ...input, match_key: input.match_key ? normalizeMatchKey(input.match_key) : '' },
      { onConflict: 'owner_id,kind,match_key,is_gem' },
    )
    .select()
    .single()
  if (error) throw new Error(`Falha ao salvar prefixo: ${error.message}`)
  return data
}

export async function deleteSkuPrefix(id: string): Promise<void> {
  const { error } = await supabase.from('store_sku_prefixes').delete().eq('id', id)
  if (error) throw new Error(`Falha ao remover prefixo: ${error.message}`)
}

/** Resolve qual prefixo/dígitos usar, em ordem de prioridade: espécie
 *  customizada (ex. OPL pra opala) > padrão de gema (`is_gem`, só faz
 *  sentido pra mineral) > padrão do tipo > fallback fixo. */
export function resolvePrefix(
  kind: StoreItemKind,
  speciesName: string | null,
  isGem: boolean,
  prefixes: StoreSkuPrefix[],
): { prefix: string; digits: number } {
  const key = speciesName ? normalizeMatchKey(speciesName) : ''
  const species = key ? prefixes.find((p) => p.kind === kind && p.match_key === key) : undefined
  if (species) return { prefix: species.prefix, digits: species.digits }
  if (isGem) {
    const gemDefault = prefixes.find((p) => p.kind === 'mineral' && p.match_key === '' && p.is_gem)
    if (gemDefault) return { prefix: gemDefault.prefix, digits: gemDefault.digits }
  }
  const typeDefault = prefixes.find((p) => p.kind === kind && p.match_key === '' && !p.is_gem)
  if (typeDefault) return { prefix: typeDefault.prefix, digits: typeDefault.digits }
  return { prefix: isGem ? DEFAULT_GEM_PREFIX : DEFAULT_KIND_PREFIX[kind], digits: DEFAULT_DIGITS }
}

/** Próximo número livre pra um prefixo — olha o maior `sku` já usado com ele
 *  (mesma abordagem sem sequence dedicada de `suggestNextCodes` no catálogo
 *  pessoal, adaptada pra string em vez de coluna numérica: com dígitos fixos
 *  a ordenação alfabética bate com a numérica). */
async function nextNumberForPrefix(prefix: string): Promise<number> {
  const { data, error } = await supabase
    .from('store_products')
    .select('sku')
    .like('sku', `${prefix}-%`)
    .order('sku', { ascending: false })
    .limit(1)
  if (error) throw new Error(`Falha ao calcular próximo SKU: ${error.message}`)
  const last = data?.[0]?.sku
  const match = last?.match(/-(\d+)$/)
  return match ? Number(match[1]) + 1 : 1
}

/** Sugere o próximo SKU pro tipo/espécie informados — usado pelo autofill do
 *  formulário (sem botão, ver `ProductPage.tsx`). */
export async function suggestSku(
  kind: StoreItemKind,
  speciesName: string | null,
  isGem: boolean,
  prefixes: StoreSkuPrefix[],
): Promise<string> {
  const { prefix, digits } = resolvePrefix(kind, speciesName, isGem, prefixes)
  const n = await nextNumberForPrefix(prefix)
  return `${prefix}-${String(n).padStart(digits, '0')}`
}

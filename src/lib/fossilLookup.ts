import { supabase } from './supabase'

// Busca da taxonomia de uma espécie de fóssil — adaptado de
// src/lib/fossilLookup.ts do catálogo pessoal (claude.md §2). Chama a MESMA
// Edge Function "fossil-taxonomy" (PBDB + GBIF), do mesmo projeto Supabase —
// só o cliente muda, o backend é compartilhado. Os tipos abaixo são uma
// CÓPIA do formato de retorno dela (`supabase/functions/fossil-taxonomy/
// taxonomy.ts` no repo do catálogo pessoal), não um import cross-repo: a
// loja é um repositório git próprio (claude.md §1), então referenciar um
// arquivo do repo pai quebraria um clone isolado deste repo.
//
// Quem resolve a 1ª camada (a PRÓPRIA loja) é `FossilTaxonomySection.tsx`,
// antes de chamar isto.

/** Níveis na mesma nomenclatura das colunas de `store_product_fossil_species`. */
export interface TaxonomyInfo {
  kingdom: string | null
  taxon_type: string | null
  phylum: string | null
  taxon_class: string | null
  taxon_order: string | null
  family: string | null
}

export interface StratRange {
  earliest: string
  latest: string
  maxMa: number | null
  minMa: number | null
}

/** Rank do táxon ENCONTRADO — decide se o nome fica no campo "Espécie". */
export type TaxonRank = 'species' | 'genus' | 'family' | 'order' | 'class' | 'phylum' | 'kingdom'

export function isSpeciesLevel(rank: TaxonRank | null): boolean {
  return rank === null || rank === 'species' || rank === 'genus'
}

/** Rótulo em português do rank, para explicar ao dono o que foi feito. */
export const RANK_LABEL: Record<TaxonRank, string> = {
  species: 'espécie',
  genus: 'gênero',
  family: 'família',
  order: 'ordem',
  class: 'classe',
  phylum: 'filo',
  kingdom: 'reino',
}

export interface TaxonomyLookup {
  /** Nome como a fonte o conhece (pode diferir do digitado). */
  matchedName: string | null
  /** Rank do nome consultado (null = as fontes não informaram). */
  rank: TaxonRank | null
  info: TaxonomyInfo
  /** De onde veio CADA nível — as fontes divergem, e a UI precisa dizer qual. */
  origin: Partial<Record<keyof TaxonomyInfo, 'pbdb' | 'gbif' | 'derived'>>
  /** Alcance estratigráfico do TÁXON (PBDB). Só exibição — nunca é a idade da peça. */
  range: StratRange | null
}

/** `queried` é o termo de fato buscado — pode ser diferente do digitado quando
 *  um nome popular ("tubarão") foi traduzido para o científico (Elasmobranchii). */
export interface FossilLookupResult {
  data: (TaxonomyLookup & { queried: string }) | null
  error?: string
}

export async function lookupFossilTaxonomy(rawName: string): Promise<FossilLookupResult> {
  try {
    const { data, error } = await supabase.functions.invoke('fossil-taxonomy', {
      body: { name: rawName },
    })
    if (error) {
      return {
        data: null,
        error: 'Busca externa indisponível (a Edge Function "fossil-taxonomy" está publicada?).',
      }
    }
    if (!data?.found) {
      return {
        data: null,
        error: data?.sourcesDown
          ? 'PBDB e GBIF não responderam — tente de novo em instantes.'
          : `Não encontrado na PBDB nem na GBIF${data?.queried ? ` (busquei por "${data.queried}")` : ''}.`,
      }
    }
    return { data: data as TaxonomyLookup & { queried: string } }
  } catch {
    return { data: null, error: 'Sem conexão para consultar PBDB/GBIF.' }
  }
}

/** Rótulo curto da fonte de cada nível, para a mensagem de resultado. */
export const TAXON_SOURCE_LABEL: Record<string, string> = {
  pbdb: 'PBDB',
  gbif: 'GBIF',
  derived: 'deduzido do filo',
}

/** "Darriwiliano–Fameniano (469,4–358,9 Ma)" — só exibição, nunca gravado. */
export function formatStratRange(range: TaxonomyLookup['range']): string | null {
  if (!range) return null
  const interval = range.earliest === range.latest ? range.earliest : `${range.earliest}–${range.latest}`
  const ma =
    range.maxMa != null && range.minMa != null
      ? ` (${range.maxMa.toFixed(1).replace('.', ',')}–${range.minMa.toFixed(1).replace('.', ',')} Ma)`
      : ''
  return `${interval}${ma}`
}

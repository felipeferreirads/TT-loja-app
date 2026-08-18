import { supabase } from './supabase'

/**
 * Consulta à tabela de referência global `subdivisions_reference` — a MESMA do
 * catálogo pessoal (mesmo projeto Supabase). Alimenta o seletor de
 * Estado/Província. Sempre por país inteiro (dezenas de linhas), o filtro de
 * texto roda no cliente. Versão PT-only da do Tesouros da Terra.
 */

export interface SubdivisionOption {
  isoCode: string
  name: string
  aliases: string[]
  /** Nomes em todos os idiomas — usado só na detecção automática. */
  allNames: string[]
  /** Arquivo no Wikimedia Commons; null = sem bandeira cadastrada. */
  flagFile: string | null
}

const COLS = 'iso_code,name_en,name_pt,name_es,aliases,flag_commons_file'

interface SubdivisionRow {
  iso_code: string
  name_en: string | null
  name_pt: string | null
  name_es: string | null
  aliases: string[] | null
  flag_commons_file: string | null
}

/** Vazio (não quebra) se offline/erro/país sem cobertura. */
export async function fetchSubdivisions(countryCode: string): Promise<SubdivisionOption[]> {
  if (!countryCode) return []
  const { data, error } = await supabase
    .from('subdivisions_reference')
    .select(COLS)
    .eq('country_code', countryCode.toUpperCase())
  if (error || !data) return []
  return (data as unknown as SubdivisionRow[])
    .map((r) => ({
      isoCode: r.iso_code,
      name: r.name_pt ?? r.name_en ?? r.name_es ?? '',
      aliases: r.aliases ?? [],
      allNames: [...new Set([r.name_en, r.name_pt, r.name_es].filter((n): n is string => !!n))],
      flagFile: r.flag_commons_file,
    }))
    .filter((o) => o.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/** Redirect estável do Wikimedia Commons; null = sem bandeira cadastrada. */
export function subdivisionFlagUrl(flagFile: string | null | undefined): string | null {
  if (!flagFile) return null
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(flagFile)}`
}

const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g')
function normalize(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase()
}
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Subdivisão cujo nome (qualquer idioma) ou alias aparece como palavra inteira
 * no texto — detecção automática de Estado a partir da Localidade digitada.
 */
export function matchSubdivision(text: string | null | undefined, options: SubdivisionOption[]): string | null {
  if (!text) return null
  const norm = normalize(text)
  for (const opt of options) {
    for (const term of [opt.name, ...opt.allNames, ...opt.aliases]) {
      if (!term) continue
      if (new RegExp(`\\b${escapeRegExp(normalize(term))}\\b`).test(norm)) return opt.isoCode
    }
  }
  return null
}

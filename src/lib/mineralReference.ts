import { supabase } from './supabase'

/**
 * Consulta ao catálogo global `minerals_reference` — a MESMA tabela do
 * Tesouros da Terra (mesmo projeto Supabase, RLS libera SELECT a qualquer
 * autenticado), então não há dado duplicado entre os dois apps: só a lógica
 * cliente é copiada.
 *
 * Versão enxuta da do catálogo pessoal: preenche sempre em PT (com fallback
 * pro EN), sem o seletor de idioma de autofill, sem cache offline em
 * IndexedDB e sem react-query — a loja opera online.
 */

export type MineralReferenceKind = 'species' | 'variety' | 'group'

export interface MineralReference {
  id: string
  kind: MineralReferenceKind
  parent_id: string | null
  parent_name: string | null
  name_en: string
  name_pt: string | null
  mineral_class_en: string | null
  mineral_class_pt: string | null
  group_name_en: string | null
  group_name_pt: string | null
  crystal_system_en: string | null
  crystal_system_pt: string | null
  tenacity_en: string | null
  tenacity_pt: string | null
  transparency_en: string | null
  transparency_pt: string | null
  luster_en: string | null
  luster_pt: string | null
  cleavage_en: string | null
  cleavage_pt: string | null
  fracture_en: string | null
  fracture_pt: string | null
  streak_en: string | null
  streak_pt: string | null
  formula: string | null
  formula_name_en: string | null
  formula_name_pt: string | null
  color_cause_en: string | null
  color_cause_pt: string | null
  chromophore_en: string | null
  chromophore_pt: string | null
  hardness: string | null
  density: string | null
  refractive_index: string | null
}

/** Campos que o formulário da loja preenche automaticamente a partir do catálogo. */
export interface MineralAutoInfo {
  name: string
  formula: string
  formula_name: string
  mineral_class: string
  group_name: string
  color_cause: string
  chromophore: string
  hardness: string
  tenacity: string
  cleavage: string
  fracture: string
  streak: string
  density: string
  crystal_system: string
  luster: string
  transparency: string
  refractive_index: string
}

/** Sem acento, minúsculas — bate com as colunas `*_norm` da tabela. */
export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const pick = (pt: string | null, en: string | null): string => pt ?? en ?? ''

/** A Wikidata rotula mineral como substantivo comum ("quartzo"); o app trata
 *  nome de espécie/variedade como nome próprio ("Quartzo"). */
export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Propriedades que uma variedade herda da espécie-mãe quando a própria linha
 *  está vazia. Cromóforo e origem da cor ficam DE FORA de propósito — são
 *  justamente o que diferencia cada variedade. */
const INHERITABLE_PAIRED_FIELDS = [
  'mineral_class',
  'crystal_system',
  'tenacity',
  'transparency',
  'luster',
  'cleavage',
  'fracture',
  'streak',
] as const

const INHERITABLE_NEUTRAL_FIELDS = ['hardness', 'density', 'refractive_index', 'formula'] as const

export function withParentFallback(row: MineralReference, parent: MineralReference | null): MineralReference {
  if (!parent || row.kind !== 'variety') return row
  const merged = { ...row }
  const rec = merged as unknown as Record<string, string | null>
  const parentRec = parent as unknown as Record<string, string | null>
  for (const field of INHERITABLE_PAIRED_FIELDS) {
    for (const lang of ['en', 'pt'] as const) {
      const key = `${field}_${lang}`
      if (!rec[key]) rec[key] = parentRec[key]
    }
  }
  for (const field of INHERITABLE_NEUTRAL_FIELDS) {
    if (!rec[field]) rec[field] = parentRec[field]
  }
  return merged
}

export function toMineralAutoInfo(r: MineralReference): MineralAutoInfo {
  return {
    name: capitalize(pick(r.name_pt, r.name_en) || r.name_en),
    formula: r.formula ?? '',
    formula_name: pick(r.formula_name_pt, r.formula_name_en),
    mineral_class: pick(r.mineral_class_pt, r.mineral_class_en),
    group_name: pick(r.group_name_pt, r.group_name_en),
    color_cause: pick(r.color_cause_pt, r.color_cause_en),
    chromophore: pick(r.chromophore_pt, r.chromophore_en),
    hardness: r.hardness ?? '',
    tenacity: pick(r.tenacity_pt, r.tenacity_en),
    cleavage: pick(r.cleavage_pt, r.cleavage_en),
    fracture: pick(r.fracture_pt, r.fracture_en),
    streak: pick(r.streak_pt, r.streak_en),
    density: r.density ?? '',
    crystal_system: pick(r.crystal_system_pt, r.crystal_system_en),
    luster: pick(r.luster_pt, r.luster_en),
    transparency: pick(r.transparency_pt, r.transparency_en),
    refractive_index: r.refractive_index ?? '',
  }
}

const COLS =
  'id,kind,parent_id,parent_name,name_en,name_pt,' +
  'mineral_class_en,mineral_class_pt,group_name_en,group_name_pt,' +
  'color_cause_en,color_cause_pt,chromophore_en,chromophore_pt,' +
  'crystal_system_en,crystal_system_pt,tenacity_en,tenacity_pt,' +
  'transparency_en,transparency_pt,luster_en,luster_pt,cleavage_en,cleavage_pt,' +
  'fracture_en,fracture_pt,streak_en,streak_pt,formula,formula_name_en,formula_name_pt,' +
  'hardness,density,refractive_index'

async function queryExact(normName: string): Promise<MineralReference | null> {
  if (!normName) return null
  for (const col of ['name_pt_norm', 'name_en_norm']) {
    const { data, error } = await supabase
      .from('minerals_reference')
      .select(COLS)
      .eq(col, normName)
      .limit(1)
      .maybeSingle()
    if (error) return null
    if (data) return data as unknown as MineralReference
  }
  return null
}

async function querySynonym(normName: string): Promise<MineralReference | null> {
  if (!normName) return null
  const { data: synonym, error: synError } = await supabase
    .from('mineral_reference_synonyms')
    .select('mineral_reference_id')
    .eq('name_norm', normName)
    .limit(1)
    .maybeSingle()
  if (synError || !synonym) return null
  const { data, error } = await supabase
    .from('minerals_reference')
    .select(COLS)
    .eq('id', (synonym as { mineral_reference_id: string }).mineral_reference_id)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as MineralReference
}

/** "Quartzo (Pegmatito)" → "Quartzo": o parêntese é rocha-hospedeira ou
 *  localidade, não faz parte do nome da espécie. */
function stripParenthetical(s: string): string {
  return s.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/**
 * Sinônimos em português cujo termo comum diverge do nome canônico gravado no
 * catálogo. Cópia da lista do Tesouros da Terra — cada par foi verificado em
 * fontes de mineralogia em PT, nunca chutado.
 */
const KNOWN_SYNONYMS: Record<string, string> = {
  celestina: 'celestita',
  ouropigmento: 'auripigmento',
  elbaita: 'elbaite',
  blenda: 'esfalerita',
  'quartzo rutilado': 'quartzo',
  'turmalina rubelita': 'rubelita',
  'turmalina indicolita': 'indicolita',
  espinelio: 'espinela',
  cerusita: 'cerussita',
}

function swapHyphenSpace(s: string): string[] {
  const out: string[] = []
  if (s.includes('-')) out.push(s.replace(/-/g, ' '))
  if (s.includes(' ')) out.push(s.replace(/\s+/g, '-'))
  return out
}

/** Primeiro mineral de um nome composto ("Cerusita, Barita e Galena"). */
function firstSegment(s: string): string | null {
  const m = s.match(/^(.*?)(?:,|\s+e\s+|\s+s\/\s+)/i)
  return m ? m[1].trim() : null
}

/**
 * Candidatos a tentar, na ordem de prioridade: variedade > espécie (padrão
 * "Espécie var. Variedade"), nome depois do "cf." (identificação tentativa),
 * variações hífen/espaço, sinônimo conhecido, e por fim a versão sem anotação
 * entre parênteses. Deduplicado pela forma normalizada.
 */
export function buildCandidates(rawName: string): string[] {
  const name = rawName.trim()
  if (!name) return []
  const varMatch = name.match(/^(.*?)\s+var\.?\s+(.+)$/i)
  const cfMatch = !varMatch ? name.match(/^(?:(.+?)\s+)?cf\.?\s+(.+)$/i) : null
  const base = varMatch
    ? [varMatch[2], varMatch[1]]
    : cfMatch
      ? [cfMatch[2], ...(cfMatch[1] ? [cfMatch[1]] : [])]
      : [name]
  const withoutParens = stripParenthetical(name)
  if (withoutParens && withoutParens !== name) base.push(withoutParens)
  const first = firstSegment(name)
  if (first) base.push(first)

  const candidates: string[] = []
  const seen = new Set<string>()
  const push = (c: string) => {
    const n = norm(c)
    if (n && !seen.has(n)) {
      seen.add(n)
      candidates.push(c)
    }
  }
  for (const c of base) {
    push(c)
    for (const variant of swapHyphenSpace(c)) push(variant)
    const syn = KNOWN_SYNONYMS[norm(c)]
    if (syn) push(syn)
  }
  return candidates
}

async function fetchReferenceById(id: string): Promise<MineralReference | null> {
  const { data, error } = await supabase.from('minerals_reference').select(COLS).eq('id', id).maybeSingle()
  if (error || !data) return null
  return data as unknown as MineralReference
}

async function resolveReferenceRow(rawName: string): Promise<MineralReference | null> {
  for (const c of buildCandidates(rawName)) {
    const n = norm(c)
    const row = (await queryExact(n)) ?? (await querySynonym(n))
    if (row) return row
  }
  return null
}

/** Resultado do autofill: os campos preenchidos + o vínculo com o catálogo. */
export interface MineralLookup {
  id: string
  kind: MineralReferenceKind
  parentName: string | null
  info: MineralAutoInfo
}

export async function lookupMineral(rawName: string): Promise<MineralLookup | null> {
  const row = await resolveReferenceRow(rawName)
  if (!row) return null
  const parent = row.kind === 'variety' && row.parent_id ? await fetchReferenceById(row.parent_id) : null
  return {
    id: row.id,
    kind: row.kind,
    // `parent_name` é desnormalizado e vem em caixa baixa da Wikidata; o app
    // trata nome de espécie como nome próprio.
    parentName: parent
      ? capitalize(pick(parent.name_pt, parent.name_en))
      : row.parent_name
        ? capitalize(row.parent_name)
        : null,
    info: toMineralAutoInfo(withParentFallback(row, parent)),
  }
}

/** Sugestões de nome pro typeahead do campo Espécie (prefixo, PT e EN). */
export async function searchMineralNames(query: string, limit = 8): Promise<string[]> {
  const n = norm(query)
  if (n.length < 2) return []
  const cols = ['name_pt_norm', 'name_en_norm'] as const
  const results = await Promise.all(
    cols.map((col) =>
      supabase.from('minerals_reference').select('name_pt,name_en').ilike(col, `${n}%`).limit(limit),
    ),
  )
  const names = new Set<string>()
  for (const { data, error } of results) {
    if (error || !data) continue
    for (const row of data as unknown as { name_pt: string | null; name_en: string }[]) {
      names.add(capitalize(pick(row.name_pt, row.name_en)))
    }
  }
  return [...names].slice(0, limit)
}

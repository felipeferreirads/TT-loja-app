export function formatMoney(value: number | null | undefined, currency = 'BRL'): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency })
}

/** Data (sem hora) — aceita `YYYY-MM-DD` puro (coluna `date` do banco) tratando
 *  como horário local, senão a interpretação UTC do `Date` nativo desloca o
 *  dia em fusos negativos (ex.: `2026-08-21` viraria 20/08 no Brasil). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const iso = value.length === 10 ? `${value}T00:00:00` : value
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

export const stripAccents = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

// ─── País ────────────────────────────────────────────────────
// Mesma abordagem do catálogo pessoal: só a lista de códigos ISO 3166-1 é
// estática; os nomes saem do Intl em runtime. Aqui fixo em pt-BR (a loja não
// tem seletor de idioma).

export const COUNTRY_CODES = [
  'AD','AE','AF','AG','AL','AM','AO','AR','AT','AU','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ',
  'BN','BO','BR','BS','BT','BW','BY','BZ','CA','CD','CF','CG','CH','CI','CL','CM','CN','CO','CR','CU',
  'CV','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FM','FR','GA',
  'GB','GD','GE','GH','GL','GM','GN','GQ','GR','GT','GW','GY','HN','HR','HT','HU','ID','IE','IL','IN',
  'IQ','IR','IS','IT','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KZ','LA','LB','LC',
  'LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MG','MH','MK','ML','MM','MN','MR','MT',
  'MU','MV','MW','MX','MY','MZ','NA','NE','NG','NI','NL','NO','NP','NR','NZ','OM','PA','PE','PG','PH',
  'PK','PL','PS','PT','PW','PY','QA','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SI','SK','SL',
  'SM','SN','SO','SR','SS','ST','SV','SY','SZ','TD','TG','TH','TJ','TL','TM','TN','TO','TR','TT','TV',
  'TW','TZ','UA','UG','US','UY','UZ','VA','VC','VE','VN','VU','WS','YE','ZA','ZM','ZW',
]

/** Pseudo-região para meteoritos do Noroeste da África. */
export const NWA_CODE = 'NWA'

let displayNames: Intl.DisplayNames | null = null
function getDisplayNames(): Intl.DisplayNames {
  if (!displayNames) displayNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' })
  return displayNames
}

export function countryName(iso: string | null | undefined): string {
  if (!iso) return ''
  const code = iso.toUpperCase()
  if (code === NWA_CODE) return 'Noroeste da África'
  try {
    return getDisplayNames().of(code) ?? iso
  } catch {
    return iso
  }
}

/** Emojis de bandeira não renderizam no Windows — usamos as imagens do flagcdn. */
export function flagUrl(iso: string | null | undefined): string | null {
  if (!iso) return null
  if (iso.toUpperCase() === NWA_CODE) return null
  if (iso.length !== 2) return null
  return `https://flagcdn.com/${iso.toLowerCase()}.svg`
}

/** Bandeiras QUADRADAS: a caixa precisa virar quadrada, não dá pra "conter". */
const ATYPICAL_FLAG_ASPECT = new Set(['CH', 'VA'])
export function hasAtypicalFlagAspect(iso: string | null | undefined): boolean {
  return !!iso && ATYPICAL_FLAG_ASPECT.has(iso.toUpperCase())
}

/** Proporção longe de 7:5 o bastante pra `object-cover` cortar conteúdo. */
const CONTAIN_STANDARD_BOX_FLAGS = new Set(['LK', 'AU', 'NP'])
export function fitsContainInStandardBox(iso: string | null | undefined): boolean {
  return !!iso && CONTAIN_STANDARD_BOX_FLAGS.has(iso.toUpperCase())
}

/** Desenho principal perto do mastro/tralha — recorte alinhado em vez de centralizado. */
const LEFT_ALIGN_FLAGS = new Set(['US', 'OM', 'CN'])
const RIGHT_ALIGN_FLAGS = new Set(['ZM'])
export function flagObjectPosition(iso: string | null | undefined): 'left' | 'right' | 'center' {
  if (!iso) return 'center'
  const code = iso.toUpperCase()
  if (LEFT_ALIGN_FLAGS.has(code)) return 'left'
  if (RIGHT_ALIGN_FLAGS.has(code)) return 'right'
  return 'center'
}

export function countryOptions(): { code: string; name: string }[] {
  return [...COUNTRY_CODES, NWA_CODE]
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

// ─── Localidade resumida — copiado de src/lib/format.ts do catálogo pessoal ───
// "Área de mineração de Oumjrane") ficam de fora de propósito — são o nome
// do lugar, não um nível administrativo, então não descartamos a palavra
// "Mina"/"Área de mineração de" isoladamente (só esta última tem "de" preso
// ao termo, por isso entra como frase inteira). Lista curada à mão conforme
// aparecem casos novos (pt/en/es) — decisão editorial, não exaustiva.
// pt/es (prefixo antes do nome: "Distrito de X", "Provincia de X") — as duas
// línguas compartilham quase todo o vocabulário administrativo, então a
// mesma entrada cobre as duas (com/sem acento).
const LOCALITY_ADMIN_PREFIXES_PT_ES = [
  'área de mineração',
  'área de minería',
  'cidade',
  'ciudad',
  'estado',
  'distrito',
  'município',
  'municipio',
  'comuna',
  'condado',
  'departamento',
  'província',
  'provincia',
  'região',
  'regiao',
  'círculo',
  'circulo',
  // As variantes "autônoma" vêm ANTES de "prefeitura"/"prefectura": a regex é
  // uma alternação, vence a primeira que casa — senão sobraria "Autônoma de X".
  'prefeitura autônoma',
  'prefeitura autonoma',
  'prefectura autónoma',
  'prefectura autonoma',
  'prefeitura',
  'prefectura',
  'regência',
  'regencia',
  'concelho',
  'cantón',
  'canton',
  'comarca',
  'gobernación',
  'gobernacion',
]

// en — mesmo padrão de prefixo ("District of X", "Mining District, X"), mas
// também aparece como SUFIXO em nomenclatura de origem britânica/americana
// ("Storey County", "St. James Parish") — ver LOCALITY_ADMIN_SUFFIXES_EN.
const LOCALITY_ADMIN_PREFIXES_EN = [
  'mining district',
  'mining area',
  'mining field',
  'district',
  'municipality',
  'county',
  'department',
  'province',
  'region',
  'circle',
  'prefecture',
  'governorate',
  'oblast',
  'canton',
  'parish',
  'borough',
  'township',
  'shire',
]

const LOCALITY_ADMIN_PREFIXES = [...LOCALITY_ADMIN_PREFIXES_PT_ES, ...LOCALITY_ADMIN_PREFIXES_EN]

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const LOCALITY_PREFIX_RE = new RegExp(
  `^(?:${LOCALITY_ADMIN_PREFIXES.map(escapeRe).join('|')})\\s+(?:de |do |da |of |del |de la )?`,
  'i',
)

// Nomenclatura EN onde o tipo administrativo vem DEPOIS do nome próprio
// ("Storey County", "St. James Parish", "Cook County") — ao contrário do
// padrão prefixo de pt/es. Só tentado quando o prefixo acima não bateu
// (ver stripAdminUnit), pra não competir com "County of X".
const LOCALITY_ADMIN_SUFFIXES_EN = ['county', 'parish', 'township', 'borough', 'shire', 'canton', 'prefecture']

const LOCALITY_SUFFIX_RE = new RegExp(`\\s+(?:${LOCALITY_ADMIN_SUFFIXES_EN.map(escapeRe).join('|')})$`, 'i')

/** Remove o tipo de unidade administrativa de UM trecho — prefixo (pt/es/en) primeiro, senão sufixo (padrão EN "X County"). */
function stripAdminUnit(part: string): string {
  const prefixStripped = part.replace(LOCALITY_PREFIX_RE, '')
  if (prefixStripped !== part) return prefixStripped
  return part.replace(LOCALITY_SUFFIX_RE, '')
}

/**
 * Localidade resumida: remove o "tipo de unidade administrativa" de cada
 * trecho separado por vírgula de `origin`, mantendo o nome próprio.
 * "Mahajanga, Distrito de Mahajanga I, Região de Boeny, Madagascar" →
 * "Mahajanga, Mahajanga I, Boeny, Madagascar". Funciona também em inglês
 * ("Storey County, Nevada" → "Storey, Nevada") e espanhol ("Provincia de
 * Tinghir" → "Tinghir"). Heurística por lista de termos conhecidos
 * (LOCALITY_ADMIN_PREFIXES/_SUFFIXES_EN) — não entende toda a variedade
 * administrativa do mundo, só o que já apareceu no acervo; ajustar a lista
 * conforme surgirem casos novos. Cada trecho é normalizado (trim) e
 * rejuntado com ", " — não preserva espaçamento irregular do texto original.
 */
export function summarizeLocality(origin: string | null | undefined): string {
  const trimmed = origin?.trim()
  if (!trimmed) return ''
  return trimmed
    .split(',')
    .map((part) => stripAdminUnit(part.trim()))
    .join(', ')
}

/** Localidade resumida efetiva: override manual (`origin_short`) se preenchido, senão a heurística automática a partir de `origin`. */
export function effectiveOriginShort(
  origin: string | null | undefined,
  originShort: string | null | undefined,
): string {
  const override = originShort?.trim()
  if (override) return override
  return summarizeLocality(origin)
}

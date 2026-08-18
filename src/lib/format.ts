export function formatMoney(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

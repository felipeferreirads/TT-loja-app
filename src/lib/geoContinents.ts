// Continentes e países para a categoria automática de localização — dados
// PUROS, sem idioma e sem domínio. Arquivo COMPARTILHADO com a loja
// (scripts/shared-ui.mjs): editar aqui e rodar `npm run ui:sync`.

/** Pseudo-país "Noroeste da África" (meteoritos sem país confirmado), igual a `NWA_CODE` de lib/format.ts. */
const NWA = 'NWA'

export type ContinentKey = 'africa' | 'americas' | 'asia' | 'europa' | 'oceania'

// Ícone = mapa em projeção ortográfica (arquivos enviados pelo dono, em
// public/continents/), não emoji — mostrado full-bleed no tile (GeoTile).
export const CONTINENTS: { key: ContinentKey; label: string; icon: string }[] = [
  { key: 'africa', label: 'África', icon: '/continents/africa.svg' },
  { key: 'americas', label: 'Américas', icon: '/continents/americas.svg' },
  { key: 'asia', label: 'Ásia', icon: '/continents/asia.svg' },
  { key: 'europa', label: 'Europa', icon: '/continents/europe.svg' },
  { key: 'oceania', label: 'Oceania', icon: '/continents/oceania.svg' },
]

/** País (ISO alpha-2, + NWA) → continente. Cobre `COUNTRY_CODES` de `lib/format.ts`. */
export const COUNTRY_CONTINENT: Record<string, ContinentKey> = {
  AD: 'europa', AE: 'asia', AF: 'asia', AG: 'americas', AL: 'europa', AM: 'asia', AO: 'africa',
  AR: 'americas', AT: 'europa', AU: 'oceania', AZ: 'asia', BA: 'europa', BB: 'americas',
  BD: 'asia', BE: 'europa', BF: 'africa', BG: 'europa', BH: 'asia', BI: 'africa', BJ: 'africa',
  BN: 'asia', BO: 'americas', BR: 'americas', BS: 'americas', BT: 'asia', BW: 'africa',
  BY: 'europa', BZ: 'americas', CA: 'americas', CD: 'africa', CF: 'africa', CG: 'africa',
  CH: 'europa', CI: 'africa', CL: 'americas', CM: 'africa', CN: 'asia', CO: 'americas',
  CR: 'americas', CU: 'americas', CV: 'africa', CY: 'europa', CZ: 'europa', DE: 'europa',
  DJ: 'africa', DK: 'europa', DM: 'americas', DO: 'americas', DZ: 'africa', EC: 'americas',
  EE: 'europa', EG: 'africa', EH: 'africa', ER: 'africa', ES: 'europa', ET: 'africa', FI: 'europa', FJ: 'oceania',
  FM: 'oceania', FR: 'europa', GA: 'africa', GB: 'europa', GD: 'americas', GE: 'asia', GH: 'africa',
  GL: 'americas', GM: 'africa', GN: 'africa', GQ: 'africa', GR: 'europa', GT: 'americas',
  GW: 'africa', GY: 'americas', HN: 'americas', HR: 'europa', HT: 'americas', HU: 'europa',
  ID: 'asia', IE: 'europa', IL: 'asia', IN: 'asia', IQ: 'asia', IR: 'asia', IS: 'europa', IT: 'europa',
  JM: 'americas', JO: 'asia', JP: 'asia', KE: 'africa', KG: 'asia', KH: 'asia', KI: 'oceania',
  KM: 'africa', KN: 'americas', KP: 'asia', KR: 'asia', KW: 'asia', KZ: 'asia', LA: 'asia',
  LB: 'asia', LC: 'americas', LI: 'europa', LK: 'asia', LR: 'africa', LS: 'africa', LT: 'europa',
  LU: 'europa', LV: 'europa', LY: 'africa', MA: 'africa', MC: 'europa', MD: 'europa', ME: 'europa',
  MG: 'africa', MH: 'oceania', MK: 'europa', ML: 'africa', MM: 'asia', MN: 'asia', MR: 'africa',
  MT: 'europa', MU: 'africa', MV: 'asia', MW: 'africa', MX: 'americas', MY: 'asia', MZ: 'africa',
  NA: 'africa', NE: 'africa', NG: 'africa', NI: 'americas', NL: 'europa', NO: 'europa', NP: 'asia',
  NR: 'oceania', NZ: 'oceania', OM: 'asia', PA: 'americas', PE: 'americas', PG: 'oceania',
  PH: 'asia', PK: 'asia', PL: 'europa', PS: 'asia', PT: 'europa', PW: 'oceania', PY: 'americas',
  QA: 'asia', RO: 'europa', RS: 'europa', RU: 'asia', RW: 'africa', SA: 'asia', SB: 'oceania',
  SC: 'africa', SD: 'africa', SE: 'europa', SG: 'asia', SI: 'europa', SK: 'europa', SL: 'africa',
  SM: 'europa', SN: 'africa', SO: 'africa', SR: 'americas', SS: 'africa', ST: 'africa',
  SV: 'americas', SY: 'asia', SZ: 'africa', TD: 'africa', TG: 'africa', TH: 'asia', TJ: 'asia',
  TL: 'asia', TM: 'asia', TN: 'africa', TO: 'oceania', TR: 'asia', TT: 'americas', TV: 'oceania',
  TW: 'asia', TZ: 'africa', UA: 'europa', UG: 'africa', US: 'americas', UY: 'americas',
  UZ: 'asia', VA: 'europa', VC: 'americas', VE: 'americas', VN: 'asia', VU: 'oceania',
  WS: 'oceania', YE: 'asia', ZA: 'africa', ZM: 'africa', ZW: 'africa',
  NWA: 'africa', // Noroeste da África (meteoritos)
}

/** Total de países catalogados (todos, ou só de um continente) — o "N" do contador (n/N). NWA não é país. */
export function countryTotal(continent?: ContinentKey): number {
  return Object.entries(COUNTRY_CONTINENT).filter(([code, k]) => code !== NWA && (!continent || k === continent)).length
}

/** Quantos dos códigos dados são países de verdade (exclui NWA) — o "n" do contador (n/N). */
export function countCountries(codes: Iterable<string>): number {
  let n = 0
  for (const c of codes) if (c !== NWA) n++
  return n
}


// Paleta categórica do mapa de continentes — cor fixa por continente, sem
// relação com densidade de itens.
export const CONTINENT_COLORS: Record<ContinentKey, string> = {
  africa: '#f59e0b', // amber-500
  americas: '#34d399', // emerald-400
  asia: '#f87171', // red-400
  europa: '#60a5fa', // blue-400
  oceania: '#c084fc', // purple-400
}

/** Cinza "sem itens" (mesmo do mapa de densidade das Estatísticas, stone-300). */
export const CONTINENT_NEUTRAL_COLOR = '#d6d3d1'

export const CONTINENT_LEGEND = CONTINENTS.map((c) => ({ label: c.label, color: CONTINENT_COLORS[c.key] }))

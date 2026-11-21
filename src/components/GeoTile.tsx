import { Link } from 'react-router-dom'
import { fitsContainInStandardBox, flagObjectPosition, hasAtypicalFlagAspect } from '../lib/format'

/**
 * Tile de continente (mapa em projeção ortográfica, `public/continents/`,
 * quadrado, sempre `object-contain`) OU de país (`countryCode` — a bandeira, na
 * caixa 7:5 igual para todos; as quadradas viram quadradas e as de proporção
 * fora do padrão usam `object-contain`). Arquivo COMPARTILHADO entre o catálogo
 * e a loja (scripts/shared-ui.mjs): sem idioma — a contagem já vem formatada.
 */
export function GeoTile({
  to,
  imageSrc,
  square,
  countryCode,
  label,
  countLabel,
}: {
  to: string
  imageSrc: string
  /** true = continente (mapa quadrado); false/ausente = país (bandeira). */
  square?: boolean
  /** Código ISO do país — só para tile de país, decide o tratamento de proporção atípica. */
  countryCode?: string
  label: string
  /** Ex.: "12 itens". */
  countLabel: string
}) {
  const atypical = !square && hasAtypicalFlagAspect(countryCode)
  const contain = !square && fitsContainInStandardBox(countryCode)
  const boxClass = square || atypical ? 'aspect-square' : 'aspect-[7/5]'
  const fitClass = square || atypical || contain ? 'object-contain' : 'object-cover'
  const flagPosition = flagObjectPosition(countryCode)
  const positionClass = flagPosition === 'left' ? 'object-left' : flagPosition === 'right' ? 'object-right' : ''
  return (
    <Link to={to} className="block overflow-hidden rounded-xl bg-stone-900 transition hover:bg-stone-800">
      <div className={`flex items-center justify-center bg-stone-800 ${boxClass}`}>
        <img src={imageSrc} alt="" className={`h-full w-full ${fitClass} ${positionClass}`} />
      </div>
      <div className="p-2">
        <p className="leading-snug font-bold break-words text-stone-100">{label}</p>
        <p className="text-xs text-stone-500">{countLabel}</p>
      </div>
    </Link>
  )
}

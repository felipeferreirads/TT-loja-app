import { countryName, fitsContainInStandardBox, flagObjectPosition, flagUrl, hasAtypicalFlagAspect } from '../lib/format'

/**
 * Bandeira do país em caixa 7:5 (a proporção mais comum), com os ajustes por
 * bandeira que o catálogo pessoal já calibrou: quadradas ganham caixa quadrada,
 * proporções distantes usam `contain`, e as com desenho junto ao mastro/tralha
 * alinham o recorte em vez de centralizar.
 */
export function Flag({ code, className = '' }: { code: string | null | undefined; className?: string }) {
  const url = flagUrl(code)
  if (!url) return null
  const square = hasAtypicalFlagAspect(code)
  const contain = fitsContainInStandardBox(code)
  return (
    <img
      src={url}
      alt={countryName(code)}
      loading="lazy"
      className={`inline-block shrink-0 rounded-xs ${square ? 'aspect-square' : 'aspect-[7/5]'} ${contain ? 'object-contain' : 'object-cover'} ${className || 'h-4'}`}
      style={{ objectPosition: flagObjectPosition(code) }}
    />
  )
}

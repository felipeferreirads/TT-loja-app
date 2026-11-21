import { useEffect, useState } from 'react'

/** Abaixo do breakpoint `md` do Tailwind (768px). */
export const BELOW_MD_QUERY = '(max-width: 767px)'

/** `true` enquanto a media query casar — reage a resize/rotação. */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatch(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return match
}

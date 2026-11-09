import { useEffect, useState } from 'react'

/** Mesmo corte `sm` do Tailwind (640px) — abaixo disso a UI é "celular". */
const MOBILE_BREAKPOINT = 640

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

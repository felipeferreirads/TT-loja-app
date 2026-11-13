import { useState } from 'react'

/** Preferência numérica local (por dispositivo) persistida em localStorage —
 * mesma estratégia de `useLocalToggle.ts`, para um valor numérico (ex.: a
 * largura arrastável de um painel) em vez de um booleano. Sem broadcast entre
 * instâncias: diferente do toggle, nada mais no app lê essa largura, então
 * não há risco de dessincronia entre dois componentes montados ao mesmo
 * tempo. Nunca lança: localStorage indisponível só faz a preferência não
 * persistir. */
export function useLocalNumber(key: string, def: number, min: number, max: number) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const [value, setValue] = useState<number>(() => {
    try {
      const s = window.localStorage.getItem(key)
      const n = s === null ? def : Number(s)
      return Number.isFinite(n) ? clamp(n) : def
    } catch {
      return def
    }
  })

  const set = (next: number) => {
    const resolved = clamp(next)
    setValue(resolved)
    try {
      window.localStorage.setItem(key, String(resolved))
    } catch {
      /* localStorage indisponível — só não persiste */
    }
  }

  return [value, set] as const
}

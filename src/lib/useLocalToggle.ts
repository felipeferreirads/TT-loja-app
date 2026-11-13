import { useCallback, useEffect, useState } from 'react'

function readToggle(key: string, def: boolean): boolean {
  try {
    const s = window.localStorage.getItem(key)
    return s === null ? def : s === '1'
  } catch {
    return def
  }
}

// Prefixo do evento de broadcast — ver comentário abaixo.
const EVENT_PREFIX = 'tt_loja:local-toggle:'

/** Preferência booleana local (por dispositivo) persistida em localStorage —
 * mesma estratégia de `labelPrefs.ts`, para um único valor booleano em vez de
 * um objeto de opções. Nunca lança: localStorage indisponível (modo privado
 * etc.) só faz a preferência não persistir.
 *
 * Transmite a mudança por um `CustomEvent` na mesma aba (o evento nativo
 * `storage` só dispara em OUTRAS abas) — sem isso, duas instâncias montadas
 * ao mesmo tempo com a mesma `key` (ex.: um toggle em Configurações, que abre
 * como diálogo por cima da página, e o componente que lê essa preferência na
 * página por baixo) ficam dessincronizadas: a de baixo só veria o valor novo
 * ao remontar. */
export function useLocalToggle(key: string, def: boolean) {
  const [v, setV] = useState<boolean>(() => readToggle(key, def))

  useEffect(() => {
    setV(readToggle(key, def))
    const onChange = (e: Event) => setV((e as CustomEvent<boolean>).detail)
    window.addEventListener(EVENT_PREFIX + key, onChange)
    return () => window.removeEventListener(EVENT_PREFIX + key, onChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Aceita tanto um valor quanto uma função de atualização (como o `setState`
  // do React) — havia chamador (sidebar do Layout) que já dependia da forma
  // funcional (`(v) => !v`) pra alternar dois estados no mesmo clique.
  const set = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof next === 'function' ? next(v) : next
      try {
        window.localStorage.setItem(key, resolved ? '1' : '0')
      } catch {
        /* localStorage indisponível — só não persiste */
      }
      window.dispatchEvent(new CustomEvent(EVENT_PREFIX + key, { detail: resolved }))
    },
    [key, v],
  )

  return [v, set] as const
}

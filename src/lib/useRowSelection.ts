import { useCallback, useMemo, useState } from 'react'

/**
 * Seleção em massa de uma lista: modo "selecionando" + conjunto de ids.
 * `prune` descarta ids que sumiram da lista (ex.: apagados ou filtrados) pra
 * a contagem da barra nunca contar item invisível.
 */
export function useRowSelection() {
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const start = useCallback((id?: string) => {
    setSelecting(true)
    if (id) setSelected(new Set([id]))
  }, [])
  const clear = useCallback(() => setSelected(new Set()), [])
  const cancel = useCallback(() => {
    setSelected(new Set())
    setSelecting(false)
  }, [])
  const selectAll = useCallback((ids: string[]) => setSelected(new Set(ids)), [])
  const prune = useCallback((valid: Set<string>) => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [])

  const ids = useMemo(() => [...selected], [selected])
  return { selecting, selected, ids, toggle, start, clear, cancel, selectAll, prune }
}

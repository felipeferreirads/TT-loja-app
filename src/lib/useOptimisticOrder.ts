import { useCallback, useEffect, useMemo, useState } from 'react'

/** Teto de segurança: se a confirmação nunca chegar (erro no salvamento), volta à ordem real. */
const PENDING_TIMEOUT_MS = 20_000

/**
 * Ordem OTIMISTA para listas reordenáveis por arrastar-soltar cuja ordem
 * vem do servidor (álbuns, mídias, vídeos, arquivos da Biblioteca).
 *
 * Sem isto, ao soltar o item a lista voltava pra ordem antiga (os `items`
 * ainda são os do cache) e só depois do refetch pulava pro lugar escolhido —
 * um "rollback" visual. Aqui a ordem nova fica na tela na hora e é mantida
 * até os `items` reais confirmarem (mesma ordem), ou o conjunto mudar
 * (item criado/apagado), ou estourar o teto de segurança.
 *
 * Uso: `const [ordered, applyOrder, resetOrder] = useOptimisticOrder(items, (m) => m.id)`
 * — renderizar `ordered`, chamar `applyOrder(novaLista)` no onDragEnd antes
 * de salvar, e `resetOrder()` se o salvamento falhar.
 */
export function useOptimisticOrder<T>(items: T[], getId: (item: T) => string) {
  const [pending, setPending] = useState<string[] | null>(null)
  const idsKey = items.map(getId).join('\u0000')

  useEffect(() => {
    if (!pending) return
    const ids = idsKey ? idsKey.split('\u0000') : []
    const sameSet = ids.length === pending.length && ids.every((id) => pending.includes(id))
    if (!sameSet || ids.join('\u0000') === pending.join('\u0000')) setPending(null)
  }, [idsKey, pending])

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => setPending(null), PENDING_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [pending])

  const ordered = useMemo(() => {
    if (!pending) return items
    const byId = new Map(items.map((item) => [getId(item), item] as const))
    if (pending.length !== items.length || pending.some((id) => !byId.has(id))) return items
    return pending.map((id) => byId.get(id)!)
    // getId é estável na prática (arrow inline só lê `.id`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, pending])

  const applyOrder = useCallback((next: T[]) => setPending(next.map(getId)), [getId])
  const resetOrder = useCallback(() => setPending(null), [])

  return [ordered, applyOrder, resetOrder] as const
}

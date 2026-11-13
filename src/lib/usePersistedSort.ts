import { useCallback, useState } from 'react'

export type SortDirection = 'asc' | 'desc'
export interface SortState<K extends string> {
  field: K
  dir: SortDirection
}

function read<K extends string>(key: string, fields: readonly K[], fallback: SortState<K>): SortState<K> {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<SortState<K>>
    if (parsed.field && fields.includes(parsed.field) && (parsed.dir === 'asc' || parsed.dir === 'desc')) {
      return { field: parsed.field, dir: parsed.dir }
    }
  } catch {
    // localStorage indisponível ou valor corrompido: cai no padrão.
  }
  return fallback
}

/**
 * Ordenação (campo + direção) das listas de Documentos e Fornecedores,
 * guardada no dispositivo — mesma estratégia da Coleção (`useSpecimenBrowser`):
 * é preferência do aparelho, não um filtro, então "Limpar filtros" não mexe nela.
 * Trocar de campo aplica a direção inicial própria dele (`defaultDir`).
 */
export function usePersistedSort<K extends string>(
  storageKey: string,
  fields: readonly K[],
  fallback: SortState<K>,
  defaultDir: (field: K) => SortDirection,
) {
  const [sort, setSort] = useState<SortState<K>>(() => read(storageKey, fields, fallback))

  const apply = useCallback(
    (next: SortState<K>) => {
      setSort(next)
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // Sem persistência: a ordenação vale só nesta sessão.
      }
    },
    [storageKey],
  )

  const changeField = useCallback((field: K) => apply({ field, dir: defaultDir(field) }), [apply, defaultDir])
  const toggleDir = useCallback(() => apply({ field: sort.field, dir: sort.dir === 'asc' ? 'desc' : 'asc' }), [apply, sort])
  /** Clique no cabeçalho de coluna: mesma coluna inverte, outra aplica a direção inicial dela. */
  const clickField = useCallback(
    (field: K) => (field === sort.field ? toggleDir() : changeField(field)),
    [sort.field, toggleDir, changeField],
  )

  return { ...sort, changeField, toggleDir, clickField }
}

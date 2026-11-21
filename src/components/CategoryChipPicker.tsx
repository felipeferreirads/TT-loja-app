import { useEffect, useMemo, useState } from 'react'
import { buildCategoryTree, flattenTree, type CategoryLike, type CategoryTreeNode } from '../lib/categoryTree'
import { contrastTextColor, effectiveCategoryColor } from '../features/categories/colors'
import { CategoryIcon, PlusIcon, SubcategoryIcon } from './icons'
import { AppSelect } from './AppSelect'

// Seletor de categorias da ficha — chips na cor efetiva da categoria
// (marcado = preenchido, desmarcado = contorno), subcategorias indentadas
// abaixo da mãe e famílias distribuídas em colunas. Arquivo COMPARTILHADO entre
// o catálogo e a loja (scripts/shared-ui.mjs): sem idioma e sem domínio — os
// textos e a criação de categoria entram por props.

type PickerCategory = CategoryLike & { color: string | null }

export interface CategoryChipPickerLabels {
  hint: string
  newCategory: string
  insideOptional: string
  topLevel: string
  create: string
  cancel: string
}

/** Nº de colunas: 2 no celular, 3 a partir de 768px. */
function useColumnCount(): number {
  const [count, setCount] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return 2
    return window.matchMedia('(min-width: 768px)').matches ? 3 : 2
  })
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setCount(mq.matches ? 3 : 2)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return count
}

/**
 * Distribui as famílias na ordem declarada, sempre na coluna de menor altura
 * acumulada (empate → mais à esquerda). Em JS, não CSS `columns-N`: o
 * multi-column balanceia por altura medida e deixava colunas desiguais.
 */
function distributeGroups<T extends { length: number }>(groups: T[], columns: number): T[][] {
  const buckets: T[][] = Array.from({ length: columns }, () => [])
  const load = new Array<number>(columns).fill(0)
  for (const group of groups) {
    let target = 0
    for (let i = 1; i < columns; i++) if (load[i] < load[target]) target = i
    buckets[target].push(group)
    load[target] += group.length
  }
  return buckets
}

export function CategoryChipPicker<T extends PickerCategory>({
  categories,
  allCategories,
  value,
  onChange,
  onCreate,
  onError,
  labels,
}: {
  /** Categorias que podem aparecer (já filtradas, ex.: sem as privadas com o PIN travado). */
  categories: T[]
  /** Lista completa, para resolver a cor herdada da mãe. */
  allCategories: T[]
  value: string[]
  onChange: (ids: string[]) => void
  /** Cria a categoria e devolve o id dela (já marcada no seletor). */
  onCreate: (name: string, parentId: string | null) => Promise<string>
  onError: (message: string) => void
  labels: CategoryChipPickerLabels
}) {
  const categoryList = useMemo(() => flattenTree(buildCategoryTree(categories)), [categories])
  const columns = useColumnCount()

  const groups = useMemo(() => {
    const out: { category: CategoryTreeNode<T>; depth: number }[][] = []
    for (const item of categoryList) {
      if (item.depth === 0) out.push([item])
      else out[out.length - 1]?.push(item)
    }
    return out
  }, [categoryList])

  const buckets = useMemo(() => distributeGroups(groups, columns), [groups, columns])

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newParent, setNewParent] = useState('')

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((c) => c !== id) : [...value, id])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const id = await onCreate(newName.trim(), newParent || null)
      onChange([...value, id])
      setNewName('')
      setNewParent('')
      setCreating(false)
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">{labels.hint}</p>

      {groups.length > 0 && (
        <div className="grid items-start gap-x-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {buckets.map((bucket, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-2">
              {bucket.map((group) => (
                <div key={group[0].category.id} className="min-w-0 space-y-1.5">
                  {group.map(({ category, depth }) => {
                    const selected = value.includes(category.id)
                    const color = effectiveCategoryColor(allCategories, category.id)
                    return (
                      <div key={category.id} className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
                        {depth > 0 && <SubcategoryIcon className="text-stone-600" aria-hidden />}
                        <button
                          type="button"
                          onClick={() => toggle(category.id)}
                          aria-pressed={selected}
                          style={selected ? { backgroundColor: color, color: contrastTextColor(color) } : { borderColor: color, color }}
                          className={
                            selected
                              ? 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition hover:opacity-90'
                              : 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition hover:opacity-70'
                          }
                        >
                          <CategoryIcon aria-hidden />
                          {category.name}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {creating ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-stone-400">{labels.newCategory}</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input" autoFocus />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-stone-400">{labels.insideOptional}</span>
            <AppSelect value={newParent} onChange={(e) => setNewParent(e.target.value)} className="input">
              <option value="">{labels.topLevel}</option>
              {categoryList.map(({ category, depth }) => (
                <option key={category.id} value={category.id}>
                  {' '.repeat(depth * 3)}
                  {category.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <button type="button" onClick={() => void handleCreate()} className="btn-secondary">
            {labels.create}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false)
              setNewName('')
              setNewParent('')
            }}
            className="btn-secondary"
          >
            {labels.cancel}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-stone-600 px-3 py-1 text-sm text-stone-400 transition hover:border-stone-400 hover:text-stone-200"
        >
          <PlusIcon aria-hidden />
          {labels.newCategory}
        </button>
      )}
    </div>
  )
}

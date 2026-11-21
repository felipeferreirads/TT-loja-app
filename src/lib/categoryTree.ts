// Árvore de categorias (pai → filhas) — funções PURAS, sem idioma e sem
// domínio. Arquivo COMPARTILHADO com a loja (scripts/shared-ui.mjs): editar
// aqui e rodar `npm run ui:sync`. Valem para `categories` do catálogo e para
// `store_categories` da loja (mesmo formato: id, parent_id, name, sort_order).

export interface CategoryLike {
  id: string
  parent_id: string | null
  name: string
  sort_order: number
}

export type CategoryTreeNode<T extends CategoryLike> = T & { children: CategoryTreeNode<T>[] }

export function buildCategoryTree<T extends CategoryLike>(categories: T[]): CategoryTreeNode<T>[] {
  const byId = new Map<string, CategoryTreeNode<T>>(categories.map((c) => [c.id, { ...c, children: [] }]))
  const roots: CategoryTreeNode<T>[] = []
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

/** Ids da categoria + todas as descendentes (para filtrar itens). */
export function categoryWithDescendants(categories: Pick<CategoryLike, 'id' | 'parent_id'>[], id: string): Set<string> {
  const ids = new Set<string>([id])
  let changed = true
  while (changed) {
    changed = false
    for (const c of categories) {
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id)
        changed = true
      }
    }
  }
  return ids
}

/** Descendentes de uma categoria (não inclui ela mesma) — evita ciclos ao mover. */
export function descendantIds(categories: Pick<CategoryLike, 'id' | 'parent_id'>[], id: string): Set<string> {
  const all = categoryWithDescendants(categories, id)
  all.delete(id)
  return all
}

/** Lista achatada com profundidade, na ordem da árvore (para seletores). */
export function flattenTree<T extends CategoryLike>(
  nodes: CategoryTreeNode<T>[],
  depth = 0,
): { category: CategoryTreeNode<T>; depth: number }[] {
  return nodes.flatMap((n) => [{ category: n, depth }, ...flattenTree(n.children, depth + 1)])
}

/**
 * Ordena um SUBCONJUNTO de categorias pela hierarquia: a mãe sempre antes das
 * filhas, e famílias diferentes agrupadas. A chave é o CAMINHO até a raiz,
 * comparado nível a nível. `all` precisa conter os ancestrais.
 */
export function sortByHierarchy<T extends CategoryLike>(all: CategoryLike[], subset: T[]): T[] {
  const byId = new Map(all.map((c) => [c.id, c]))
  const pathOf = (c: T): Array<[number, string]> => {
    const path: Array<[number, string]> = []
    const seen = new Set<string>()
    let current: CategoryLike | undefined = c
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      path.unshift([current.sort_order, current.name.toLocaleLowerCase('pt-BR')])
      current = current.parent_id ? byId.get(current.parent_id) : undefined
    }
    return path
  }
  return [...subset]
    .map((c) => ({ c, path: pathOf(c) }))
    .sort((a, b) => {
      const n = Math.min(a.path.length, b.path.length)
      for (let i = 0; i < n; i++) {
        const [orderA, nameA] = a.path[i]
        const [orderB, nameB] = b.path[i]
        if (orderA !== orderB) return orderA - orderB
        const cmp = nameA.localeCompare(nameB, 'pt-BR')
        if (cmp !== 0) return cmp
      }
      return a.path.length - b.path.length
    })
    .map((x) => x.c)
}

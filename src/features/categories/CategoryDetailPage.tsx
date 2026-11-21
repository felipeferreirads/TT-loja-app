import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { StoreProduct } from '../../types/db'
import { CategoryIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { PromptDialog } from '../../components/PromptDialog'
import { useToast } from '../../components/ToastProvider'
import { PickProductsDialog } from '../documents/PickProductsDialog'
import { ProductsPage } from '../products/ProductsPage'
import { useCoverUrls, useProducts } from '../products/queries'
import { addProductsToCategory, buildCategoryTree, categoryWithDescendants, createCategory, removeProductsFromCategory, useCategories } from './api'
import { effectiveCategoryColor } from './colors'
import { AlbumCollection, productsInCategory } from './CategoriesPage'
import { Breadcrumb } from './Breadcrumb'

// Página de uma categoria (álbum): subcategorias em cima e os produtos da
// categoria (com os das subcategorias) na lista completa de produtos, com
// "Adicionar produtos", "Nova subcategoria" e "Remover da categoria" na seleção
// em massa — mesmo papel de `CategoryDetailPage.tsx` do catálogo pessoal.

const EMPTY: StoreProduct[] = []
const EMPTY_COVERS: Record<string, string> = {}

export function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: categories, isLoading } = useCategories()
  const products = useProducts().data ?? EMPTY
  const coverUrls = useCoverUrls().data ?? EMPTY_COVERS
  const toast = useToast()
  const [creatingSub, setCreatingSub] = useState(false)
  const [picking, setPicking] = useState(false)
  const [reordering, setReordering] = useState(false)

  const all = useMemo(() => categories ?? [], [categories])
  const category = all.find((c) => c.id === id)
  const node = useMemo(() => {
    const find = (nodes: ReturnType<typeof buildCategoryTree<(typeof all)[number]>>): (typeof nodes)[number] | undefined => {
      for (const n of nodes) {
        if (n.id === id) return n
        const hit = find(n.children)
        if (hit) return hit
      }
      return undefined
    }
    return find(buildCategoryTree(all))
  }, [all, id])
  const items = useMemo(() => (id ? productsInCategory(products, categoryWithDescendants(all, id)) : EMPTY), [products, all, id])
  const directIds = useMemo(() => products.filter((p) => (p.category_ids ?? []).includes(id ?? '')).map((p) => p.id), [products, id])

  const trail = useMemo(() => {
    const chain: { label: string; to?: string }[] = []
    let current = category
    const seen = new Set<string>()
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      chain.unshift({ label: current.name, to: current.id === id ? undefined : `/categorias/${current.id}` })
      current = current.parent_id ? all.find((c) => c.id === current!.parent_id) : undefined
    }
    return [{ label: 'Categorias', to: '/categorias' }, ...chain]
  }, [category, all, id])

  if (isLoading) return <p className="py-12 text-center text-stone-500">Carregando…</p>
  if (!category || !node || !id) return <p className="py-12 text-center text-stone-500">Categoria não encontrada.</p>

  const color = effectiveCategoryColor(all, id)

  return (
    <>
      <ProductsPage
        scope={items}
        above={
          <>
            <Breadcrumb items={trail} />
            {node.children.length > 0 && (
              <AlbumCollection
                nodes={node.children}
                allCategories={all}
                products={products}
                coverUrls={coverUrls}
                view="grid"
                reordering={reordering}
                onStartReorder={() => setReordering(true)}
              />
            )}
            {reordering && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-700/60 bg-stone-900 p-3">
                <span className="text-sm text-stone-300">Arraste as subcategorias para mudar a ordem.</span>
                <button onClick={() => setReordering(false)} className="btn-primary ml-auto">
                  Concluir
                </button>
              </div>
            )}
          </>
        }
        title={
          <span className="inline-flex items-center gap-2">
            <span style={{ color }}>
              <CategoryIcon />
            </span>
            {category.name}
          </span>
        }
        headerActions={
          <>
            <button
              type="button"
              onClick={() => setCreatingSub(true)}
              className="btn-secondary h-9 min-h-9 gap-1.5 py-0"
              title="Nova subcategoria"
            >
              <PlusIcon />
              Subcategoria
            </button>
            <button type="button" onClick={() => setPicking(true)} className="btn-secondary h-9 min-h-9 gap-1.5 py-0" title="Adicionar produtos à categoria">
              <PlusIcon />
              Produtos
            </button>
          </>
        }
        emptyMessage="Nenhum produto nesta categoria. Para adicionar, use o botão Produtos ou a seção Categorias na ficha do produto."
        extraBulkActions={(selected, clear) => {
          const direct = selected.filter((p) => (p.category_ids ?? []).includes(id))
          return [
            {
              key: 'remove-from-category',
              label: 'Remover da categoria',
              icon: <TrashIcon />,
              disabled: direct.length === 0,
              onClick: async () => {
                try {
                  await removeProductsFromCategory(
                    id,
                    direct.map((p) => p.id),
                  )
                  toast.success(`${direct.length} ${direct.length === 1 ? 'produto removido' : 'produtos removidos'} da categoria.`)
                  clear()
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Não foi possível remover.')
                }
              },
            },
          ]
        }}
      />
      {creatingSub && (
        <PromptDialog
          title="Nova subcategoria"
          label="Nome da categoria"
          confirmLabel="Criar"
          cancelLabel="Cancelar"
          onConfirm={async (name) => {
            await createCategory(name, id)
            setCreatingSub(false)
          }}
          onClose={() => setCreatingSub(false)}
        />
      )}
      {picking && (
        <PickProductsDialog
          excludeIds={directIds}
          onCancel={() => setPicking(false)}
          onConfirm={async (ids) => {
            setPicking(false)
            try {
              await addProductsToCategory(id, ids)
              toast.success(`${ids.length} ${ids.length === 1 ? 'produto adicionado' : 'produtos adicionados'} à categoria.`)
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Não foi possível adicionar.')
            }
          }}
        />
      )}
    </>
  )
}

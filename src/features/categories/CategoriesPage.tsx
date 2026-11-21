import { useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Link } from 'react-router-dom'
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { StoreCategory, StoreProduct } from '../../types/db'
import {
  buildCategoryTree,
  categoryWithDescendants,
  createCategory,
  deleteCategory,
  descendantIds,
  flattenTree,
  moveCategory,
  removeCategoryCover,
  renameCategory,
  setCategoryCover,
  updateCategoryColor,
  updateCategoryOrder,
  uploadCategoryCover,
  useCategories,
  useCategoryCoverUrl,
  type CategoryNode,
} from './api'
import { CATEGORY_COLORS, effectiveCategoryColor } from './colors'
import { countGeoItems } from './geoCategories'
import {
  CategoryIcon,
  GearIcon,
  GridViewIcon,
  GripIcon,
  ListViewIcon,
  MoveToAlbumIcon,
  PencilIcon,
  PhotoIcon,
  PlusIcon,
  SearchIcon,
  SpecimenIcon,
  StarIcon,
  SubcategoryIcon,
  TrashIcon,
} from '../../components/icons'
import { ActionMenu, type ActionMenuItem } from '../../components/ActionMenu'
import { PromptDialog } from '../../components/PromptDialog'
import { AppSelect } from '../../components/AppSelect'
import { VirtualCategoryTile } from '../../components/VirtualCategoryTile'
import { useAlert, useConfirm } from '../../components/DialogProvider'
import { useLongPress } from '../../lib/useLongPress'
import { useOptimisticOrder } from '../../lib/useOptimisticOrder'
import { useCoverUrls, useProducts } from '../products/queries'

// Categorias da loja (0042) — mesma tela de `features/categories/CategoriesPage.tsx`
// do catálogo pessoal (álbuns em grade ou lista, reordenar arrastando, cor,
// capa, mover, excluir, categorias automáticas no topo), sobre produtos.
// Sem modo de edição nem PIN: a loja é sempre editável.

const getNodeId = (n: CategoryNode) => n.id
type AlbumView = 'grid' | 'list'
const VIEW_KEY = 'tt_loja_category_view'
const EMPTY_PRODUCTS: StoreProduct[] = []
const EMPTY_COVERS: Record<string, string> = {}

export const itemsLabel = (n: number) => `${n} ${n === 1 ? 'item' : 'itens'}`

/** Produtos de uma categoria, INCLUINDO os das subcategorias. */
export function productsInCategory(products: StoreProduct[], ids: Set<string>): StoreProduct[] {
  return products.filter((p) => (p.category_ids ?? []).some((id) => ids.has(id)))
}

/** URL da capa derivada: o produto escolhido, senão a primeira foto entre os produtos da categoria. */
export function derivedCoverUrl(products: StoreProduct[], coverUrls: Record<string, string>, coverProductId: string | null): string | null {
  if (coverProductId && coverUrls[coverProductId] && products.some((p) => p.id === coverProductId)) return coverUrls[coverProductId]
  for (const p of products) if (coverUrls[p.id]) return coverUrls[p.id]
  return null
}

export function CategoriesPage() {
  const { data: categories, isLoading, error } = useCategories()
  const products = useProducts().data ?? EMPTY_PRODUCTS
  const coverUrls = useCoverUrls().data ?? EMPTY_COVERS
  const [view, setView] = useState<AlbumView>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })
  const [reordering, setReordering] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const tree = useMemo(() => buildCategoryTree(categories ?? []), [categories])
  const visibleCount = useMemo(() => flattenTree(tree).length, [tree])
  const geoItemCount = useMemo(() => countGeoItems(products), [products])
  const geoTimeItemCount = useMemo(() => products.filter((p) => p.kind === 'fossil' && p.geological_time_id).length, [products])
  const mineralDataItemCount = useMemo(() => products.filter((p) => (p.minerals ?? []).some((m) => m.name?.trim())).length, [products])

  const displayNodes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tree
    return flattenTree(tree)
      .filter(({ category }) => category.name.toLowerCase().includes(q))
      .map(({ category }) => ({ ...category, children: [] }))
  }, [tree, search])

  const changeView = (v: AlbumView) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* só não persiste */
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-100">
          Categorias {categories && <span className="text-sm font-normal text-stone-500">({visibleCount})</span>}
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-full bg-stone-800">
            <button
              onClick={() => changeView('grid')}
              title="Grade"
              aria-label="Grade"
              aria-pressed={view === 'grid'}
              className={`px-3 py-1.5 transition ${view === 'grid' ? 'bg-amber-600 text-white' : 'text-stone-300 hover:bg-stone-700'}`}
            >
              <GridViewIcon />
            </button>
            <button
              onClick={() => changeView('list')}
              title="Lista"
              aria-label="Lista"
              aria-pressed={view === 'list'}
              className={`px-3 py-1.5 transition ${view === 'list' ? 'bg-amber-600 text-white' : 'text-stone-300 hover:bg-stone-700'}`}
            >
              <ListViewIcon />
            </button>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="btn-primary inline-flex h-9 min-h-9 w-9 items-center justify-center px-0 py-0"
            title="Nova categoria"
            aria-label="Nova categoria"
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      {reordering && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 px-2 pb-2">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-2 rounded-xl border border-amber-700/60 bg-stone-900/95 p-3 shadow-xl backdrop-blur">
            <GripIcon />
            <span className="text-sm text-stone-300">Arraste os álbuns para mudar a ordem.</span>
            <button onClick={() => setReordering(false)} className="btn-primary ml-auto">
              Concluir
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <VirtualCategoryTile
          to="/categorias/localizacao"
          image="/localizacao.png"
          title="Distribuição Geográfica"
          subtitle={`${itemsLabel(geoItemCount)} por continente e país`}
        />
        <VirtualCategoryTile
          to="/categorias/tempo-geologico"
          image="/escala-tempo-geologica.png"
          title="Escala de Tempo Geológica"
          subtitle={`${geoTimeItemCount} ${geoTimeItemCount === 1 ? 'fóssil classificado' : 'fósseis classificados'}`}
        />
        <VirtualCategoryTile
          to="/categorias/especie-mineral"
          image="/especie-mineral.png"
          title="Espécie Mineral"
          subtitle={`${itemsLabel(mineralDataItemCount)} com mineral identificado`}
        />
        <VirtualCategoryTile
          to="/categorias/quimica"
          image="/quimica.png"
          title="Tabela Periódica"
          subtitle={`${itemsLabel(mineralDataItemCount)} com mineral identificado`}
        />
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-500" />
        <input type="search" placeholder="Buscar categoria pelo nome…" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" />
      </div>

      {isLoading && <p className="py-12 text-center text-stone-500">Carregando…</p>}
      {error && !categories && <p className="py-12 text-center text-red-400">{(error as Error).message}</p>}
      {categories && categories.length === 0 && (
        <p className="py-12 text-center text-stone-500">Nenhuma categoria ainda. Crie uma e selecione os produtos nela ao editar.</p>
      )}
      {categories && categories.length > 0 && displayNodes.length === 0 && (
        <p className="py-12 text-center text-stone-500">Nenhuma categoria com esse nome.</p>
      )}

      <AlbumCollection
        nodes={displayNodes}
        allCategories={categories ?? []}
        products={products}
        coverUrls={coverUrls}
        view={view}
        reordering={reordering}
        onStartReorder={() => setReordering(true)}
      />
      {reordering && <div className="h-28" aria-hidden />}

      {creating && (
        <PromptDialog
          title="Nova categoria"
          label="Nome da categoria"
          confirmLabel="Criar"
          cancelLabel="Cancelar"
          onConfirm={async (name) => {
            await createCategory(name, null)
            setCreating(false)
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  )
}

export function AlbumCollection({
  nodes,
  allCategories,
  products,
  coverUrls,
  view,
  reordering,
  onStartReorder,
}: {
  nodes: CategoryNode[]
  allCategories: StoreCategory[]
  products: StoreProduct[]
  coverUrls: Record<string, string>
  view: AlbumView
  reordering: boolean
  onStartReorder: () => void
}) {
  const alert = useAlert()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )
  // Suprime o clique-fantasma que o navegador dispara ao soltar um arrasto (ver catálogo).
  const justDraggedRef = useRef(false)
  const [orderedNodes, applyOrder, resetOrder] = useOptimisticOrder(nodes, getNodeId)

  const handleDragEnd = async (event: DragEndEvent) => {
    setTimeout(() => {
      justDraggedRef.current = false
    }, 300)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedNodes.findIndex((n) => n.id === active.id)
    const newIndex = orderedNodes.findIndex((n) => n.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(orderedNodes, oldIndex, newIndex)
    applyOrder(reordered)
    try {
      await updateCategoryOrder(reordered.map((n, i) => ({ id: n.id, sort_order: i })))
    } catch (err) {
      resetOrder()
      await alert(err instanceof Error ? err.message : 'Não foi possível reordenar.')
    }
  }

  if (nodes.length === 0) return null
  return view === 'grid' ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => {
        justDraggedRef.current = true
      }}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={orderedNodes.map((n) => n.id)} strategy={rectSortingStrategy} disabled={!reordering}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {orderedNodes.map((n) => (
            <AlbumCard
              key={n.id}
              node={n}
              allCategories={allCategories}
              products={products}
              coverUrls={coverUrls}
              reordering={reordering}
              onStartReorder={onStartReorder}
              justDraggedRef={justDraggedRef}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  ) : (
    <div className="overflow-hidden rounded-xl border border-stone-800 lg:columns-2 lg:gap-0 lg:[column-rule:1px_solid_var(--color-stone-800)]">
      {nodes.map((n) => (
        <ul key={n.id} className="-mb-px break-inside-avoid divide-y divide-stone-800 border-b border-stone-800">
          <AlbumRow node={n} allCategories={allCategories} products={products} coverUrls={coverUrls} onStartReorder={onStartReorder} depth={0} />
        </ul>
      ))}
    </div>
  )
}

function useAlbumData(node: CategoryNode, allCategories: StoreCategory[], products: StoreProduct[], coverUrls: Record<string, string>) {
  const { data: customCoverUrl } = useCategoryCoverUrl(node.cover_image_path)
  const derived = useMemo(() => {
    const items = productsInCategory(products, categoryWithDescendants(allCategories, node.id))
    return { count: items.length, url: node.cover_image_path ? null : derivedCoverUrl(items, coverUrls, node.cover_product_id) }
  }, [node.id, node.cover_product_id, node.cover_image_path, allCategories, products, coverUrls])
  return { count: derived.count, coverUrl: customCoverUrl ?? derived.url }
}

/** Todas as ações de uma categoria num menu só; no celular, o toque longo no card abre o mesmo menu. */
function CategoryMenu({
  node,
  allCategories,
  products,
  coverUrls,
  onStartReorder,
  canReorder = true,
  open,
  onOpenChange,
  triggerClassName,
}: {
  node: CategoryNode
  allCategories: StoreCategory[]
  products: StoreProduct[]
  coverUrls: Record<string, string>
  onStartReorder: () => void
  canReorder?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  triggerClassName?: string
}) {
  const [moving, setMoving] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [itemCoverOpen, setItemCoverOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const confirm = useConfirm()
  const alert = useAlert()
  const directItems = useMemo(() => products.filter((p) => (p.category_ids ?? []).includes(node.id)), [products, node.id])

  const handleDelete = async () => {
    const ok = await confirm(
      `Excluir a categoria "${node.name}"? As subcategorias também são excluídas. Os produtos não são excluídos; apenas deixam de estar nessas categorias.`,
      { danger: true, confirmLabel: 'Excluir' },
    )
    if (!ok) return
    try {
      await deleteCategory(node.id)
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Não foi possível excluir.')
    }
  }

  const items: ActionMenuItem[] = [
    { label: 'Renomear', icon: <PencilIcon />, onClick: () => setRenaming(true) },
    { label: 'Capa personalizada', icon: <PhotoIcon />, onClick: () => setCoverOpen(true) },
    { label: 'Selecionar item da capa', icon: <StarIcon />, onClick: () => setItemCoverOpen(true), disabled: directItems.length === 0 },
    {
      label: 'Cor da categoria',
      icon: (
        <span style={{ color: effectiveCategoryColor(allCategories, node.id) }}>
          <CategoryIcon />
        </span>
      ),
      onClick: () => setColorOpen(true),
    },
    { label: 'Mover para dentro de outra', icon: <MoveToAlbumIcon />, onClick: () => setMoving(true) },
    ...(canReorder ? [{ label: 'Reordenar álbuns', icon: <GripIcon />, onClick: onStartReorder }] : []),
    { label: 'Excluir', icon: <TrashIcon />, onClick: () => void handleDelete(), danger: true },
  ]

  return (
    <>
      <ActionMenu
        items={items}
        label={`Opções de "${node.name}"`}
        open={open}
        onOpenChange={onOpenChange}
        buttonClassName={triggerClassName ?? 'tap-icon bg-black/60 text-white backdrop-blur transition hover:bg-black/85'}
      >
        <GearIcon />
      </ActionMenu>
      {renaming && (
        <PromptDialog
          title="Renomear categoria"
          label="Novo nome:"
          initialValue={node.name}
          confirmLabel="Salvar"
          cancelLabel="Cancelar"
          onConfirm={async (name) => {
            if (name !== node.name) await renameCategory(node.id, name)
            setRenaming(false)
          }}
          onClose={() => setRenaming(false)}
        />
      )}
      {coverOpen && <CategoryCoverDialog node={node} onClose={() => setCoverOpen(false)} />}
      {itemCoverOpen && <CategoryItemCoverDialog node={node} items={directItems} coverUrls={coverUrls} onClose={() => setItemCoverOpen(false)} />}
      {colorOpen && <CategoryColorDialog node={node} onClose={() => setColorOpen(false)} />}
      {moving && <MoveCategoryDialog node={node} allCategories={allCategories} onClose={() => setMoving(false)} />}
    </>
  )
}

function CategoryColorDialog({ node, onClose }: { node: CategoryNode; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const choose = async (slug: string | null) => {
    setSaving(true)
    setError(null)
    try {
      await updateCategoryColor(node.id, slug)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a cor.')
      setSaving(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-stone-900 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-stone-100">Cor de "{node.name}"</h2>
        {error && <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>}
        <div className="grid grid-cols-7 gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c.slug}
              type="button"
              disabled={saving}
              onClick={() => void choose(c.slug)}
              title={c.label}
              aria-label={c.label}
              className={`flex aspect-square items-center justify-center rounded-lg border-2 transition disabled:opacity-50 ${
                node.color === c.slug ? 'border-stone-100' : 'border-transparent hover:border-stone-600'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
        <div className="flex justify-between gap-2">
          <button type="button" disabled={saving} onClick={() => void choose(null)} className="btn-secondary text-sm disabled:opacity-50">
            {node.parent_id ? 'Herdar da mãe' : 'Cor padrão'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function MoveCategoryDialog({ node, allCategories, onClose }: { node: CategoryNode; allCategories: StoreCategory[]; onClose: () => void }) {
  const [parentId, setParentId] = useState<string>(node.parent_id ?? '')
  const [busy, setBusy] = useState(false)
  const alert = useAlert()
  const blocked = useMemo(() => {
    const set = descendantIds(allCategories, node.id)
    set.add(node.id)
    return set
  }, [allCategories, node.id])
  const options = useMemo(() => flattenTree(buildCategoryTree(allCategories)).filter(({ category }) => !blocked.has(category.id)), [allCategories, blocked])

  const handleMove = async () => {
    setBusy(true)
    try {
      await moveCategory(allCategories, node.id, parentId || null)
      onClose()
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Não foi possível mover.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-stone-900 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-stone-100">Mover "{node.name}"</h2>
        <label className="block">
          <span className="mb-1 block text-xs text-stone-400">Colocar dentro de</span>
          <AppSelect value={parentId} onChange={(e) => setParentId(e.target.value)} className="input">
            <option value="">— nível principal —</option>
            {options.map(({ category, depth }) => (
              <option key={category.id} value={category.id}>
                {' '.repeat(depth * 3)}
                {category.name}
              </option>
            ))}
          </AppSelect>
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={() => void handleMove()} disabled={busy} className="btn-primary flex-1">
            {busy ? 'Movendo…' : 'Mover'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoryCoverDialog({ node, onClose }: { node: CategoryNode; onClose: () => void }) {
  const { data: previewUrl } = useCategoryCoverUrl(node.cover_image_path)
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await uploadCategoryCover(node.id, file, node.cover_image_path)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a foto.')
      setBusy(false)
    }
  }
  const handleRemove = async () => {
    if (!node.cover_image_path) return
    setBusy(true)
    setError(null)
    try {
      await removeCategoryCover(node.id, node.cover_image_path)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover a foto.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-stone-900 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-stone-100">Capa personalizada de "{node.name}"</h2>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-stone-800">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <p className="p-4 text-center text-sm text-stone-500">
              Nenhuma foto personalizada. A capa automática é usada: o item escolhido ou a primeira foto da categoria.
            </p>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => void handleUpload(e.target.files)} />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Fechar
          </button>
          {node.cover_image_path && (
            <button onClick={() => void handleRemove()} disabled={busy} className="btn-danger flex-1">
              Remover
            </button>
          )}
          <button onClick={() => fileInput.current?.click()} disabled={busy} className="btn-primary flex-1">
            {busy ? 'Enviando…' : node.cover_image_path ? 'Trocar foto' : 'Enviar foto'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoryItemCoverDialog({
  node,
  items,
  coverUrls,
  onClose,
}: {
  node: CategoryNode
  items: StoreProduct[]
  coverUrls: Record<string, string>
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const choose = async (productId: string | null) => {
    setBusy(true)
    setError(null)
    try {
      await setCategoryCover(node.id, productId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível definir a capa.')
      setBusy(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-sm flex-col space-y-3 rounded-xl bg-stone-900 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-stone-100">Selecionar item da capa</h2>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((p) => {
              const selected = p.id === node.cover_product_id
              const url = coverUrls[p.id]
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void choose(p.id)}
                  disabled={busy}
                  title={p.name}
                  className={`group relative overflow-hidden rounded-lg bg-stone-800 transition disabled:opacity-50 ${
                    selected ? 'ring-2 ring-amber-500' : 'hover:ring-2 hover:ring-stone-600'
                  }`}
                >
                  <div className="aspect-square">
                    {url ? (
                      <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg opacity-40">
                        <SpecimenIcon />
                      </div>
                    )}
                  </div>
                  {selected && (
                    <span className="absolute top-1 right-1 rounded-full bg-amber-600 p-0.5 text-white">
                      <StarIcon />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Fechar
          </button>
          {node.cover_product_id && (
            <button onClick={() => void choose(null)} disabled={busy} className="btn-danger flex-1">
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function AlbumCard({
  node,
  allCategories,
  products,
  coverUrls,
  reordering,
  onStartReorder,
  justDraggedRef,
}: {
  node: CategoryNode
  allCategories: StoreCategory[]
  products: StoreProduct[]
  coverUrls: Record<string, string>
  reordering: boolean
  onStartReorder: () => void
  justDraggedRef: MutableRefObject<boolean>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const longPress = useLongPress(!reordering ? () => setMenuOpen(true) : null)
  const { count, coverUrl } = useAlbumData(node, allCategories, products, coverUrls)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id, disabled: !reordering })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const cardBody = (
    <>
      <div className="aspect-square bg-stone-800">
        {coverUrl ? (
          <img src={coverUrl} alt="" loading="lazy" draggable={false} className="no-callout h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-stone-600">
            <CategoryIcon />
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="leading-snug font-bold break-words text-stone-100">{node.name}</p>
        <p className="text-xs text-stone-500">
          {itemsLabel(count)}
          {node.children.length > 0 && ` · ${node.children.length} sub`}
        </p>
      </div>
    </>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(reordering ? attributes : {})}
      {...(reordering ? listeners : {})}
      className={`group relative ${reordering ? 'touch-none' : ''} ${isDragging ? 'z-10 opacity-70' : ''}`}
    >
      {reordering ? (
        <div className="block cursor-grab overflow-hidden rounded-xl bg-stone-900 select-none">{cardBody}</div>
      ) : (
        <Link
          to={`/categorias/${node.id}`}
          {...longPress.handlers}
          draggable={false}
          onClick={(e) => {
            if (justDraggedRef.current) {
              e.preventDefault()
              justDraggedRef.current = false
              return
            }
            if (longPress.consumeClick()) e.preventDefault()
          }}
          className="block overflow-hidden rounded-xl bg-stone-900 transition hover:bg-stone-800"
        >
          {cardBody}
        </Link>
      )}
      {!reordering && (
        <div
          className={`absolute top-1.5 right-1.5 transition-opacity focus-within:opacity-100 ${
            menuOpen ? 'opacity-100' : 'opacity-100 mouse:opacity-0 mouse:group-hover:opacity-100'
          }`}
        >
          <CategoryMenu
            node={node}
            allCategories={allCategories}
            products={products}
            coverUrls={coverUrls}
            onStartReorder={onStartReorder}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            triggerClassName="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm text-white backdrop-blur transition hover:bg-black/85"
          />
        </div>
      )}
    </div>
  )
}

function AlbumRow({
  node,
  allCategories,
  products,
  coverUrls,
  onStartReorder,
  depth,
}: {
  node: CategoryNode
  allCategories: StoreCategory[]
  products: StoreProduct[]
  coverUrls: Record<string, string>
  onStartReorder: () => void
  depth: number
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const longPress = useLongPress(() => setMenuOpen(true))
  const { count, coverUrl } = useAlbumData(node, allCategories, products, coverUrls)

  return (
    <>
      <li className="flex items-center gap-3 p-2 transition hover:bg-stone-900" style={{ paddingLeft: `${8 + depth * 24}px` }}>
        <Link
          to={`/categorias/${node.id}`}
          {...longPress.handlers}
          onClick={(e) => {
            if (longPress.consumeClick()) e.preventDefault()
          }}
          className="flex flex-1 items-center gap-3"
        >
          {coverUrl ? (
            <img src={coverUrl} alt="" loading="lazy" draggable={false} className="no-callout h-12 w-12 rounded-md object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-stone-800 text-xl text-stone-500">
              <CategoryIcon />
            </span>
          )}
          <span className="flex-1">
            <span className="flex items-center gap-1 text-sm font-bold text-stone-100">
              {depth > 0 && <SubcategoryIcon className="mr-1 inline text-stone-600" aria-hidden />}
              {node.name}
            </span>
            <span className="text-xs text-stone-500">{itemsLabel(count)}</span>
          </span>
        </Link>
        <CategoryMenu
          node={node}
          allCategories={allCategories}
          products={products}
          coverUrls={coverUrls}
          onStartReorder={onStartReorder}
          canReorder={false}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          triggerClassName="tap-icon text-stone-400 transition hover:bg-stone-800 hover:text-stone-100"
        />
      </li>
      {node.children.map((c) => (
        <AlbumRow key={c.id} node={c} allCategories={allCategories} products={products} coverUrls={coverUrls} onStartReorder={onStartReorder} depth={depth + 1} />
      ))}
    </>
  )
}

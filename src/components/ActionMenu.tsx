import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useDropdownPosition } from './useDropdownPosition'

export interface ActionMenuItem {
  label: string
  icon?: ReactNode
  /** Clique do item. Com `to`, roda antes da navegação (ex.: registrar algo). */
  onClick?: () => void
  /** Item que navega (renderiza um `<Link>`). */
  to?: string
  /** Ação destrutiva (apagar/remover) — pintada de vermelho e separada do resto. */
  danger?: boolean
  disabled?: boolean
  /** Título de seção (não clicável): separa grupos de itens dentro do mesmo menu. */
  heading?: boolean
  /** Linha divisória acima do item (separa um grupo do anterior sem usar o tom de ação destrutiva). */
  separated?: boolean
}

/**
 * PADRÃO ÚNICO dos popups de lista de ações do app ("Criar", "⋯", engrenagem de
 * categoria, seletor de coleção...): painel `rounded-lg p-1` com itens
 * `rounded-md px-3 py-2`. Popups novos desse tipo usam este componente — não
 * reescrever o painel à mão. (Popups com conteúdo próprio — formulário, grade de
 * miniaturas — podem usar `POPUP_PANEL_CLASS` para manter só a moldura igual.)
 */
export const POPUP_PANEL_CLASS = 'rounded-lg border border-stone-700 bg-stone-900 shadow-xl'
const ITEM_BASE = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition disabled:opacity-40'
const ITEM_NORMAL = 'text-stone-200 hover:bg-stone-800'
const ITEM_DANGER = 'text-red-300 hover:bg-red-950/60'

const MENU_WIDTH = 224 // w-56

/**
 * Menu de ações abaixo de um botão-gatilho. Existe para colapsar filas de
 * botõezinhos num alvo de toque só.
 *
 * O painel é renderizado em PORTAL com posição `fixed` (`useDropdownPosition`,
 * que também vira o menu para cima quando não cabe embaixo): um painel absoluto
 * seria cortado pelo `overflow-auto` do `<main>`, pelo `overflow-hidden` de um
 * tile de galeria ou deslocado por um ancestral com `transform` (tile do dnd-kit).
 *
 * Pode ser CONTROLADO (`open` + `onOpenChange`) para que um gesto de fora — o
 * toque longo no card — abra o mesmo menu sem duplicar a lista de ações; sem
 * essas props ele controla o próprio estado. Controlado e sem `children`, não
 * renderiza gatilho nenhum: é só o painel flutuante.
 */
export function ActionMenu({
  items,
  label,
  children,
  align = 'right',
  buttonClassName = 'tap-icon bg-black/70 text-white hover:bg-black',
  open,
  onOpenChange,
}: {
  items: ActionMenuItem[]
  /** Rótulo acessível do gatilho (o botão fica só com ícone). */
  label: string
  /** Conteúdo do gatilho; omitido no modo controlado, renderiza só o painel. */
  children?: ReactNode
  align?: 'left' | 'right'
  buttonClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [selfOpen, setSelfOpen] = useState(false)
  const isOpen = open ?? selfOpen
  const setOpen = (v: boolean) => {
    if (open === undefined) setSelfOpen(v)
    onOpenChange?.(v)
  }

  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const { pos, menuRef } = useDropdownPosition(rootRef, isOpen, { width: MENU_WIDTH, align })

  useEffect(() => {
    if (!isOpen) return
    const onDocDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    // `capture` para fechar antes que o clique chegue ao card por baixo (que é
    // um Link e navegaria).
    document.addEventListener('pointerdown', onDocDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDocDown, true)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <div ref={rootRef} className="relative">
      {children !== undefined && (
        <button
          type="button"
          aria-label={label}
          title={label}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          // O card de categoria / tile de mídia inteiro é arrastável; parar o
          // pointerdown aqui evita que abrir o menu vire um arrasto.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen(!isOpen)
          }}
          className={buttonClassName}
        >
          {children}
        </button>
      )}
      {isOpen &&
        pos &&
        createPortal(
          <div
            id={menuId}
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
            // O painel está na árvore React do card/tile: sem isso o pointerdown
            // dele iniciaria um arrasto no ancestral.
            onPointerDown={(e) => e.stopPropagation()}
            className={`fixed z-[60] max-h-[70vh] overflow-y-auto p-1 ${POPUP_PANEL_CLASS}`}
          >
            {items.map((item, i) => {
              if (item.heading) {
                return (
                  <div
                    key={`heading-${item.label}`}
                    role="presentation"
                    className={`px-3 pb-1 pt-2 text-xs font-medium text-stone-500 ${i > 0 ? 'mt-1 border-t border-stone-800' : ''}`}
                  >
                    {item.label}
                  </div>
                )
              }
              const cls = `${ITEM_BASE} ${item.danger ? ITEM_DANGER : ITEM_NORMAL} ${
                (item.danger || item.separated) && i > 0 ? 'mt-1 border-t border-stone-800 pt-2' : ''
              }`
              const content = (
                <>
                  {item.icon && <span className="shrink-0 text-base">{item.icon}</span>}
                  {item.label}
                </>
              )
              if (item.to && !item.disabled) {
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(false)
                      item.onClick?.()
                    }}
                    className={cls}
                  >
                    {content}
                  </Link>
                )
              }
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpen(false)
                    item.onClick?.()
                  }}
                  className={cls}
                >
                  {content}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}

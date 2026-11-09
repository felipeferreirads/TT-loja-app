import { useEffect, useRef, useState } from 'react'
import { InfoIcon } from './icons'
import { useDropdownPosition } from './useDropdownPosition'

const TOOLTIP_WIDTH = 256

/**
 * Ícone de informação (ⓘ) com dica contextual acionada por toque/clique — não
 * por hover, que não existe em touch (mobile não tem como "passar o mouse
 * por cima"). Fecha ao tocar fora, no próprio ícone de novo, ou Esc.
 *
 * Posição `fixed` via `useDropdownPosition` (mesmo hook do menu de colunas
 * do toolbar) em vez de `absolute` simples: um balão `absolute` ancorado num
 * ⓘ perto da borda da tela (comum no mobile) extrapola a viewport e é
 * cortado pelo `overflow-auto` do `<main>` — o hook clampa dentro da tela.
 */
export function InfoTooltip({
  text,
  className = 'text-stone-500 hover:text-stone-300',
  iconClassName,
}: {
  text: string
  className?: string
  iconClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const { pos, menuRef } = useDropdownPosition(btnRef, open, { width: TOOLTIP_WIDTH, align: 'left' })

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      const target = e.target as Node
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label={text}
        aria-expanded={open}
        className={`inline-flex shrink-0 items-center border-0 bg-transparent p-0 leading-none ${className}`}
      >
        <InfoIcon className={iconClassName} />
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          role="tooltip"
          style={{ top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}
          className="fixed z-50 rounded-md border border-stone-700 bg-stone-800 p-2 text-xs font-normal text-stone-200 shadow-lg"
        >
          {text}
        </div>
      )}
    </>
  )
}

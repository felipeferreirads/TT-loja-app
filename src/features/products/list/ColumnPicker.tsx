import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon, ChevronDownIcon, SpreadsheetIcon } from '../../../components/icons'
import { POPUP_PANEL_CLASS } from '../../../components/ActionMenu'
import { useDropdownPosition } from '../../../components/useDropdownPosition'
import { DEFAULT_COLUMNS, GROUP_LABELS, GROUP_ORDER, LIST_COLUMNS } from './columns'

/**
 * Seletor de colunas da lista — mesmo papel do `ColumnPicker` da barra da
 * Coleção: colunas agrupadas, marcar/desmarcar, restaurar o padrão e as
 * larguras. A ordem se ajusta arrastando o cabeçalho da tabela.
 */
export function ColumnPicker({
  columns,
  onChange,
  onResetWidths,
}: {
  columns: string[]
  onChange: (cols: string[]) => void
  onResetWidths?: () => void
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const { pos, menuRef } = useDropdownPosition(boxRef, open, { width: 288, align: 'right' })

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (boxRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggle = (key: string) => {
    if (columns.includes(key)) {
      if (columns.length > 1) onChange(columns.filter((k) => k !== key))
    } else onChange([...columns, key])
  }

  return (
    <div ref={boxRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex h-8 items-center gap-1.5 rounded-full bg-stone-800 px-3 text-sm whitespace-nowrap text-stone-300 transition hover:bg-stone-700 sm:h-7 ${
          open ? 'ring-1 ring-amber-600/70' : ''
        }`}
      >
        <SpreadsheetIcon className="text-base text-amber-500" />
        Colunas
        <span className="rounded-full bg-stone-700 px-1.5 text-xs">{columns.length}</span>
        <ChevronDownIcon className={`text-xs text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: pos.top, left: pos.left }}
            className={`fixed z-[60] max-h-[70vh] w-72 overflow-y-auto p-2 ${POPUP_PANEL_CLASS}`}
          >
            <div className="mb-2 flex flex-wrap gap-1.5 border-b border-stone-800 pb-2">
              <button
                type="button"
                onClick={() => onChange(DEFAULT_COLUMNS)}
                className="rounded-md px-2 py-1 text-xs text-amber-400 transition hover:bg-stone-800"
              >
                Restaurar colunas padrão
              </button>
              {onResetWidths && (
                <button type="button" onClick={onResetWidths} className="rounded-md px-2 py-1 text-xs text-amber-400 transition hover:bg-stone-800">
                  Restaurar larguras
                </button>
              )}
            </div>
            {GROUP_ORDER.map((group) => {
              const items = LIST_COLUMNS.filter((c) => c.group === group)
              if (items.length === 0) return null
              return (
                <div key={group} className="mb-2">
                  <span className="block px-2 py-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{GROUP_LABELS[group]}</span>
                  {items.map((c) => {
                    const checked = columns.includes(c.key)
                    return (
                      <button
                        key={c.key}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={checked}
                        onClick={() => toggle(c.key)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-stone-200 transition hover:bg-stone-800"
                      >
                        <span
                          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${
                            checked ? 'border-amber-500 bg-amber-600 text-white' : 'border-stone-600 text-transparent'
                          }`}
                        >
                          <CheckIcon />
                        </span>
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}

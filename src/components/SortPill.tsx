import { useEffect, useRef, useState } from 'react'
import { CheckIcon, ChevronDownIcon, SortIcon } from './icons'
import { useDropdownPosition } from './useDropdownPosition'

export interface SortPillOption {
  value: string
  label: string
  /** Descrição da direção crescente (ex.: "A→Z"), usada no título do botão de inverter. */
  ascLabel: string
  /** Descrição da direção decrescente (ex.: "Z→A"). */
  descLabel: string
}

interface Props {
  options: SortPillOption[]
  value: string
  dir: 'asc' | 'desc'
  onChangeField: (value: string) => void
  onToggleDir: () => void
  /** Rótulo/título da pílula ("Ordenar por"). */
  sortByLabel: string
  /** Título do botão de direção, a partir do texto da direção atual. */
  dirTitle: (dirText: string) => string
  dirAriaLabel: (dirText: string) => string
  /** Esconde o botão de direção (ex.: ordem aleatória). */
  hideDir?: boolean
  className?: string
  /** Versão de largura total (painel de filtros no celular). */
  fullWidth?: boolean
}

/**
 * Ordenação: pílula que abre uma lista de campos + botão de direção. Padrão
 * visual da barra da Coleção (SpecimenToolbar), compartilhado com as listas de
 * Documentos e Fornecedores.
 */
export function SortPill({
  options,
  value,
  dir,
  onChangeField,
  onToggleDir,
  sortByLabel,
  dirTitle,
  dirAriaLabel,
  hideDir = false,
  className = '',
  fullWidth = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const { pos, menuRef } = useDropdownPosition(boxRef, open, { width: 224 })

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (boxRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const current = options.find((o) => o.value === value) ?? options[0]
  const asc = dir === 'asc'
  const dirText = asc ? current.ascLabel : current.descLabel

  return (
    <div className={`flex items-center gap-1.5 ${fullWidth ? '' : 'shrink-0'} ${className}`}>
      <div ref={boxRef} className={`relative ${fullWidth ? 'min-w-0 flex-1' : 'shrink-0'}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={sortByLabel}
          aria-label={sortByLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex w-full items-center gap-1.5 rounded-full bg-stone-800 px-3 text-sm whitespace-nowrap text-stone-300 transition hover:bg-stone-700 ${
            fullWidth ? 'min-h-11' : 'h-8 sm:h-7'
          } ${open ? 'ring-1 ring-amber-600/70' : ''}`}
        >
          <SortIcon className="shrink-0 text-base text-amber-500" />
          <span className="truncate">{current.label}</span>
          <ChevronDownIcon className={`ml-auto shrink-0 text-xs text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && pos && (
          <div
            ref={menuRef}
            role="listbox"
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-30 max-h-[70vh] w-56 overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-xl"
          >
            {options.map((o) => {
              const selected = o.value === current.value
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    if (!selected) onChangeField(o.value)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                    selected ? 'bg-amber-600/15 text-amber-300' : 'text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  <span className="flex-1">{o.label}</span>
                  {selected && <CheckIcon className="shrink-0 text-base" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {!hideDir && (
        <button
          type="button"
          onClick={onToggleDir}
          title={dirTitle(dirText)}
          aria-label={dirAriaLabel(dirText)}
          className={`inline-flex shrink-0 items-center justify-center rounded-full bg-stone-800 text-stone-200 transition hover:bg-stone-700 ${
            fullWidth ? 'h-11 w-11' : 'h-8 w-8 sm:h-7 sm:w-7'
          }`}
        >
          <span className="text-base leading-none">{asc ? '↑' : '↓'}</span>
        </button>
      )}
    </div>
  )
}

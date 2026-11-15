import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDownIcon } from './icons'
import { usePortalDropdown } from './usePortalDropdown'

interface Option {
  value: string
  label: string
}

interface Props {
  value: string
  options: readonly Option[]
  onChange: (value: string) => void
  /** Classes do contêiner (posição/ordem em quem usa). */
  className?: string
  /** Altura/fonte iguais às pílulas pequenas das Estatísticas (`OptionChip`). */
  compact?: boolean
}

/**
 * Seleção única em pílula expansível: só a opção atual aparece (largura pelo
 * conteúdo) e, ao tocar, as demais abrem em coluna logo abaixo, num portal (não são cortadas por cards com `overflow` e viram para cima quando falta espaço). Extraída do
 * seletor de tipo do celular na barra da Coleção (SpecimenToolbar) para valer
 * também em outras telas (ex.: Estatísticas).
 */
export function ExpandablePillSelect({ value, options, onChange, className = '', compact = false }: Props) {
  const [open, setOpen] = useState(false)
  const { boxRef, menuRef, menuRect } = usePortalDropdown(open, () => setOpen(false))
  const current = options.find((o) => o.value === value) ?? options[0]

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 whitespace-nowrap text-white transition hover:bg-amber-500 ${
          compact ? 'py-1 text-xs' : 'min-h-7 text-sm'
        }`}
      >
        {current?.label}
        <ChevronDownIcon className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
        menuRect &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuRect.top, left: menuRect.left, minWidth: menuRect.width }}
            className="fixed z-[70] flex w-max flex-col gap-1 rounded-xl border border-stone-800 bg-stone-900 p-1.5 shadow-xl shadow-black/30"
          >
            {options
              .filter((o) => o.value !== current?.value)
              .map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  className={`inline-flex items-center rounded-full bg-stone-800 px-3 text-left whitespace-nowrap text-stone-300 transition hover:bg-stone-700 ${
                    compact ? 'py-1 text-xs' : 'min-h-8 text-sm'
                  }`}
                >
                  {o.label}
                </button>
              ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { InfoTooltip } from './InfoTooltip'
import { usePortalDropdown } from './usePortalDropdown'

export interface HintOption {
  /** Valor gravado (canônico). */
  value: string
  /** Rótulo exibido (já traduzido). */
  label: string
  /** Explicação do termo, mostrada num ícone de informação ao lado da opção. */
  hint?: string
}

interface Props {
  value: string
  options: HintOption[]
  onChange: (value: string) => void
  /** Texto do campo vazio. */
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}

/**
 * Seleção única em que cada opção traz o seu ícone de informação (ⓘ) com a
 * explicação do termo — mesmo padrão das opções de `HierarchicalMultiSelect`
 * ("Características cristalográficas"). O ⓘ fica FORA do botão da opção: tocar
 * nele só abre a explicação, não escolhe o valor. O painel abre num portal
 * (ver usePortalDropdown.ts).
 */
export function HintSelect({ value, options, onChange, placeholder = '—', disabled, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const { boxRef, menuRef, menuRect } = usePortalDropdown(open, () => setOpen(false))
  const current = options.find((o) => o.value === value)

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="input flex min-h-[2.5rem] w-full items-center gap-1 text-left disabled:opacity-60"
      >
        <span className={`flex-1 truncate ${current ? '' : 'text-stone-500'}`}>{current ? current.label : value || placeholder}</span>
        <span className="text-stone-500">{open ? '▴' : '▾'}</span>
      </button>

      {open &&
        menuRect &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
            className="fixed z-50 max-h-64 overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-xl"
          >
            <button
              type="button"
              role="option"
              aria-selected={value === ''}
              onClick={() => pick('')}
              className="block w-full rounded px-2 py-1 text-left text-sm text-stone-500 hover:bg-stone-800"
            >
              —
            </button>
            {options.map((o) => (
              <div key={o.value} className="flex items-center gap-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === o.value}
                  onClick={() => pick(o.value)}
                  className={`flex-1 rounded px-2 py-1 text-left text-sm hover:bg-stone-800 ${
                    value === o.value ? 'text-amber-400' : 'text-stone-200'
                  }`}
                >
                  {o.label}
                </button>
                {o.hint && (
                  <InfoTooltip text={o.hint} iconClassName="h-3.5 w-3.5" className="mr-1 text-stone-500 hover:text-stone-300" />
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

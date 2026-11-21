import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon, ChevronDownIcon } from './icons'
import { usePortalDropdown } from './usePortalDropdown'

/** Seta padrão dos gatilhos de seleção (gira quando a lista está aberta). */
export function SelectChevron({ open }: { open: boolean }) {
  return <ChevronDownIcon className={`shrink-0 text-xs text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
}

export interface SelectOption {
  value: string
  label: string
  /** Nível de hierarquia (categorias aninhadas) — vira recuo à esquerda. */
  depth?: number
  /** Elemento antes do rótulo (bandeira, ícone, cor). */
  leading?: ReactNode
  /** Opção não escolhível (aparece esmaecida). */
  disabled?: boolean
  /** Título de grupo (equivale a `<optgroup>`): não é escolhível. */
  heading?: boolean
}

interface Props {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  /** Ícone fixo no gatilho (ex.: ícone de ordenação). Sem ele, aparece o `leading` da opção escolhida. */
  icon?: ReactNode
  /** Rótulo pequeno acima do campo. */
  label?: string
  /** Marca o gatilho como filtro ativo (destaque âmbar). */
  active?: boolean
  className?: string
  /** Gatilho e opções menores (células de tabela, barras de ferramentas). */
  compact?: boolean
  disabled?: boolean
  title?: string
  /** Marca o campo como inválido (borda vermelha). */
  invalid?: boolean
  /** Abre já com a lista aberta (edição inline na lista). */
  defaultOpen?: boolean
  /** Chamado quando a lista fecha por clique fora ou Esc, sem escolha. */
  onClose?: () => void
}

/**
 * Seleção única padrão do app, no lugar do `<select>` nativo (cuja lista abre
 * com o visual do sistema operacional e não aceita bandeira/ícone nas opções).
 * Mesma mecânica do restante dos filtros: gatilho em campo + painel num portal
 * (`usePortalDropdown`), que não é cortado por diálogos com rolagem.
 *
 * Regra do projeto: para qualquer escolha única na interface, usar este
 * componente (ou um irmão em `src/components/`) — nunca `<select>` nativo.
 */
export function OptionSelect({
  value,
  options,
  onChange,
  ariaLabel,
  icon,
  label,
  active,
  className = '',
  compact = false,
  disabled = false,
  title,
  invalid = false,
  defaultOpen = false,
  onClose,
}: Props) {
  const [open, setOpen] = useState(defaultOpen && !disabled)
  const close = () => {
    setOpen(false)
    onClose?.()
  }
  const { boxRef, menuRef, menuRect } = usePortalDropdown(open, close)
  const current = options.find((o) => !o.heading && o.value === value)

  return (
    <div className={`min-w-0 ${className}`}>
      {label && <span className="mb-1 block text-xs font-medium text-stone-400">{label}</span>}
      <div ref={boxRef} className="relative">
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && open) {
              e.stopPropagation()
              close()
            }
          }}
          disabled={disabled}
          title={title}
          autoFocus={defaultOpen}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={
            compact
              ? `flex min-h-7 w-full items-center gap-2 rounded-lg border bg-stone-900/70 px-2 text-left text-xs transition hover:border-stone-600 disabled:cursor-not-allowed disabled:opacity-50 ${
                  open
                    ? 'border-amber-600/70 ring-1 ring-amber-600/40'
                    : invalid
                      ? 'border-red-600'
                      : active
                        ? 'border-amber-700/70'
                        : 'border-stone-700'
                } ${active ? 'text-amber-300' : 'text-stone-200'}`
              : // Campo de formulário: mesmo visual dos campos de texto (.select-trigger divide a regra de .input).
                `select-trigger ${open ? '' : invalid ? 'border-red-600' : active ? 'border-amber-700/70' : ''} ${active ? 'text-amber-300' : ''}`
          }
        >
          {icon ?? current?.leading}
          <span className="flex-1 truncate">{current?.label ?? ''}</span>
          <SelectChevron open={open} />
        </button>

        {open &&
          menuRect &&
          createPortal(
            <div
              ref={menuRef}
              role="listbox"
              aria-label={ariaLabel}
              style={{ top: menuRect.top, left: menuRect.left, minWidth: menuRect.width }}
              className="fixed z-[70] max-h-64 w-max max-w-[min(90vw,24rem)] overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-xl shadow-black/40"
            >
              {options.map((o, idx) => {
                if (o.heading) {
                  return (
                    <div
                      key={`h-${idx}`}
                      className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-stone-500 uppercase"
                    >
                      {o.label}
                    </div>
                  )
                }
                const selected = o.value === value
                return (
                  <button
                    key={`${o.value}-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={o.disabled}
                    onClick={() => {
                      onChange(o.value)
                      setOpen(false)
                    }}
                    style={o.depth ? { paddingLeft: `${0.75 + o.depth * 0.9}rem` } : undefined}
                    className={`flex w-full items-center gap-2 rounded-lg text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
                    } ${selected ? 'bg-amber-600/15 text-amber-300' : 'text-stone-200 hover:bg-stone-800'}`}
                  >
                    {o.leading}
                    <span className="flex-1">{o.label || '—'}</span>
                    {selected && <CheckIcon className="shrink-0 text-base" />}
                  </button>
                )
              })}
            </div>,
            document.body,
          )}
      </div>
    </div>
  )
}

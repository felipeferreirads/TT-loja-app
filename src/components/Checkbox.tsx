import type { ReactNode } from 'react'
import { CheckIcon } from './icons'

/** Caixa visual (sem comportamento) — para compor dentro de linhas clicáveis. */
export function CheckboxMark({ checked, className = '' }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
        checked ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-600 bg-stone-900 text-transparent'
      } ${className}`}
    >
      <CheckIcon className="text-sm" />
    </span>
  )
}

/**
 * Caixa de seleção padrão do app, no lugar do `<input type="checkbox">` nativo.
 * A linha inteira é a área de clique; `children` é o conteúdo (rótulo, prévia,
 * ícone de informação). Controles dentro de `children` devem chamar
 * `stopPropagation` para não alternar a caixa.
 *
 * Regra do projeto: para marcar/desmarcar na interface, usar este componente
 * ou `ToggleSwitch` — nunca `<input type="checkbox">` nativo.
 */
export function Checkbox({
  checked,
  onChange,
  children,
  variant = 'plain',
  align = 'center',
  className = '',
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  /** `card`: linha com borda e fundo, no padrão dos filtros rápidos da Coleção. */
  variant?: 'plain' | 'card'
  align?: 'center' | 'start'
  className?: string
}) {
  const card =
    variant === 'card'
      ? `rounded-xl border px-3 py-2.5 hover:border-stone-600 ${
          checked ? 'border-amber-700/60 bg-amber-950/20' : 'border-stone-800 bg-stone-900/60'
        }`
      : ''
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onChange(!checked)
        }
      }}
      className={`flex min-h-10 cursor-pointer gap-3 text-sm text-stone-300 transition ${
        align === 'start' ? 'items-start' : 'items-center'
      } ${card} ${className}`}
    >
      <CheckboxMark checked={checked} className={align === 'start' ? 'mt-0.5' : ''} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

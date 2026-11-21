import type { ComponentType } from 'react'
import type { IconProps } from './icons'

export interface ViewModeOption<T extends string> {
  value: T
  icon: ComponentType<IconProps>
  label: string
}

interface Props<T extends string> {
  modes: readonly ViewModeOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Rótulo do grupo para leitores de tela. */
  label?: string
  className?: string
}

/**
 * Seletor de visualização (lista + tamanhos de grade) em segmentos: um botão
 * de ícone por modo, o ativo em âmbar. Componente único dos dois apps (o
 * arquivo é idêntico). Mesma altura dos demais controles da barra (`h-8` no
 * celular, `sm:h-7` no desktop).
 */
export function ViewModeSwitch<T extends string>({ modes, value, onChange, label, className = '' }: Props<T>) {
  return (
    <div role="group" aria-label={label} className={`inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-stone-800 p-0.5 sm:h-7 ${className}`}>
      {modes.map((m) => {
        const active = value === m.value
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            title={m.label}
            aria-label={m.label}
            aria-pressed={active}
            className={`inline-flex h-full items-center rounded-full px-2.5 text-sm transition ${
              active ? 'bg-amber-600 text-white' : 'text-stone-400 hover:bg-stone-700 hover:text-stone-200'
            }`}
          >
            <m.icon />
          </button>
        )
      })}
    </div>
  )
}

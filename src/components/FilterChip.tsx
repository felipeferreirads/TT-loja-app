import type { ComponentType } from 'react'
import { ChevronDownIcon, type IconProps } from './icons'

/**
 * Chip que abre/fecha uma seção do painel de filtros — mostra um ponto âmbar
 * quando a seção tem algum filtro ativo, mesmo fechada. Compartilhado entre a
 * Coleção e as listas de Documentos/Fornecedores.
 */
export function FilterChip({
  label,
  icon: Icon,
  active,
  open,
  onClick,
}: {
  label: string
  icon?: ComponentType<IconProps>
  active: boolean
  open: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-sm whitespace-nowrap sm:h-7 transition ${
        open
          ? 'border border-amber-600/70 bg-stone-800 text-amber-400'
          : active
            ? 'border border-transparent bg-stone-800 text-amber-400 hover:bg-stone-700'
            : 'border border-transparent bg-stone-800 text-stone-300 hover:bg-stone-700'
      }`}
    >
      {Icon && <Icon className="text-base" aria-hidden="true" />}
      {label}
      {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />}
      <ChevronDownIcon className={`text-sm transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  )
}

import type { ComponentType } from 'react'
import type { IconProps } from './icons'

/** Estado vazio ilustrado — substitui o texto solto `<p>Nenhum X ainda.</p>`
 *  usado antes em toda lista vazia da loja. */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<IconProps>
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-stone-600">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-stone-400">{title}</p>
      {description && <p className="max-w-xs text-xs text-stone-500">{description}</p>}
    </div>
  )
}

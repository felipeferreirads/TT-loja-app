import { ChevronDownIcon } from './icons'

/** `<th>` clicável com indicador de direção — mesmo princípio do
 *  `SortControl.tsx` já existente, mas embutido no cabeçalho da tabela em
 *  vez de um controle separado ao lado. Usar dentro de `<thead><tr>`. */
export function SortableHeader({
  label,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <th className={`px-3 py-2 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition hover:text-stone-200 ${active ? 'text-stone-200' : ''} ${
          align === 'right' ? 'flex-row-reverse' : ''
        }`}
      >
        {label}
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${active ? 'opacity-100' : 'opacity-0'} ${
            active && dir === 'asc' ? 'rotate-180' : ''
          }`}
        />
      </button>
    </th>
  )
}

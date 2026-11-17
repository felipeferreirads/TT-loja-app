import type { ReactNode } from 'react'

export type SortDir = 'asc' | 'desc'

/**
 * Cabeçalho de coluna ordenável (tabelas de Documentos e Fornecedores): botão
 * com a seta ↑/↓ âmbar na coluna ativa — o mesmo visual que a coluna Data de
 * Documentos já tinha. Colunas inativas mostram um ↕ apagado, só pra deixar
 * claro que também ordenam. O estado (coluna + direção) vive em quem usa;
 * `aria-sort` só vai na coluna ativa.
 */
export function SortableTh({
  children,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  children: ReactNode
  active: boolean
  dir: SortDir
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <th className="px-3 py-2" aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1 uppercase hover:text-stone-300 ${align === 'right' ? 'ml-auto' : ''}`}
      >
        {children}
        {active ? (
          <span className="text-amber-500">{dir === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <span className="text-stone-600" aria-hidden="true">
            ↕
          </span>
        )}
      </button>
    </th>
  )
}

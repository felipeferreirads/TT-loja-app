// Copiado do catálogo pessoal (`src/features/documents/TableMoreRow.tsx`), sem i18n.
import { useState } from 'react'

/** Linhas visíveis por padrão nas tabelas da página do documento. */
export const TABLE_ROW_LIMIT = 5

/** Limita as linhas de uma tabela; `toggle` alterna entre as primeiras `limit` e todas. */
export function useRowLimit<T>(rows: T[], limit = TABLE_ROW_LIMIT) {
  const [expanded, setExpanded] = useState(false)
  return {
    visible: expanded ? rows : rows.slice(0, limit),
    hasMore: rows.length > limit,
    expanded,
    toggle: () => setExpanded((v) => !v),
  }
}

/** Última linha da tabela com o botão "Mostrar todos (N)" / "Mostrar menos". */
export function TableMoreRow({ colSpan, total, expanded, onToggle }: { colSpan: number; total: number; expanded: boolean; onToggle: () => void }) {
  return (
    <tr className="border-t border-stone-800">
      <td colSpan={colSpan} className="p-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="w-full py-2 text-sm text-stone-400 transition hover:bg-stone-800/40 hover:text-amber-400"
        >
          {expanded ? 'Mostrar menos' : `Mostrar todos (${total})`}
        </button>
      </td>
    </tr>
  )
}

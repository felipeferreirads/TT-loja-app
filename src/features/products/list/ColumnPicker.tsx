import { useMemo } from 'react'
import { ColumnsMenu, type ColumnsMenuSection } from '../../../components/ColumnsMenu'
import { DEFAULT_COLUMNS, GROUP_LABELS, GROUP_ORDER, LIST_COLUMNS, type ColumnGroup } from './columns'

// Seções recolhidas por padrão: o resto das colunas fica a um toque, sem a
// lista inteira (mais de cem colunas) aberta de uma vez.
const DEFAULT_COLLAPSED: ColumnGroup[] = GROUP_ORDER.filter((g) => !['identificacao', 'comercial', 'origem'].includes(g))

const SECTIONS: ColumnsMenuSection[] = GROUP_ORDER.map((group) => ({
  key: group,
  label: GROUP_LABELS[group],
  items: LIST_COLUMNS.filter((c) => c.group === group).map((c) => ({ key: c.key, label: c.label })),
})).filter((s) => s.items.length > 0)

/**
 * Seletor de colunas da lista — mesmo componente (`ColumnsMenu`) do seletor da
 * barra da Coleção no catálogo pessoal. A ordem das colunas se ajusta
 * arrastando o cabeçalho da tabela.
 */
export function ColumnPicker({
  columns,
  onChange,
  onResetWidths,
  frozen,
}: {
  columns: string[]
  onChange: (cols: string[]) => void
  onResetWidths?: () => void
  frozen?: { value: number; max: number; onChange: (n: number) => void }
}) {
  const sections = useMemo(() => SECTIONS, [])
  const toggle = (key: string) => {
    if (columns.includes(key)) {
      if (columns.length > 1) onChange(columns.filter((k) => k !== key))
    } else onChange([...columns, key])
  }
  return (
    <ColumnsMenu
      sections={sections}
      selected={columns}
      onToggle={toggle}
      collapsedStorageKey="tt_loja_columns_collapsed"
      defaultCollapsed={DEFAULT_COLLAPSED}
      onResetColumns={() => onChange(DEFAULT_COLUMNS)}
      onResetWidths={onResetWidths}
      frozen={frozen}
      labels={{
        trigger: 'Colunas',
        title: 'Escolher colunas',
        search: 'Buscar coluna',
        empty: 'Nenhuma coluna encontrada.',
        resetColumns: 'Restaurar colunas padrão',
        resetWidths: 'Restaurar larguras',
        frozenTitle: 'Colunas fixas',
        frozenHint: 'Mantém as primeiras colunas fixas ao rolar a tabela na horizontal',
        frozenNone: 'Nenhuma',
      }}
    />
  )
}

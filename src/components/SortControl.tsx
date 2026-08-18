/**
 * Seletor de ordenação compacto, em formato de pílula: um <select> pequeno
 * pro campo + um botão de mesma altura que alterna asc/desc. Mesmo padrão
 * (select + botão ↑/↓) do catálogo pessoal, só que reduzido para caber como
 * um controle secundário de toolbar em vez de campo de formulário.
 */
export function SortControl<T extends string>({
  value,
  onChange,
  options,
  dir,
  onToggleDir,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  dir: 'asc' | 'desc'
  onToggleDir: () => void
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-7 rounded-full border border-stone-700 bg-stone-800 pl-3 pr-6 text-xs text-stone-200 outline-none focus:border-amber-600"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onToggleDir}
        title={dir === 'asc' ? 'Crescente' : 'Decrescente'}
        aria-label={dir === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-sm text-stone-200 transition hover:bg-stone-700"
      >
        {dir === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  )
}

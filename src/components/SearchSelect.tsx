import { useEffect, useMemo, useRef, useState } from 'react'
import { CloseIcon, SearchIcon } from './icons'

const strip = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

interface Item {
  id: string
  label: string
  sublabel?: string
}

/**
 * Seletor com busca embutida na caixa, no mesmo padrão do `CountrySelect`
 * (usado no formulário de produto): digitar já filtra e mostra a lista logo
 * abaixo, sem select nativo.
 */
export function SearchSelect({
  items,
  value,
  onChange,
  placeholder,
  emptyText,
  clearable = true,
}: {
  items: Item[]
  value: string
  onChange: (id: string) => void
  placeholder: string
  emptyText: string
  clearable?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const filtered = useMemo(() => {
    const q = strip(query.trim())
    if (!q) return items
    const starts = items.filter((i) => strip(i.label).startsWith(q))
    const contains = items.filter((i) => !strip(i.label).startsWith(q) && strip(i.label).includes(q))
    return [...starts, ...contains]
  }, [items, query])

  const selected = items.find((i) => i.id === value)

  const pick = (id: string) => {
    onChange(id)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      {selected && !open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setQuery('')
          }}
          className="input flex w-full items-center gap-2 text-left"
        >
          <span className="flex-1 truncate">{selected.label}</span>
          {selected.sublabel && <span className="shrink-0 text-xs text-stone-500">{selected.sublabel}</span>}
          {clearable && (
            <span
              role="button"
              title="Limpar"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="text-stone-500 hover:text-stone-300"
            >
              <CloseIcon />
            </span>
          )}
        </button>
      ) : (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-stone-500">
            <SearchIcon />
          </span>
          <input
            value={query}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            style={{ paddingLeft: '2rem' }}
            className="input"
          />
        </div>
      )}

      {open && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 shadow-xl">
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-stone-500">{emptyText}</li>}
          {filtered.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => pick(i.id)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-stone-700 ${
                  i.id === value ? 'bg-stone-800 text-amber-400' : 'text-stone-200'
                }`}
              >
                <span className="truncate">{i.label}</span>
                {i.sublabel && <span className="shrink-0 text-xs text-stone-500">{i.sublabel}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { countryName, countryOptions } from '../lib/format'
import { Flag } from './Flag'
import { CloseIcon, SearchIcon } from './icons'

const strip = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Campo de país com busca: digite "Br" e aparecem os países que começam assim,
 * sem diferenciar acentos. Guarda o código ISO. Copiado do catálogo pessoal
 * (rótulos fixos em PT, sem i18n).
 */
export function CountrySelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const countries = useMemo(countryOptions, [])
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
    if (!q) return countries
    // Primeiro os que COMEÇAM com o texto, depois os que contêm.
    const starts = countries.filter((c) => strip(c.name).startsWith(q))
    const contains = countries.filter((c) => !strip(c.name).startsWith(q) && strip(c.name).includes(q))
    return [...starts, ...contains]
  }, [countries, query])

  const pick = (code: string) => {
    onChange(code)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      {value && !open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setQuery('')
          }}
          className="input flex w-full items-center gap-2 text-left"
        >
          <Flag code={value} />
          <span className="flex-1 truncate">{countryName(value)}</span>
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
        </button>
      ) : (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-stone-500">
            <SearchIcon />
          </span>
          <input
            value={query}
            placeholder="Buscar país…"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            // `style` e não a classe `pl-8`: `.input` mora fora de `@layer` em
            // index.css, então ganha da camada `utilities` do Tailwind v4.
            style={{ paddingLeft: '2rem' }}
            className="input"
          />
        </div>
      )}

      {open && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 shadow-xl">
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-stone-500">Nenhum país encontrado.</li>}
          {filtered.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => pick(c.code)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-stone-700 ${
                  c.code === value ? 'bg-stone-800 text-amber-400' : 'text-stone-200'
                }`}
              >
                <Flag code={c.code} />
                <span>{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

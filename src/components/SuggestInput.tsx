import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from './icons'

/**
 * Campo de texto livre com sugestões assíncronas (typeahead). As sugestões são
 * apenas um atalho — o valor digitado sempre vale, mesmo sem bater com nenhuma.
 */
export function SuggestInput({
  value,
  onChange,
  onPick,
  fetchSuggestions,
  placeholder,
  minChars = 2,
  debounceMs = 250,
}: {
  value: string
  onChange: (v: string) => void
  /** Disparado só quando o usuário ESCOLHE uma sugestão (não ao digitar). */
  onPick?: (v: string) => void
  fetchSuggestions: (query: string) => Promise<string[]>
  placeholder?: string
  minChars?: number
  debounceMs?: number
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  // Guarda a busca mais recente: uma resposta lenta de uma consulta antiga não
  // pode sobrescrever a lista de uma consulta mais nova.
  const latestQuery = useRef('')

  useEffect(() => {
    const query = value.trim()
    latestQuery.current = query
    if (query.length < minChars) {
      setSuggestions([])
      return
    }
    const id = setTimeout(() => {
      void fetchSuggestions(query).then((results) => {
        if (latestQuery.current === query) setSuggestions(results)
      })
    }, debounceMs)
    return () => clearTimeout(id)
  }, [value, minChars, debounceMs, fetchSuggestions])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const pick = (v: string) => {
    onChange(v)
    onPick?.(v)
    setOpen(false)
  }

  const visible = open && suggestions.filter((s) => s !== value.trim())

  return (
    <div ref={boxRef} className="relative">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        className="input"
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <span className="pointer-events-none absolute inset-y-0 right-0 flex w-8 items-center justify-center text-stone-500">
          <ChevronDownIcon />
        </span>
      )}
      {visible && visible.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 shadow-xl">
          {visible.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="block w-full px-3 py-1.5 text-left text-sm text-stone-200 hover:bg-stone-700"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

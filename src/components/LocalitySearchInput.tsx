import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { searchLocality, type LocalityCandidate } from '../lib/geocode'
import { SearchIcon } from './icons'

const DEBOUNCE_MS = 400
const MIN_CHARS = 3

/**
 * Busca de localidade tipo Google Maps: digita a cidade, escolhe na lista, e
 * quem chama preenche país/estado/localidade de uma vez. Não segura estado de
 * seleção — é só o campo de busca. Copiado do catálogo pessoal.
 */
export function LocalitySearchInput({ onPick }: { onPick: (candidate: LocalityCandidate) => void }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [query])

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['geocode-search', debounced],
    queryFn: () => searchLocality(debounced),
    enabled: debounced.length >= MIN_CHARS,
    staleTime: 60_000,
  })

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (boxRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const rect = boxRef.current?.getBoundingClientRect()
      if (rect) setMenuRect({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const pick = (candidate: LocalityCandidate) => {
    onPick(candidate)
    setQuery('')
    setDebounced('')
    setOpen(false)
  }

  const showEmpty = open && debounced.length >= MIN_CHARS && !isFetching && results.length === 0
  const showHint = open && query.trim().length > 0 && query.trim().length < MIN_CHARS

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-stone-500">
          <SearchIcon />
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cidade, região…"
          // Altura/padding menores que `.input` de propósito: distinguem a
          // busca (ação) dos campos de preenchimento (dado) logo abaixo.
          // `style` porque `.input` mora fora de `@layer` e venceria a classe.
          style={{ paddingLeft: '2rem', minHeight: '2.25rem', paddingTop: '0.375rem', paddingBottom: '0.375rem' }}
          className="input"
          autoComplete="off"
        />
      </div>

      {open &&
        menuRect &&
        (results.length > 0 || isFetching || showEmpty || showHint) &&
        createPortal(
          <ul
            ref={menuRef}
            style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
            className="fixed z-50 max-h-64 overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 shadow-xl"
          >
            {showHint && <li className="px-3 py-2 text-sm text-stone-500">Digite ao menos 3 letras.</li>}
            {isFetching && !showHint && <li className="px-3 py-2 text-sm text-stone-500">Buscando…</li>}
            {showEmpty && <li className="px-3 py-2 text-sm text-stone-500">Nada encontrado.</li>}
            {results.map((r) => (
              <li key={r.placeId}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(r)}
                  className="block w-full px-3 py-1.5 text-left text-sm text-stone-200 hover:bg-stone-700"
                >
                  {r.displayName}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  )
}

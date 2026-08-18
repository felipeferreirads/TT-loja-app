import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchSubdivisions, subdivisionFlagUrl, type SubdivisionOption } from '../lib/subdivisionReference'
import { CloseIcon, SearchIcon } from './icons'

const strip = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Estado/Província a partir do catálogo global `subdivisions_reference` —
 * grava o código ISO 3166-2. A lista sai por portal (`document.body`) pra
 * escapar do overflow das seções do formulário.
 */
export function SubdivisionSelect({
  countryCode,
  value,
  onChange,
}: {
  countryCode: string | null | undefined
  value: string
  onChange: (isoCode: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null)

  const { data: options = [], isFetching } = useQuery({
    queryKey: ['subdivisions', countryCode],
    queryFn: () => fetchSubdivisions(countryCode as string),
    enabled: !!countryCode,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const selected = options.find((o) => o.isoCode === value) ?? null

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

  const filtered = useMemo(() => {
    const q = strip(query.trim())
    if (!q) return options
    return options.filter((o) => [o.name, ...o.aliases].some((n) => strip(n).includes(q)))
  }, [options, query])

  const pick = (option: SubdivisionOption) => {
    onChange(option.isoCode)
    setQuery('')
    setOpen(false)
  }

  if (!countryCode) {
    return <input disabled placeholder="Escolha o país primeiro" className="input opacity-60" />
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
          <SubdivisionFlag flagFile={selected.flagFile} />
          <span className="flex-1 truncate">{selected.name}</span>
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
            placeholder="Buscar estado/província…"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            style={{ paddingLeft: '2rem' }}
            className="input"
            autoComplete="off"
          />
        </div>
      )}

      {open &&
        menuRect &&
        createPortal(
          <ul
            ref={menuRef}
            style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
            className="fixed z-50 max-h-64 overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 shadow-xl"
          >
            {isFetching && <li className="px-3 py-2 text-sm text-stone-500">Carregando…</li>}
            {!isFetching && filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-stone-500">
                {options.length === 0 ? 'Sem estados cadastrados para este país.' : 'Nada encontrado.'}
              </li>
            )}
            {filtered.map((o) => (
              <li key={o.isoCode}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-stone-700 ${
                    o.isoCode === value ? 'bg-stone-800 text-amber-400' : 'text-stone-200'
                  }`}
                >
                  <SubdivisionFlag flagFile={o.flagFile} />
                  <span>{o.name}</span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  )
}

function SubdivisionFlag({ flagFile }: { flagFile: string | null }) {
  const url = subdivisionFlagUrl(flagFile)
  if (!url) return null
  return <img src={url} alt="" loading="lazy" className="inline-block h-4 w-6 shrink-0 rounded-xs object-cover" />
}

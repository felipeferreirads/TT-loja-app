import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { GeologicalTime } from '../../../types/db'
import { SearchIcon } from '../../../components/icons'
import { AppSelect } from '../../../components/AppSelect'
import {
  ancestorChain,
  childrenOf,
  fetchGeologicalTime,
  formatAgeRange,
  GEO_TIME_STALE_TIME,
  geoTimeName,
  isSelectableGeoTime,
  RANK_COLUMN,
  RANK_LABEL,
  RANK_ORDER,
} from '../../../lib/geologicalTime'

// Copiado do catálogo pessoal (`features/specimens/GeologicalTimeSelect.tsx`),
// mesma interface; rótulos fixos em PT.

const strip = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Busca com autocomplete sobre a escala inteira; escolher chama o mesmo `onPick` do seletor em cascata. */
function GeologicalTimeSearch({ all, onPick }: { all: GeologicalTime[]; onPick: (node: GeologicalTime) => void }) {
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

  const suggestions = useMemo(() => {
    const q = strip(query.trim())
    if (!q) return []
    const matched = all
      .filter(isSelectableGeoTime)
      .filter((n) => strip(n.name_pt).includes(q) || strip(n.name_en).includes(q))
    const matchedIds = new Set(matched.map((n) => n.id))
    const byId = new Map(all.map((n) => [n.id, n]))
    const rows = matched.map((node) => {
      const chain: GeologicalTime[] = []
      for (let c: GeologicalTime | undefined = node; c; c = c.parent_id ? byId.get(c.parent_id) : undefined) chain.unshift(c)
      const ancestors = chain.slice(0, -1)
      return {
        node,
        key: chain.map((c) => c.sort_order),
        depth: ancestors.filter((a) => matchedIds.has(a.id)).length,
        path: ancestors.map((a) => geoTimeName(a)).join(' › '),
      }
    })
    rows.sort((a, b) => {
      const len = Math.min(a.key.length, b.key.length)
      for (let i = 0; i < len; i++) if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i]
      return a.key.length - b.key.length
    })
    const out: typeof rows = []
    let group: typeof rows = []
    const flush = () => {
      if (out.length === 0 || out.length + group.length <= 25) out.push(...group)
      group = []
    }
    for (const r of rows) {
      if (r.depth === 0) flush()
      group.push(r)
    }
    flush()
    return out.slice(0, 25)
  }, [all, query])

  const pick = (node: GeologicalTime) => {
    onPick(node)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-stone-500">
          <SearchIcon />
        </span>
        <input
          value={query}
          placeholder="Buscar Éon/Era/Período/Época/Subépoca/Andar…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          style={{ paddingLeft: '2rem', minHeight: '2.25rem', paddingTop: '0.375rem', paddingBottom: '0.375rem' }}
          className="input"
          autoComplete="off"
        />
      </div>
      {open && query.trim() && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 shadow-xl">
          {suggestions.length === 0 && <li className="px-3 py-2 text-sm text-stone-500">Nada encontrado.</li>}
          {suggestions.map(({ node: n, depth, path }) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => pick(n)}
                style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
                className="flex w-full flex-col items-start py-1.5 pr-3 text-left text-sm text-stone-200 hover:bg-stone-700"
              >
                <span>
                  {depth > 0 && (
                    <span aria-hidden className="mr-1.5 text-stone-600">
                      └
                    </span>
                  )}
                  {geoTimeName(n)} <span className="text-stone-500">— {RANK_LABEL[n.rank]}</span>
                </span>
                {depth === 0 && path && <span className="text-xs text-stone-500">{path}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Seletor em cascata Éon → Era → Período → Época → Subépoca → Andar (ICS).
 * `value` é o nó mais profundo escolhido; os níveis mais rasos são derivados
 * subindo a cadeia de parent_id.
 */
export function GeologicalTimeSelect({
  value,
  onChange,
}: {
  value: string | null
  onChange: (node: GeologicalTime | null) => void
}) {
  const { data: all } = useQuery({ queryKey: ['geological-time'], queryFn: fetchGeologicalTime, staleTime: GEO_TIME_STALE_TIME })

  if (!all) return <p className="text-sm text-stone-500">Carregando…</p>

  const chain = ancestorChain(all, value)
  const byId = new Map(all.map((n) => [n.id, n]))

  const nearestAncestor = (rank: (typeof RANK_ORDER)[number]) => {
    const candidates = chain.filter((n) => RANK_COLUMN[n.rank] < RANK_COLUMN[rank])
    return candidates[candidates.length - 1]
  }

  const selectAt = (rank: (typeof RANK_ORDER)[number], id: string) => {
    if (id === '') {
      onChange(nearestAncestor(rank) ?? null)
      return
    }
    onChange(byId.get(id) ?? null)
  }

  return (
    <div className="space-y-2">
      <GeologicalTimeSearch all={all} onPick={onChange} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {RANK_ORDER.map((rank) => {
          const parentId = RANK_COLUMN[rank] === 1 ? null : nearestAncestor(rank)?.id
          const selected = chain.find((n) => n.rank === rank)?.id ?? ''
          const parentNode = parentId ? byId.get(parentId) : undefined
          const options =
            parentId !== undefined
              ? childrenOf(all, parentId)
                  .filter((o) => o.rank === rank && (isSelectableGeoTime(o) || o.id === selected))
                  .filter((o) => o.id === selected || !(o.rank === 'age' && parentNode && o.name_en === parentNode.name_en))
                  .sort((a, b) => (a.age_end_ma ?? 0) - (b.age_end_ma ?? 0) || (a.age_start_ma ?? 0) - (b.age_start_ma ?? 0))
              : []
          const empty = options.length === 0
          const emptyBranch = empty && parentId !== undefined && parentId !== null
          const emptyText = `Sem ${RANK_LABEL[rank]} neste ramo da escala.`
          return (
            <label key={rank} className={`block w-full ${empty ? 'opacity-50' : ''}`}>
              <span className="mb-1 block text-xs text-stone-400">{RANK_LABEL[rank]}</span>
              <AppSelect
                value={selected}
                onChange={(e) => selectAt(rank, e.target.value)}
                disabled={empty}
                title={emptyBranch ? emptyText : undefined}
                className={`input ${empty ? 'cursor-not-allowed' : ''}`}
              >
                <option value="">—</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {geoTimeName(o)}
                  </option>
                ))}
              </AppSelect>
              {emptyBranch && <span className="mt-1 block text-[11px] leading-tight text-stone-500">{emptyText}</span>}
            </label>
          )
        })}
      </div>
      {chain.length > 0 && (
        <p className="text-xs text-stone-500">
          {geoTimeName(chain[chain.length - 1])} · {formatAgeRange(chain[chain.length - 1])}
        </p>
      )}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon, ChevronDownIcon, FreezeColumnsIcon, SearchIcon, SlidersIcon } from './icons'
import { useDropdownPosition } from './useDropdownPosition'

/**
 * Seletor de colunas das listas em formato de tabela — componente único dos
 * dois apps (catálogo e loja; o arquivo é idêntico, ver o `claude.md` da loja).
 * Não conhece o catálogo de colunas nem o idioma: quem usa monta as seções e
 * passa os rótulos já traduzidos.
 *
 * Painel: busca, colunas fixas (opcional), seções recolhíveis com contagem e
 * rodapé com as ações de restaurar. Ver `ColumnsMenuProps`.
 */

export interface ColumnsMenuItem {
  key: string
  label: string
  /** Texto extra que a busca também considera (ex.: rótulo curto). */
  keywords?: string
  /** Coluna obrigatória: aparece marcada e não pode ser desmarcada. */
  fixed?: boolean
}

export interface ColumnsMenuSection {
  key: string
  label: string
  /** Seção dentro de outra (recuo + recolhe junto com a seção-mãe). */
  parent?: string
  items: ColumnsMenuItem[]
}

export interface ColumnsMenuLabels {
  /** Texto do botão. */
  trigger: string
  /** Título/aria do botão. */
  title: string
  search: string
  empty: string
  resetColumns?: string
  resetWidths?: string
  frozenTitle?: string
  frozenHint?: string
  frozenNone?: string
}

export interface ColumnsMenuProps {
  sections: ColumnsMenuSection[]
  /** Chaves das colunas visíveis. */
  selected: readonly string[]
  onToggle: (key: string) => void
  labels: ColumnsMenuLabels
  /** Preferência de seções recolhidas (por dispositivo). */
  collapsedStorageKey: string
  /** Seções recolhidas quando não há preferência salva. */
  defaultCollapsed?: string[]
  /** Mostra "Restaurar colunas padrão" no rodapé. */
  onResetColumns?: () => void
  /** Mostra "Restaurar larguras" no rodapé (só com larguras ajustadas). */
  onResetWidths?: () => void
  /** Colunas fixas à esquerda (0 = nenhuma). Omitir esconde o controle. */
  frozen?: { value: number; max: number; onChange: (n: number) => void }
  /** Bloco extra no topo do painel, abaixo da busca (ex.: coluna de caixas de seleção). */
  top?: ReactNode
  className?: string
}

const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function loadCollapsed(key: string, fallback: string[]): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    if (Array.isArray(saved)) return saved.filter((g): g is string => typeof g === 'string')
  } catch {
    // JSON inválido ou armazenamento bloqueado: usa o padrão
  }
  return fallback
}

export function ColumnsMenu({
  sections,
  selected,
  onToggle,
  labels,
  collapsedStorageKey,
  defaultCollapsed = [],
  onResetColumns,
  onResetWidths,
  frozen,
  top,
  className = '',
}: ColumnsMenuProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<string[]>(() => loadCollapsed(collapsedStorageKey, defaultCollapsed))
  const boxRef = useRef<HTMLDivElement>(null)
  const { pos, menuRef } = useDropdownPosition(boxRef, open, { width: 288, align: 'right' })

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (boxRef.current?.contains(t) || menuRef.current?.contains(t)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggleSection = (key: string) =>
    setCollapsed((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      try {
        localStorage.setItem(collapsedStorageKey, JSON.stringify(next))
      } catch {
        // só não persiste
      }
      return next
    })

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const parentOf = useMemo(() => new Map(sections.map((s) => [s.key, s.parent])), [sections])
  const ancestors = (key: string): string[] => {
    const out: string[] = []
    for (let p = parentOf.get(key); p; p = parentOf.get(p)) out.push(p)
    return out
  }

  const q = norm(query.trim())
  const matches = (c: ColumnsMenuItem) => !q || norm(c.label).includes(q) || norm(c.keywords ?? '').includes(q)

  // Contagem "marcadas/total" de cada seção, somando as seções-filhas.
  const counts = useMemo(() => {
    const map = new Map<string, { on: number; total: number }>()
    for (const s of sections) {
      for (const owner of [s.key, ...ancestors(s.key)]) {
        const c = map.get(owner) ?? { on: 0, total: 0 }
        c.total += s.items.length
        c.on += s.items.filter((i) => selectedSet.has(i.key)).length
        map.set(owner, c)
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, selectedSet])

  const visibleSections = sections
    .map((s) => ({ s, items: s.items.filter(matches) }))
    // Com busca, só as seções com resultado (ignora o recolhimento); sem busca,
    // todas (inclusive as só de agrupamento), menos as dentro de uma seção recolhida.
    .filter(({ s, items }) => (q ? items.length > 0 : !ancestors(s.key).some((a) => collapsed.includes(a))))
  const nothingFound = q && visibleSections.length === 0

  return (
    <div ref={boxRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        title={labels.title}
        aria-label={labels.title}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-stone-800 px-3 text-sm whitespace-nowrap text-stone-300 transition hover:bg-stone-700 sm:h-7 ${
          open ? 'ring-1 ring-amber-600/70' : ''
        }`}
      >
        <SlidersIcon className="shrink-0 text-base text-amber-500" />
        {labels.trigger}
        <span className="rounded-full bg-stone-700 px-1.5 text-xs tabular-nums">{selected.length}</span>
        <ChevronDownIcon className={`shrink-0 text-xs text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-[60] flex max-h-[70vh] w-72 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border border-stone-700 bg-stone-900 shadow-xl shadow-black/30"
          >
            <div className="space-y-2 border-b border-stone-800 p-2">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-base text-stone-500" />
                <input
                  type="search"
                  // Em tela de toque o foco abriria o teclado por cima da lista.
                  autoFocus={typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={labels.search}
                  aria-label={labels.search}
                  className="h-8 w-full rounded-lg border border-stone-700 bg-stone-950 pr-2 pl-8 text-sm text-stone-200 placeholder:text-stone-500 focus:border-amber-600 focus:outline-none"
                />
              </div>
              {frozen && !q && (
                <div className="flex items-center justify-between gap-2" title={labels.frozenHint}>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400">
                    <FreezeColumnsIcon className="shrink-0 text-sm" />
                    {labels.frozenTitle}
                  </span>
                  <div className="flex items-center gap-0.5 rounded-full bg-stone-800 p-0.5">
                    {Array.from({ length: frozen.max + 1 }, (_, n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => frozen.onChange(n)}
                        aria-pressed={frozen.value === n}
                        className={`min-h-6 min-w-6 rounded-full px-2 text-xs font-medium whitespace-nowrap transition ${
                          frozen.value === n ? 'bg-amber-600 text-white' : 'text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {n === 0 ? (labels.frozenNone ?? '0') : n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {top}
              {nothingFound && <p className="px-2 py-2 text-sm text-stone-500">{labels.empty}</p>}
              {visibleSections.map(({ s, items }) => {
                const depth = ancestors(s.key).length
                const isCollapsed = !q && collapsed.includes(s.key)
                const count = counts.get(s.key)
                return (
                  <div key={s.key} className={depth > 0 ? 'ml-3 border-l border-stone-800 pl-1' : ''}>
                    <button
                      type="button"
                      onClick={() => toggleSection(s.key)}
                      aria-expanded={!isCollapsed}
                      className="mt-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold tracking-wide text-stone-500 uppercase transition hover:bg-stone-800/60 hover:text-stone-300"
                    >
                      <ChevronDownIcon className={`shrink-0 text-sm transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      <span className="flex-1 truncate">{s.label}</span>
                      {count && count.total > 0 && (
                        <span className="rounded-full bg-stone-800 px-1.5 text-[10px] font-medium tracking-normal tabular-nums normal-case">
                          {count.on}/{count.total}
                        </span>
                      )}
                    </button>
                    {!isCollapsed &&
                      items.map((c) => {
                        const checked = selectedSet.has(c.key)
                        return (
                          <button
                            key={c.key}
                            type="button"
                            role="menuitemcheckbox"
                            aria-checked={checked}
                            disabled={c.fixed}
                            onClick={() => onToggle(c.key)}
                            className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-stone-200 transition ${
                              c.fixed ? 'opacity-60' : 'hover:bg-stone-800'
                            }`}
                          >
                            <span
                              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${
                                checked ? 'border-amber-500 bg-amber-600 text-white' : 'border-stone-600 text-transparent'
                              }`}
                            >
                              <CheckIcon />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{c.label}</span>
                          </button>
                        )
                      })}
                  </div>
                )
              })}
            </div>

            {(onResetColumns || onResetWidths) && (
              <div className="flex flex-wrap gap-1 border-t border-stone-800 p-1.5">
                {onResetColumns && labels.resetColumns && (
                  <button
                    type="button"
                    onClick={onResetColumns}
                    className="rounded-md px-2 py-1 text-xs font-medium text-amber-400 transition hover:bg-stone-800 hover:text-amber-300"
                  >
                    {labels.resetColumns}
                  </button>
                )}
                {onResetWidths && labels.resetWidths && (
                  <button
                    type="button"
                    onClick={onResetWidths}
                    className="rounded-md px-2 py-1 text-xs font-medium text-amber-400 transition hover:bg-stone-800 hover:text-amber-300"
                  >
                    {labels.resetWidths}
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}

import { useState, type ReactNode } from 'react'
import { FilterIcon } from './icons'
import { SortPill, type SortPillOption } from './SortPill'

/**
 * Barra de ordenação + filtros das listas — cópia do `ListToolbar.tsx` do
 * catálogo pessoal (mesmo padrão da barra da Coleção), com os textos fixos em
 * PT (a loja não tem i18n). Resumo à esquerda; "Limpar filtros", pílula de
 * ordenação e botão "Filtros" à direita; o botão abre um painel com chips que
 * abrem/fecham cada seção. No celular a ordenação vai para dentro do painel.
 */

interface SortConfig {
  options: SortPillOption[]
  value: string
  dir: 'asc' | 'desc'
  onChangeField: (value: string) => void
  onToggleDir: () => void
}

interface Props {
  /** Texto à esquerda da barra (ex.: "12 produtos"). */
  summary?: ReactNode
  sort: SortConfig
  /** Quantidade de filtros em vigor (alimenta o contador do botão e o "Limpar"). */
  activeFilters: number
  onClearFilters: () => void
  /** Linha de filtros rápidos acima dos chips, opcional. */
  quickFilters?: ReactNode
  /** Fileira de `FilterChip`, uma por seção. */
  chips: ReactNode
  /** Seções abertas pelos chips (use `FilterSection`). */
  sections: ReactNode
  /** Controles extras à direita da barra (ex.: modo de visualização). */
  trailing?: ReactNode
}

/**
 * Estado das seções abertas do painel (sanfona: só uma por vez). Nasce com
 * aberta qualquer seção que já tenha filtro ativo, para não esconder um filtro
 * em vigor.
 */
export function useFilterSections<K extends string>(activeKeys: K[]) {
  const [open, setOpen] = useState<Set<K>>(() => new Set(activeKeys))
  const toggle = (key: K) => setOpen((prev) => (prev.has(key) && prev.size === 1 ? new Set() : new Set([key])))
  return { isOpen: (key: K) => open.has(key), toggle }
}

/** Caixa de uma seção aberta do painel de filtros. */
export function FilterSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-3">
      {title && <span className="mb-2 block text-xs font-medium text-stone-400">{title}</span>}
      {children}
    </div>
  )
}

/** Pílula de escolha dentro de uma seção (ativa = âmbar), mesmo visual das seções da Coleção. */
export function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm whitespace-nowrap transition ${
        active ? 'bg-amber-600 text-white' : 'border border-stone-700 bg-stone-800 text-stone-300 hover:bg-stone-700'
      }`}
    >
      {children}
    </button>
  )
}

const clearLabel = (n: number) => `Limpar ${n} ${n === 1 ? 'filtro' : 'filtros'}`

export function ListToolbar({ summary, sort, activeFilters, onClearFilters, quickFilters, chips, sections, trailing }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  const sortPill = (extra: { fullWidth?: boolean } = {}) => (
    <SortPill
      options={sort.options}
      value={sort.value}
      dir={sort.dir}
      onChangeField={sort.onChangeField}
      onToggleDir={sort.onToggleDir}
      sortByLabel="Ordenar por"
      dirTitle={(dir) => `Ordem: ${dir} (clique para inverter)`}
      dirAriaLabel={(dir) => `Inverter ordem. Atual: ${dir}`}
      {...extra}
    />
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 text-sm text-stone-500">{summary}</div>
        <div className="ml-auto flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {!filtersOpen && activeFilters > 0 && (
            <button
              type="button"
              onClick={onClearFilters}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium whitespace-nowrap text-amber-400 transition hover:bg-amber-950/40 hover:text-amber-300"
            >
              {clearLabel(activeFilters)}
            </button>
          )}
          {/* No celular a ordenação fica dentro do painel de Filtros. */}
          <div className="hidden shrink-0 sm:block">{sortPill()}</div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-sm whitespace-nowrap transition sm:h-7 ${
              filtersOpen || activeFilters > 0 ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title="Filtros"
          >
            <FilterIcon className="text-base" />
            Filtros
            {activeFilters > 0 && <span className="ml-0.5 rounded-full bg-white/25 px-1.5 text-xs">{activeFilters}</span>}
          </button>
          {trailing}
        </div>
      </div>

      {filtersOpen && (
        <div className="space-y-4 rounded-2xl border border-stone-700/80 bg-gradient-to-b from-stone-900 to-stone-950/80 p-4 shadow-xl shadow-black/20 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-stone-800 pb-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-100">
                <FilterIcon className="text-amber-500" /> Filtros
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">Refine os resultados sem alterar a busca.</p>
            </div>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={onClearFilters}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-950/40 hover:text-amber-300"
              >
                {clearLabel(activeFilters)}
              </button>
            )}
          </div>

          <div className="sm:hidden">
            <span className="mb-1.5 block text-xs font-medium text-stone-400">Ordenar por</span>
            {sortPill({ fullWidth: true })}
          </div>

          {quickFilters}

          <div className="flex flex-wrap gap-2 border-t border-stone-800 pt-3">{chips}</div>

          {sections}
        </div>
      )}
    </div>
  )
}

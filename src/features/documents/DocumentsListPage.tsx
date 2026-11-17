// Copiado do catálogo pessoal (`src/features/documents/DocumentsListPage.tsx`):
// mesma barra de lista, filtros, ordenação e tabela. Na loja: sem PIN, sem
// sub-abas (Fornecedores fica no menu lateral) e "Itens" = produtos vinculados.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDate, stripAccents } from '../../lib/format'
import { ClockIcon, DocumentIcon, PackageIcon, PlusIcon, TruckIcon } from '../../components/icons'
import { SortableTh } from '../../components/SortableTh'
import { FilterChip } from '../../components/FilterChip'
import { OptionSelect } from '../../components/OptionSelect'
import { FilterPill, FilterSection, ListToolbar, useFilterSections } from '../../components/ListToolbar'
import { SearchField } from '../../components/SearchField'
import { usePersistedSort, type SortDirection } from '../../lib/usePersistedSort'
import type { DocumentSection } from '../../types/db'
import {
  DOCUMENT_SECTION_LABELS,
  SECTION_DISPLAY_ORDER,
  documentBadge,
  documentDate,
  documentNumber,
  documentSections,
  fetchDocumentItemCounts,
  fetchDocuments,
} from './api'

const normalizeSearchText = (s: string) => stripAccents(s).toLowerCase()

type SortKey = 'date' | 'supplier' | 'number' | 'items'
const SORT_KEYS: readonly SortKey[] = ['date', 'supplier', 'number', 'items']
type ItemsFilter = 'all' | 'with' | 'without'
type SectionKey = 'date' | 'sections' | 'supplier' | 'items'

// Data e itens começam do maior/mais recente; fornecedor e número, de A→Z.
const defaultDir = (key: SortKey): SortDirection => (key === 'supplier' || key === 'number' ? 'asc' : 'desc')

const SORT_LABELS: Record<SortKey, { label: string; asc: string; desc: string }> = {
  date: { label: 'Data', asc: 'mais antiga', desc: 'mais recente' },
  supplier: { label: 'Fornecedor', asc: 'A→Z', desc: 'Z→A' },
  number: { label: 'NF-e / AWB', asc: 'A→Z', desc: 'Z→A' },
  items: { label: 'Produtos', asc: 'menos produtos', desc: 'mais produtos' },
}

const SECTION_ICON: Record<DocumentSection, typeof DocumentIcon> = {
  nfe: DocumentIcon,
  import: PackageIcon,
  payment: DocumentIcon,
  shipping: TruckIcon,
}

export function DocumentsListPage() {
  const [query, setQuery] = useState('')
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="shrink-0 text-xl font-bold text-stone-100">Documentos</h1>
        <div className="min-w-0 flex-1">
          <SearchField
            value={query}
            onCommit={setQuery}
            placeholder="Buscar por fornecedor, número, transportadora…"
            className="border-stone-700/80 bg-stone-950/70 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
          />
        </div>
        <Link to="/documentos/novo" className="btn-primary h-9 min-h-9 w-9 shrink-0 px-0 py-0" title="Novo documento" aria-label="Novo documento">
          <PlusIcon />
        </Link>
      </div>
      <DocumentsContent query={query} />
    </div>
  )
}

function DocumentsContent({ query }: { query: string }) {
  const { data: documents, isLoading, error } = useQuery({ queryKey: ['documents'], queryFn: fetchDocuments })
  // Contagem de itens vinculados: secundária — se falhar, a coluna mostra "—" e a lista segue funcionando.
  // staleTime 0: vincular/desvincular acontece em várias telas (documento, ficha, formulário); em vez de
  // espalhar invalidação por todas, a contagem é relida a cada vez que a lista abre (query leve, 1 tabela).
  const { data: itemCounts } = useQuery({ queryKey: ['document-item-counts'], queryFn: fetchDocumentItemCounts, staleTime: 0 })

  // Ordenação: preferência do dispositivo, fora dos filtros (mesmo critério da Coleção).
  // Padrão: data, mais recente primeiro.
  const sort = usePersistedSort<SortKey>('tt_loja_documents_sort', SORT_KEYS, { field: 'date', dir: 'desc' }, defaultDir)

  // Filtros (não persistem): ano/período, seções, fornecedor e vínculo com itens.
  const [year, setYear] = useState<number | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sectionFilter, setSectionFilter] = useState<DocumentSection[]>([])
  const [supplierFilter, setSupplierFilter] = useState('')
  const [itemsFilter, setItemsFilter] = useState<ItemsFilter>('all')

  const dateActive = year !== 'all' || Boolean(dateFrom || dateTo)
  const sectionsActive = sectionFilter.length > 0
  const supplierActive = supplierFilter !== ''
  const itemsActive = itemsFilter !== 'all'
  const activeFilters = [dateActive, sectionsActive, supplierActive, itemsActive].filter(Boolean).length
  const clearFilters = () => {
    setYear('all')
    setDateFrom('')
    setDateTo('')
    setSectionFilter([])
    setSupplierFilter('')
    setItemsFilter('all')
  }
  const panel = useFilterSections<SectionKey>([
    ...(dateActive ? (['date'] as const) : []),
    ...(sectionsActive ? (['sections'] as const) : []),
    ...(supplierActive ? (['supplier'] as const) : []),
    ...(itemsActive ? (['items'] as const) : []),
  ])

  const years = useMemo(
    () => [...new Set((documents ?? []).map((d) => d.year).filter((a): a is number => a != null))].sort((a, b) => b - a),
    [documents],
  )
  const supplierNames = useMemo(
    () =>
      [...new Set((documents ?? []).map((d) => d.supplier_name?.trim()).filter((n): n is string => !!n))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
      ),
    [documents],
  )

  const filtered = useMemo(() => {
    if (!documents) return []
    const q = normalizeSearchText(query.trim())
    const list = documents.filter((d) => {
      if (year !== 'all' && d.year !== year) return false
      const date = documentDate(d) ?? ''
      if (dateFrom && (!date || date < dateFrom)) return false
      if (dateTo && (!date || date > dateTo)) return false
      if (sectionFilter.length > 0 && !documentSections(d).some((s) => sectionFilter.includes(s))) return false
      if (supplierFilter && d.supplier_name?.trim() !== supplierFilter) return false
      if (itemsFilter !== 'all') {
        const n = itemCounts?.get(d.id) ?? 0
        if (itemsFilter === 'with' ? n === 0 : n > 0) return false
      }
      if (!q) return true
      return normalizeSearchText(
        [
          d.supplier_name,
          d.supplier_tax_id,
          d.carrier,
          d.nfe_number,
          d.nfe_key,
          d.invoice_number,
          d.awb,
          d.shipping_tracking,
          d.notes,
          d.general_notes,
          formatDate(documentDate(d)),
        ]
          .filter(Boolean)
          .join(' '),
      ).includes(q)
    })
    type Row = (typeof list)[number]
    const byDate = (a: Row, b: Row) => (documentDate(a) ?? '').localeCompare(documentDate(b) ?? '')
    const dir = sort.dir === 'asc' ? 1 : -1
    const textOf = (d: Row) => ((sort.field === 'supplier' ? d.supplier_name : documentNumber(d)) ?? '').trim()
    return [...list].sort((a, b) => {
      if (sort.field === 'date') return dir * byDate(a, b)
      if (sort.field === 'items') {
        // Mesma quantidade: documento mais recente primeiro.
        return dir * ((itemCounts?.get(a.id) ?? 0) - (itemCounts?.get(b.id) ?? 0)) || byDate(b, a)
      }
      // Fornecedor / número: alfabético sem distinguir acento/caixa; vazio vai sempre pro fim.
      const textA = textOf(a)
      const textB = textOf(b)
      if (!textA !== !textB) return textA ? -1 : 1
      // Mesmo valor: documento mais recente primeiro.
      return dir * textA.localeCompare(textB, undefined, { sensitivity: 'base', numeric: true }) || byDate(b, a)
    })
  }, [documents, year, dateFrom, dateTo, sectionFilter, supplierFilter, itemsFilter, sort.field, sort.dir, query, itemCounts])

  if (isLoading) return <p className="py-8 text-center text-stone-500">{'Carregando…'}</p>
  if (error) return <p className="py-8 text-center text-red-400">{(error as Error).message}</p>
  if (!documents || documents.length === 0)
    return <p className="py-8 text-center text-stone-500">{'Nenhum documento cadastrado ainda.'}</p>

  const narrowed = filtered.length !== documents.length

  return (
    <div className="space-y-3">
      <ListToolbar
        summary={
          narrowed
            ? `${filtered.length} de ${documents.length} documentos`
            : (documents.length === 1 ? `${documents.length} documento` : `${documents.length} documentos`)
        }
        sort={{
          options: SORT_KEYS.map((k) => ({
            value: k,
            label: SORT_LABELS[k].label,
            ascLabel: SORT_LABELS[k].asc,
            descLabel: SORT_LABELS[k].desc,
          })),
          value: sort.field,
          dir: sort.dir,
          onChangeField: (v) => sort.changeField(v as SortKey),
          onToggleDir: sort.toggleDir,
        }}
        activeFilters={activeFilters}
        onClearFilters={clearFilters}
        chips={
          <>
            <FilterChip
              label={'Data'}
              icon={ClockIcon}
              active={dateActive}
              open={panel.isOpen('date')}
              onClick={() => panel.toggle('date')}
            />
            <FilterChip
              label={'Seções'}
              icon={DocumentIcon}
              active={sectionsActive}
              open={panel.isOpen('sections')}
              onClick={() => panel.toggle('sections')}
            />
            {supplierNames.length > 0 && (
              <FilterChip
                label={'Fornecedor'}
                icon={TruckIcon}
                active={supplierActive}
                open={panel.isOpen('supplier')}
                onClick={() => panel.toggle('supplier')}
              />
            )}
            <FilterChip
              label={'Produtos'}
              icon={PackageIcon}
              active={itemsActive}
              open={panel.isOpen('items')}
              onClick={() => panel.toggle('items')}
            />
          </>
        }
        sections={
          <>
            {panel.isOpen('date') && (
              <FilterSection>
                <div className="flex flex-wrap items-center gap-2">
                  <FilterPill active={year === 'all'} onClick={() => setYear('all')}>
                    {'Todos'}
                  </FilterPill>
                  {years.map((y) => (
                    <FilterPill key={y} active={year === y} onClick={() => setYear(y)}>
                      {y}
                    </FilterPill>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-800 pt-3">
                  <div className="flex items-center gap-2 text-sm text-stone-400">
                    <span>{'De'}</span>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input w-auto" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-400">
                    <span>{'Até'}</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input w-auto" />
                  </div>
                </div>
              </FilterSection>
            )}
            {panel.isOpen('sections') && (
              <FilterSection>
                <div className="flex flex-wrap gap-2">
                  {SECTION_DISPLAY_ORDER.map((s) => {
                    const Icon = SECTION_ICON[s]
                    const active = sectionFilter.includes(s)
                    return (
                      <FilterPill
                        key={s}
                        active={active}
                        onClick={() => setSectionFilter(active ? sectionFilter.filter((x) => x !== s) : [...sectionFilter, s])}
                      >
                        <Icon className="text-base" aria-hidden="true" /> {DOCUMENT_SECTION_LABELS[s]}
                      </FilterPill>
                    )
                  })}
                </div>
              </FilterSection>
            )}
            {panel.isOpen('supplier') && (
              <FilterSection>
                <label className="block sm:max-w-sm">
                  <span className="mb-1.5 block text-xs font-medium text-stone-400">{'Fornecedor'}</span>
                  <OptionSelect
                    value={supplierFilter}
                    ariaLabel="Fornecedor"
                    options={[{ value: '', label: 'Todos os fornecedores' }, ...supplierNames.map((n) => ({ value: n, label: n }))]}
                    onChange={setSupplierFilter}
                  />
                </label>
              </FilterSection>
            )}
            {panel.isOpen('items') && (
              <FilterSection>
                <div className="flex flex-wrap gap-2">
                  {(['with', 'without'] as const).map((v) => (
                    <FilterPill key={v} active={itemsFilter === v} onClick={() => setItemsFilter(itemsFilter === v ? 'all' : v)}>
                      {v === 'with' ? 'Com produtos vinculados' : 'Sem produtos vinculados'}
                    </FilterPill>
                  ))}
                </div>
              </FilterSection>
            )}
          </>
        }
      />

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-stone-500">{'Nenhum documento encontrado.'}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-stone-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-left text-xs text-stone-500 uppercase">
                <SortableTh active={sort.field === 'date'} dir={sort.dir} onClick={() => sort.clickField('date')}>
                  {'Data'}
                </SortableTh>
                <SortableTh active={sort.field === 'supplier'} dir={sort.dir} onClick={() => sort.clickField('supplier')}>
                  {'Fornecedor'}
                </SortableTh>
                <SortableTh active={sort.field === 'number'} dir={sort.dir} onClick={() => sort.clickField('number')}>
                  {'NF-e / AWB'}
                </SortableTh>
                <SortableTh active={sort.field === 'items'} dir={sort.dir} onClick={() => sort.clickField('items')} align="right">
                  {'Produtos'}
                </SortableTh>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-stone-800 last:border-0 hover:bg-stone-800">
                  <td className="p-0">
                    <Link to={`/documentos/${d.id}`} className="block px-3 py-2 text-stone-300">
                      {formatDate(documentDate(d))}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link to={`/documentos/${d.id}`} className="block px-3 py-2 text-stone-100">
                      {d.supplier_name || '—'}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link to={`/documentos/${d.id}`} className="flex items-center gap-2 px-3 py-2 font-mono text-xs">
                      <span className="rounded bg-stone-800 px-1.5 py-0.5 text-amber-500">
                        {documentBadge(d)}
                      </span>
                      {documentNumber(d) || '—'}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link to={`/documentos/${d.id}`} className="block px-3 py-2 text-right text-stone-300 tabular-nums">
                      {itemCounts ? (itemCounts.get(d.id) ?? 0) : '—'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

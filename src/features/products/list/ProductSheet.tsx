import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { StoreProduct } from '../../../types/db'
import { queryClient } from '../../../lib/queryClient'
import { PRODUCTS_KEY } from '../productsCache'
import { updateProduct } from '../api'
import { useToast } from '../../../components/ToastProvider'
import { CheckIcon, PhotoIcon, WarningIcon } from '../../../components/icons'
import {
  COLUMN_BY_KEY,
  COL_MAX_WIDTH,
  COL_MIN_WIDTH,
  appliesTo,
  parseCellValue,
  rawValue,
  type ColumnContext,
  type ColumnDef,
  type SelectOption,
} from './columns'
import { fillValueAt, planFill } from './fill'
import { FindReplaceDialog, replaceText, type ReplaceOptions } from './FindReplaceDialog'

/**
 * Modo lista/planilha de Produtos — versão da loja do modo lista do catálogo
 * pessoal (`SpecimenBrowseView.tsx` + `SpecimenRow.tsx`): colunas escolhidas,
 * reordenáveis (arrastar o cabeçalho), redimensionáveis e congeláveis;
 * ordenação por coluna (Shift acrescenta desempate) e, no modo planilha,
 * seleção de células (arrastar, Shift, Ctrl), edição na célula, Ctrl+C/Ctrl+V,
 * alça de preenchimento, Ctrl+D/Ctrl+R, Delete, Ctrl+Z/Ctrl+Y e Localizar e
 * substituir (Ctrl+F). Toda gravação passa por `updateProduct` e atualiza o
 * cache ['products'] na hora (otimista).
 */

export interface SortRule {
  key: string
  dir: 'asc' | 'desc'
}

interface Range {
  r0: number
  c0: number
  r1: number
  c1: number
}
const norm = (g: Range) => ({
  r0: Math.min(g.r0, g.r1),
  r1: Math.max(g.r0, g.r1),
  c0: Math.min(g.c0, g.c1),
  c1: Math.max(g.c0, g.c1),
})

interface CellChange {
  id: string
  field: keyof StoreProduct
  before: unknown
  after: unknown
}

const ROW_CHECKBOX_WIDTH = 36
const UNDO_LIMIT = 50

export function ProductSheet({
  rows,
  columns,
  onColumnsChange,
  widths,
  onWidthsChange,
  frozen,
  gridMode,
  ctx,
  coverUrls,
  sort,
  onSortChange,
  rowSelection,
  onOpen,
  findOpen,
  onFindOpenChange,
}: {
  rows: StoreProduct[]
  columns: string[]
  onColumnsChange: (cols: string[]) => void
  widths: Record<string, number>
  onWidthsChange: (w: Record<string, number>, persist: boolean) => void
  frozen: number
  gridMode: boolean
  ctx: ColumnContext
  coverUrls: Record<string, string>
  sort: SortRule[]
  onSortChange: (s: SortRule[]) => void
  rowSelection: { active: boolean; selected: Set<string>; toggle: (id: string) => void; setAll: (ids: string[]) => void } | null
  onOpen: (id: string) => void
  findOpen: boolean
  onFindOpenChange: (open: boolean) => void
}) {
  const toast = useToast()
  const cols = useMemo(() => columns.map((k) => COLUMN_BY_KEY.get(k)).filter((c): c is ColumnDef => !!c), [columns])
  const widthOf = (c: ColumnDef) => widths[c.key] ?? c.width

  const [ranges, setRanges] = useState<Range[] | null>(null)
  const [active, setActive] = useState<{ r: number; c: number } | null>(null)
  const [editing, setEditing] = useState<{ r: number; c: number; initial?: string } | null>(null)
  const [fillTo, setFillTo] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const dragRef = useRef<'select' | 'fill' | null>(null)
  const anchorRef = useRef<{ r: number; c: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const undoRef = useRef<CellChange[][]>([])
  const redoRef = useRef<CellChange[][]>([])

  // Saiu do modo planilha (ou a lista mudou de tamanho): limpa seleção/edição.
  useEffect(() => {
    if (!gridMode) {
      setRanges(null)
      setActive(null)
      setEditing(null)
    }
  }, [gridMode])
  useEffect(() => {
    setRanges((prev) => (prev && rows.length === 0 ? null : prev))
  }, [rows.length])

  // ── Gravação (otimista no cache + updateProduct por produto) ────────────
  const writeChanges = useCallback(
    async (changes: CellChange[], direction: 'forward' | 'undo' | 'redo' = 'forward') => {
      if (changes.length === 0) return
      const patches = new Map<string, Record<string, unknown>>()
      for (const ch of changes) {
        const value = direction === 'undo' ? ch.before : ch.after
        patches.set(ch.id, { ...(patches.get(ch.id) ?? {}), [ch.field]: value })
      }
      const previous = queryClient.getQueryData<StoreProduct[]>(PRODUCTS_KEY)
      queryClient.setQueryData<StoreProduct[]>(PRODUCTS_KEY, (old) =>
        old?.map((p) => (patches.has(p.id) ? ({ ...p, ...patches.get(p.id) } as StoreProduct) : p)),
      )
      if (direction === 'forward') {
        undoRef.current = [...undoRef.current.slice(-(UNDO_LIMIT - 1)), changes]
        redoRef.current = []
      }
      setBusy(true)
      try {
        await Promise.all([...patches].map(([id, patch]) => updateProduct(id, patch)))
      } catch (err) {
        if (previous) queryClient.setQueryData(PRODUCTS_KEY, previous)
        toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
      } finally {
        setBusy(false)
      }
    },
    [toast],
  )

  /** Monta as mudanças a partir de (linha, coluna, texto), validando cada célula. */
  const buildChanges = useCallback(
    (cells: { r: number; c: number; text: string }[]): CellChange[] => {
      const out: CellChange[] = []
      const errors: string[] = []
      for (const { r, c, text } of cells) {
        const p = rows[r]
        const col = cols[c]
        if (!p || !col?.edit || !appliesTo(col, p)) continue
        const parsed = parseCellValue(col, text, ctx)
        if (!parsed.ok) {
          errors.push(parsed.error)
          continue
        }
        const before = p[col.edit.field]
        if ((before ?? null) === (parsed.value ?? null)) continue
        out.push({ id: p.id, field: col.edit.field, before, after: parsed.value })
      }
      if (errors.length > 0) {
        toast.error(errors.length === 1 ? errors[0] : `${errors.length} células não foram alteradas. ${errors[0]}`)
      }
      return out
    },
    [rows, cols, ctx, toast],
  )

  const commitEdit = (r: number, c: number, text: string) => {
    setEditing(null)
    void writeChanges(buildChanges([{ r, c, text }]))
    containerRef.current?.focus()
  }

  // ── Seleção de células ───────────────────────────────────────────────────
  const inRanges = (r: number, c: number) =>
    !!ranges?.some((g) => {
      const n = norm(g)
      return r >= n.r0 && r <= n.r1 && c >= n.c0 && c <= n.c1
    })
  const lastRange = ranges && ranges.length > 0 ? norm(ranges[ranges.length - 1]) : null

  const selectCell = (r: number, c: number, extend: boolean, add: boolean) => {
    if (extend && anchorRef.current) {
      const a = anchorRef.current
      setRanges((prev) => [...(prev ?? []).slice(0, -1), { r0: a.r, c0: a.c, r1: r, c1: c }])
    } else {
      anchorRef.current = { r, c }
      setRanges((prev) => (add ? [...(prev ?? []), { r0: r, c0: c, r1: r, c1: c }] : [{ r0: r, c0: c, r1: r, c1: c }]))
    }
    setActive({ r, c })
  }

  const onCellMouseDown = (e: React.MouseEvent, r: number, c: number) => {
    if (!gridMode || e.button !== 0) return
    if (editing && editing.r === r && editing.c === c) return
    e.preventDefault()
    setEditing(null)
    containerRef.current?.focus()
    selectCell(r, c, e.shiftKey, e.ctrlKey || e.metaKey)
    dragRef.current = 'select'
  }
  const onCellMouseEnter = (r: number, c: number) => {
    if (dragRef.current === 'select' && anchorRef.current) {
      const a = anchorRef.current
      setRanges((prev) => [...(prev ?? []).slice(0, -1), { r0: a.r, c0: a.c, r1: r, c1: c }])
      setActive({ r, c })
    } else if (dragRef.current === 'fill') {
      setFillTo(r)
    }
  }

  const selectColumn = (c: number, extend: boolean, add: boolean) => {
    const last = rows.length - 1
    if (last < 0) return
    containerRef.current?.focus()
    if (extend && anchorRef.current) {
      const a = anchorRef.current
      setRanges((prev) => [...(prev ?? []).slice(0, -1), { r0: 0, c0: a.c, r1: last, c1: c }])
    } else {
      anchorRef.current = { r: 0, c }
      setRanges((prev) => (add ? [...(prev ?? []), { r0: 0, c0: c, r1: last, c1: c }] : [{ r0: 0, c0: c, r1: last, c1: c }]))
    }
    setActive({ r: 0, c })
  }

  // ── Alça de preenchimento ────────────────────────────────────────────────
  const applyFill = useCallback(
    (target: number) => {
      if (!lastRange) return
      const goingDown = target > lastRange.r1
      const goingUp = target < lastRange.r0
      if (!goingDown && !goingUp) return
      const cells: { r: number; c: number; text: string }[] = []
      for (let c = lastRange.c0; c <= lastRange.c1; c++) {
        const col = cols[c]
        const src: string[] = []
        for (let r = lastRange.r0; r <= lastRange.r1; r++) src.push(rows[r] ? rawValue(col, rows[r], ctx) : '')
        const plan = planFill(src, false)
        const from = goingDown ? lastRange.r1 + 1 : target
        const to = goingDown ? target : lastRange.r0 - 1
        for (let r = from; r <= to; r++) {
          const distance = goingDown ? r - lastRange.r1 : lastRange.r0 - r
          const v = fillValueAt(plan, src, distance, goingDown)
          if (v != null) cells.push({ r, c, text: v })
        }
      }
      void writeChanges(buildChanges(cells))
      setRanges([{ r0: goingDown ? lastRange.r0 : target, c0: lastRange.c0, r1: goingDown ? target : lastRange.r1, c1: lastRange.c1 }])
    },
    [lastRange, cols, rows, ctx, writeChanges, buildChanges],
  )

  useEffect(() => {
    const up = () => {
      if (dragRef.current === 'fill' && fillTo != null) applyFill(fillTo)
      dragRef.current = null
      setFillTo(null)
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [fillTo, applyFill])

  // ── Teclado (copiar, colar, preencher, apagar, desfazer, navegar) ────────
  const copySelection = async () => {
    if (!lastRange) return
    const lines: string[] = []
    for (let r = lastRange.r0; r <= lastRange.r1; r++) {
      const cells: string[] = []
      for (let c = lastRange.c0; c <= lastRange.c1; c++) {
        const p = rows[r]
        const col = cols[c]
        const v = p && col && appliesTo(col, p) ? rawValue(col, p, ctx) : ''
        cells.push(/[\t\n"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
      }
      lines.push(cells.join('\t'))
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      const n = (lastRange.r1 - lastRange.r0 + 1) * (lastRange.c1 - lastRange.c0 + 1)
      toast.success(n === 1 ? 'Célula copiada.' : `${n} células copiadas.`)
    } catch {
      toast.error('Não foi possível copiar para a área de transferência.')
    }
  }

  const pasteText = (text: string) => {
    if (!lastRange) return
    const grid = parseTsv(text)
    if (grid.length === 0) return
    const cells: { r: number; c: number; text: string }[] = []
    const single = grid.length === 1 && grid[0].length === 1
    if (single) {
      // Um valor só: preenche toda a seleção (como no Google Planilhas).
      for (const g of ranges ?? []) {
        const n = norm(g)
        for (let r = n.r0; r <= n.r1; r++) for (let c = n.c0; c <= n.c1; c++) cells.push({ r, c, text: grid[0][0] })
      }
    } else {
      for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
          const r = lastRange.r0 + i
          const c = lastRange.c0 + j
          if (r < rows.length && c < cols.length) cells.push({ r, c, text: grid[i][j] })
        }
      }
      setRanges([{ r0: lastRange.r0, c0: lastRange.c0, r1: Math.min(rows.length - 1, lastRange.r0 + grid.length - 1), c1: Math.min(cols.length - 1, lastRange.c0 + Math.max(...grid.map((l) => l.length)) - 1) }])
    }
    void writeChanges(buildChanges(cells))
  }

  const fillDownOrRight = (dir: 'down' | 'right') => {
    const cells: { r: number; c: number; text: string }[] = []
    for (const g of ranges ?? []) {
      const n = norm(g)
      for (let r = n.r0; r <= n.r1; r++) {
        for (let c = n.c0; c <= n.c1; c++) {
          if (dir === 'down' ? r === n.r0 : c === n.c0) continue
          const sr = dir === 'down' ? n.r0 : r
          const sc = dir === 'down' ? c : n.c0
          const p = rows[sr]
          const col = cols[sc]
          if (p && col) cells.push({ r, c, text: rawValue(col, p, ctx) })
        }
      }
    }
    void writeChanges(buildChanges(cells))
  }

  const clearSelection = () => {
    const changes: CellChange[] = []
    for (const g of ranges ?? []) {
      const n = norm(g)
      for (let r = n.r0; r <= n.r1; r++) {
        for (let c = n.c0; c <= n.c1; c++) {
          const p = rows[r]
          const col = cols[c]
          const e = col?.edit
          if (!p || !e || !appliesTo(col, p)) continue
          if (e.type === 'boolean' || ('required' in e && e.required) || e.field === 'name') continue
          if (p[e.field] == null || p[e.field] === '') continue
          changes.push({ id: p.id, field: e.field, before: p[e.field], after: null })
        }
      }
    }
    void writeChanges(changes)
  }

  const undo = () => {
    const entry = undoRef.current.pop()
    if (!entry) return
    redoRef.current.push(entry)
    void writeChanges(entry, 'undo')
  }
  const redo = () => {
    const entry = redoRef.current.pop()
    if (!entry) return
    undoRef.current.push(entry)
    void writeChanges(entry, 'redo')
  }

  const startEdit = (r: number, c: number, initial?: string) => {
    const p = rows[r]
    const col = cols[c]
    if (!p || !col?.edit || !appliesTo(col, p)) return
    if (col.edit.type === 'boolean' && initial === undefined) {
      // Booleano alterna direto, sem editor.
      void writeChanges([{ id: p.id, field: col.edit.field, before: p[col.edit.field], after: !p[col.edit.field] }])
      return
    }
    setEditing({ r, c, initial })
  }

  const move = (dr: number, dc: number, extend: boolean) => {
    if (!active) return
    const r = Math.max(0, Math.min(rows.length - 1, active.r + dr))
    const c = Math.max(0, Math.min(cols.length - 1, active.c + dc))
    selectCell(r, c, extend, false)
    containerRef.current?.querySelector<HTMLElement>(`[data-cell="${r}-${c}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!gridMode || editing) return
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    if (mod && k === 'z' && !e.shiftKey) return void (e.preventDefault(), undo())
    if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) return void (e.preventDefault(), redo())
    if (mod && k === 'f') return void (e.preventDefault(), onFindOpenChange(true))
    if (!active) return
    if (mod && k === 'c') return void (e.preventDefault(), void copySelection())
    if (mod && k === 'd') return void (e.preventDefault(), fillDownOrRight('down'))
    if (mod && k === 'r') return void (e.preventDefault(), fillDownOrRight('right'))
    if (mod && k === 'a') {
      e.preventDefault()
      anchorRef.current = { r: 0, c: 0 }
      setRanges([{ r0: 0, c0: 0, r1: rows.length - 1, c1: cols.length - 1 }])
      return
    }
    if (mod) return // Ctrl+V é tratado pelo evento `paste`.
    switch (e.key) {
      case 'ArrowUp':
        return void (e.preventDefault(), move(-1, 0, e.shiftKey))
      case 'ArrowDown':
        return void (e.preventDefault(), move(1, 0, e.shiftKey))
      case 'ArrowLeft':
        return void (e.preventDefault(), move(0, -1, e.shiftKey))
      case 'ArrowRight':
        return void (e.preventDefault(), move(0, 1, e.shiftKey))
      case 'Tab':
        return void (e.preventDefault(), move(0, e.shiftKey ? -1 : 1, false))
      case 'Enter':
      case 'F2':
        e.preventDefault()
        return startEdit(active.r, active.c)
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        return clearSelection()
      case 'Escape':
        setRanges(null)
        setActive(null)
        return
    }
    // Digitar um caractere começa a editar substituindo o conteúdo.
    if (e.key.length === 1 && !e.altKey) {
      const col = cols[active.c]
      if (col?.edit && col.edit.type !== 'boolean') {
        e.preventDefault()
        startEdit(active.r, active.c, e.key)
      }
    }
  }

  const onPaste = (e: React.ClipboardEvent) => {
    if (!gridMode || editing || !lastRange) return
    e.preventDefault()
    pasteText(e.clipboardData.getData('text/plain'))
  }

  // ── Localizar e substituir ───────────────────────────────────────────────
  const collectReplace = (opts: ReplaceOptions) => {
    const cells: { r: number; c: number; text: string }[] = []
    const inScope = (r: number, c: number) => !opts.selectionOnly || inRanges(r, c)
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c]
        if (!col.edit || col.edit.type === 'boolean' || !appliesTo(col, rows[r]) || !inScope(r, c)) continue
        const before = rawValue(col, rows[r], ctx)
        const after = replaceText(before, opts)
        if (after !== before) cells.push({ r, c, text: after })
      }
    }
    return cells
  }

  // ── Colunas: ordenar, reordenar, redimensionar, congelar ────────────────
  const onHeaderClick = (e: React.MouseEvent, c: number, key: string) => {
    if (gridMode) return selectColumn(c, e.shiftKey, e.ctrlKey || e.metaKey)
    toggleSort(key, e.shiftKey)
  }
  const toggleSort = (key: string, add: boolean) => {
    const current = sort.find((s) => s.key === key)
    if (add) {
      if (!current) onSortChange([...sort, { key, dir: 'asc' }])
      else onSortChange(sort.map((s) => (s.key === key ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' } : s)))
      return
    }
    if (current && sort.length === 1) {
      onSortChange(current.dir === 'asc' ? [{ key, dir: 'desc' }] : [])
    } else onSortChange([{ key, dir: 'asc' }])
  }

  const dragColRef = useRef<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const onColDrop = (targetKey: string) => {
    const from = dragColRef.current
    dragColRef.current = null
    setDropTarget(null)
    if (!from || from === targetKey) return
    const next = columns.filter((k) => k !== from)
    next.splice(next.indexOf(targetKey), 0, from)
    onColumnsChange(next)
  }

  const showCheckbox = !!rowSelection?.active
  const frozenOffsets = useMemo(() => {
    const out: number[] = []
    let left = showCheckbox ? ROW_CHECKBOX_WIDTH : 0
    for (let i = 0; i < Math.min(frozen, cols.length); i++) {
      out.push(left)
      left += widths[cols[i].key] ?? cols[i].width
    }
    return out
  }, [frozen, cols, widths, showCheckbox])
  const frozenStyle = (c: number): React.CSSProperties | undefined =>
    c < frozenOffsets.length ? { position: 'sticky', left: frozenOffsets[c], zIndex: 1 } : undefined
  const isLastFrozen = (c: number) => frozenOffsets.length > 0 && c === frozenOffsets.length - 1

  const totalWidth = cols.reduce((sum, c) => sum + widthOf(c), 0) + (showCheckbox ? ROW_CHECKBOX_WIDTH : 0)
  const fillRange =
    lastRange && fillTo != null
      ? fillTo > lastRange.r1
        ? { r0: lastRange.r1 + 1, r1: fillTo }
        : fillTo < lastRange.r0
          ? { r0: fillTo, r1: lastRange.r0 - 1 }
          : null
      : null

  return (
    <div className="space-y-2">
      {gridMode && (
        <p className="hidden flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-stone-400 sm:flex">
          Arraste para selecionar. <Kbd>Ctrl</Kbd>+clique acrescenta células. <Kbd>Ctrl+C</Kbd> copia, <Kbd>Ctrl+V</Kbd> cola em massa,{' '}
          <Kbd>Ctrl+D</Kbd>/<Kbd>Ctrl+R</Kbd> preenchem para baixo e para a direita, <Kbd>Ctrl+Z</Kbd>/<Kbd>Ctrl+Y</Kbd> desfazem e
          refazem. Clique duas vezes ou pressione <Kbd>Enter</Kbd> para editar.
          <button type="button" onClick={() => onFindOpenChange(true)} className="ml-1 rounded bg-stone-800 px-2 py-0.5 hover:bg-stone-700">
            Localizar e substituir <span className="text-stone-500">Ctrl+F</span>
          </button>
          {busy && <span className="text-amber-400">Salvando…</span>}
        </p>
      )}
      {sort.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-stone-500">
          <span className="flex items-center gap-1 rounded-full bg-amber-600/20 px-2 py-0.5 text-amber-400">
            {sort.length > 1 ? `Ordenado por ${sort.length} colunas` : 'Ordenação pela coluna'}
            <button type="button" onClick={() => onSortChange([])} aria-label="Remover ordenação pela coluna" className="ml-1 hover:text-amber-200">
              ✕
            </button>
          </span>
          <span>
            <Kbd>Shift</Kbd>+clique no cabeçalho acrescenta um critério de desempate.
          </span>
        </p>
      )}

      <div
        ref={containerRef}
        tabIndex={gridMode ? 0 : undefined}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className={`max-h-[calc(100dvh-15rem)] min-h-40 overflow-auto rounded-lg border border-stone-800 outline-none ${
          gridMode ? 'select-none focus-visible:border-stone-600' : ''
        }`}
      >
        <table className="table-fixed border-separate border-spacing-0 text-left text-sm" style={{ width: Math.max(totalWidth, 0), minWidth: '100%' }}>
          <colgroup>
            {showCheckbox && <col style={{ width: ROW_CHECKBOX_WIDTH }} />}
            {cols.map((c) => (
              <col key={c.key} style={{ width: widthOf(c) }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-stone-900 text-stone-400">
            <tr>
              {showCheckbox && (
                <th className="frozen-cell sticky left-0 z-10 border-b border-stone-800 px-2 py-2" style={{ width: ROW_CHECKBOX_WIDTH }}>
                  <CheckBoxMark
                    checked={rows.length > 0 && rows.every((p) => rowSelection!.selected.has(p.id))}
                    onClick={() =>
                      rowSelection!.setAll(rows.every((p) => rowSelection!.selected.has(p.id)) ? [] : rows.map((p) => p.id))
                    }
                    label="Selecionar todos"
                  />
                </th>
              )}
              {cols.map((col, c) => {
                const s = sort.find((x) => x.key === col.key)
                const sortIndex = sort.findIndex((x) => x.key === col.key)
                return (
                  <th
                    key={col.key}
                    draggable={!gridMode}
                    onDragStart={(e) => {
                      dragColRef.current = col.key
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={(e) => {
                      if (!dragColRef.current) return
                      e.preventDefault()
                      setDropTarget(col.key)
                    }}
                    onDragLeave={() => setDropTarget((t) => (t === col.key ? null : t))}
                    onDrop={() => onColDrop(col.key)}
                    onDragEnd={() => {
                      dragColRef.current = null
                      setDropTarget(null)
                    }}
                    onClick={(e) => col.key !== 'foto' && onHeaderClick(e, c, col.key)}
                    title={gridMode ? 'Clique para selecionar a coluna' : 'Clique para ordenar. Arraste para mudar a posição.'}
                    style={frozenStyle(c)}
                    className={`group relative border-b border-stone-800 px-3 py-2 font-medium whitespace-nowrap select-none ${
                      c < frozenOffsets.length ? 'frozen-cell' : ''
                    } ${isLastFrozen(c) ? 'border-r border-r-stone-700' : ''} ${
                      dropTarget === col.key ? 'bg-amber-600/20' : ''
                    } ${col.key !== 'foto' ? 'cursor-pointer hover:text-stone-200' : ''} ${col.numeric ? 'text-right' : ''}`}
                  >
                    <span className="inline-flex max-w-full items-center gap-1 truncate">
                      <span className="truncate">{col.key === 'foto' ? '' : col.label}</span>
                      {s && (
                        <span className="shrink-0 text-amber-500">
                          {s.dir === 'asc' ? '↑' : '↓'}
                          {sort.length > 1 && <sup className="text-xs">{sortIndex + 1}</sup>}
                        </span>
                      )}
                      {gridMode && col.key !== 'foto' && !s && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSort(col.key, e.shiftKey)
                          }}
                          aria-label={`Ordenar por ${col.label}`}
                          title={`Ordenar por ${col.label}`}
                          className="shrink-0 text-stone-600 opacity-0 transition group-hover:opacity-100 hover:text-amber-400"
                        >
                          ↕
                        </button>
                      )}
                    </span>
                    <ResizeHandle
                      onResize={(w) => onWidthsChange({ ...widths, [col.key]: w }, false)}
                      onCommit={(w) => onWidthsChange({ ...widths, [col.key]: w }, true)}
                      onReset={() => {
                        const next = { ...widths }
                        delete next[col.key]
                        onWidthsChange(next, true)
                      }}
                    />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, r) => {
              const selected = rowSelection?.selected.has(p.id)
              return (
                <tr
                  key={p.id}
                  onClick={() => {
                    if (gridMode) return
                    if (rowSelection?.active) rowSelection.toggle(p.id)
                    else onOpen(p.id)
                  }}
                  className={`${gridMode ? '' : 'cursor-pointer'} bg-stone-950 transition-colors hover:bg-stone-900 ${selected ? 'bg-amber-950' : ''}`}
                >
                  {showCheckbox && (
                    <td className="frozen-cell sticky left-0 z-[1] border-b border-stone-800/70 px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <CheckBoxMark checked={!!selected} onClick={() => rowSelection!.toggle(p.id)} label={`Selecionar ${p.name}`} />
                    </td>
                  )}
                  {cols.map((col, c) => {
                    const isActive = active?.r === r && active?.c === c
                    const sel = gridMode && inRanges(r, c)
                    const inFill = fillRange && r >= fillRange.r0 && r <= fillRange.r1 && lastRange && c >= lastRange.c0 && c <= lastRange.c1
                    const showHandle = gridMode && lastRange && !editing && r === lastRange.r1 && c === lastRange.c1
                    const isEditing = editing?.r === r && editing?.c === c
                    const applies = appliesTo(col, p)
                    return (
                      <td
                        key={col.key}
                        data-cell={`${r}-${c}`}
                        onMouseDown={(e) => onCellMouseDown(e, r, c)}
                        onMouseEnter={() => onCellMouseEnter(r, c)}
                        onDoubleClick={() => gridMode && startEdit(r, c)}
                        style={frozenStyle(c)}
                        className={`relative border-b border-stone-800/70 align-middle ${col.key === 'foto' ? 'p-1' : 'px-3 py-1.5'} ${
                          c < frozenOffsets.length ? 'frozen-cell' : ''
                        } ${isLastFrozen(c) ? 'border-r border-r-stone-700' : ''} ${sel ? '!bg-amber-600/15' : ''} ${
                          inFill ? '!bg-amber-600/10 outline-1 -outline-offset-1 outline-amber-500/60 outline-dashed' : ''
                        } ${isActive ? 'outline-2 -outline-offset-2 outline-amber-500' : ''} ${col.numeric ? 'text-right tabular-nums' : ''}`}
                      >
                        {isEditing && col.edit ? (
                          <CellEditor
                            col={col}
                            product={p}
                            ctx={ctx}
                            initial={editing.initial}
                            onCommit={(text, next) => {
                              commitEdit(r, c, text)
                              if (next) move(next === 'down' ? 1 : 0, next === 'right' ? 1 : 0, false)
                            }}
                            onCancel={() => {
                              setEditing(null)
                              containerRef.current?.focus()
                            }}
                          />
                        ) : (
                          <CellContent col={col} product={p} ctx={ctx} coverUrl={coverUrls[p.id]} applies={applies} />
                        )}
                        {showHandle && (
                          <span
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              dragRef.current = 'fill'
                              setFillTo(r)
                            }}
                            title="Arraste para preencher"
                            className="absolute -right-1 -bottom-1 z-10 h-2.5 w-2.5 cursor-crosshair rounded-sm border border-stone-950 bg-amber-500"
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {findOpen && (
        <FindReplaceDialog
          hasSelection={!!ranges && ranges.length > 0}
          onPreview={(opts) => collectReplace(opts).length}
          onApply={(opts) => {
            const changes = buildChanges(collectReplace(opts))
            void writeChanges(changes)
            return changes.length
          }}
          onClose={() => {
            onFindOpenChange(false)
            containerRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded bg-stone-800 px-1 text-stone-300">{children}</kbd>
}

function CheckBoxMark({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`inline-flex h-5 w-5 items-center justify-center rounded border text-xs ${
        checked ? 'border-amber-500 bg-amber-600 text-white' : 'border-stone-600 text-transparent hover:border-stone-400'
      }`}
    >
      <CheckIcon />
    </button>
  )
}

function CellContent({
  col,
  product: p,
  ctx,
  coverUrl,
  applies,
}: {
  col: ColumnDef
  product: StoreProduct
  ctx: ColumnContext
  coverUrl?: string
  applies: boolean
}) {
  if (col.key === 'foto') {
    return (
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-stone-900">
        {coverUrl ? (
          <img src={coverUrl} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <PhotoIcon className="h-4 w-4 text-stone-700" />
        )}
      </div>
    )
  }
  if (!applies) return <span className="text-stone-700">—</span>
  if (col.key === 'estoque') {
    const out = p.stock_quantity <= 0
    const low = !out && p.min_stock != null && p.stock_quantity <= p.min_stock
    return (
      <span className={`inline-flex items-center justify-end gap-1 ${out ? 'text-red-400' : low ? 'text-amber-500' : 'text-stone-300'}`}>
        {low && <WarningIcon className="h-3.5 w-3.5" />}
        {p.stock_quantity}
      </span>
    )
  }
  const text = col.text(p, ctx)
  if (col.key === 'nome') {
    return (
      <span className="block truncate text-stone-100" title={p.name}>
        {p.lot_suffix && <span className="mr-1.5 font-mono text-xs text-amber-500">#{p.lot_suffix}</span>}
        {p.name}
        {p.is_lot && <span className="ml-1.5 text-xs text-stone-500">(lote)</span>}
      </span>
    )
  }
  return (
    <span className="block truncate text-stone-300" title={text}>
      {text}
    </span>
  )
}

/** Editor dentro da célula. Enter grava e desce; Tab grava e vai para a direita; Esc cancela. */
function CellEditor({
  col,
  product,
  ctx,
  initial,
  onCommit,
  onCancel,
}: {
  col: ColumnDef
  product: StoreProduct
  ctx: ColumnContext
  initial?: string
  onCommit: (text: string, next?: 'down' | 'right') => void
  onCancel: () => void
}) {
  const meta = col.edit!
  const [value, setValue] = useState(() => {
    if (initial !== undefined) return initial
    const raw = rawValue(col, product, ctx)
    return meta.type === 'select' ? raw : raw
  })
  const doneRef = useRef(false)
  const finish = (text: string, next?: 'down' | 'right') => {
    if (doneRef.current) return
    doneRef.current = true
    onCommit(text, next)
  }
  const cancel = () => {
    if (doneRef.current) return
    doneRef.current = true
    onCancel()
  }

  if (meta.type === 'select') {
    return <SelectCellEditor options={meta.options(ctx)} initialQuery={initial} current={value} onPick={(label, next) => finish(label, next)} onCancel={cancel} />
  }

  const common = {
    autoFocus: true,
    value,
    onBlur: () => finish(value),
    onKeyDown: (e: React.KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Escape') return void (e.preventDefault(), cancel())
      if (e.key === 'Tab') return void (e.preventDefault(), finish(value, 'right'))
      if (e.key === 'Enter' && !(meta.type === 'text' && meta.multiline && e.shiftKey)) {
        e.preventDefault()
        finish(value, 'down')
      }
    },
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    className: 'w-full rounded border border-amber-500 bg-stone-900 px-1.5 py-0.5 text-sm text-stone-100 outline-none',
  }
  if (meta.type === 'date') {
    return <input type="date" {...common} onChange={(e) => setValue(e.target.value)} />
  }
  return (
    <input
      type="text"
      inputMode={meta.type === 'number' ? 'decimal' : undefined}
      {...common}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => {
        if (initial === undefined) e.currentTarget.select()
        else e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)
      }}
    />
  )
}

/** Lista de opções da célula (em portal, para não ser cortada pela rolagem da tabela). */
function SelectCellEditor({
  options,
  initialQuery,
  current,
  onPick,
  onCancel,
}: {
  options: SelectOption[]
  initialQuery?: string
  current: string
  onPick: (label: string, next?: 'down' | 'right') => void
  onCancel: () => void
}) {
  const anchorRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(initialQuery ?? '')
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [hi, setHi] = useState(0)
  const strip = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
  const filtered = useMemo(() => {
    const q = strip(query.trim())
    const list = [{ value: '', label: '' }, ...options]
    return q ? list.filter((o) => o.label && strip(o.label).includes(q)) : list
  }, [options, query])

  useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom > 240
    setPos({ top: below ? rect.bottom + 2 : Math.max(8, rect.top - 242), left: rect.left, width: Math.max(rect.width, 200) })
    const i = filtered.findIndex((o) => o.label === current)
    if (i >= 0 && !initialQuery) setHi(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <input
        ref={anchorRef}
        autoFocus
        value={query}
        placeholder={current || 'Buscar'}
        onChange={(e) => {
          setQuery(e.target.value)
          setHi(0)
        }}
        onBlur={onCancel}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') return void (e.preventDefault(), onCancel())
          if (e.key === 'ArrowDown') return void (e.preventDefault(), setHi((h) => Math.min(filtered.length - 1, h + 1)))
          if (e.key === 'ArrowUp') return void (e.preventDefault(), setHi((h) => Math.max(0, h - 1)))
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault()
            const o = filtered[hi]
            if (o) onPick(o.label, e.key === 'Tab' ? 'right' : 'down')
            else onCancel()
          }
        }}
        className="w-full rounded border border-amber-500 bg-stone-900 px-1.5 py-0.5 text-sm text-stone-100 outline-none"
      />
      {pos &&
        createPortal(
          <div
            role="listbox"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[70] max-h-60 overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-xl"
          >
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-stone-500">Nenhuma opção encontrada.</p>}
            {filtered.map((o, i) => (
              <button
                key={o.value || '__empty'}
                type="button"
                role="option"
                aria-selected={o.label === current}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onPick(o.label)
                }}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center rounded-md px-3 py-1.5 text-left text-sm ${
                  i === hi ? 'bg-stone-800 text-stone-100' : 'text-stone-300'
                } ${o.label === current ? 'text-amber-300' : ''}`}
              >
                {o.label || <span className="text-stone-500">Vazio</span>}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}

/** Alça na borda direita do cabeçalho — mesma mecânica do catálogo pessoal (só grava ao soltar). */
function ResizeHandle({ onResize, onCommit, onReset }: { onResize: (w: number) => void; onCommit: (w: number) => void; onReset: () => void }) {
  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startWidth = (e.currentTarget.closest('th') as HTMLElement | null)?.getBoundingClientRect().width ?? 0
    if (!startWidth) return
    let latest = startWidth
    const onMove = (ev: PointerEvent) => {
      latest = Math.round(Math.min(COL_MAX_WIDTH, Math.max(COL_MIN_WIDTH, startWidth + (ev.clientX - startX))))
      onResize(latest)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (latest !== startWidth) onCommit(latest)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  return (
    <span
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onReset()
      }}
      draggable={false}
      title="Arraste para ajustar a largura. Clique duas vezes para restaurar."
      className="absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize touch-none hover:bg-amber-500/40"
    />
  )
}

/** TSV (planilhas) → matriz, respeitando aspas com tabulação/quebra de linha dentro. */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === '\t') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

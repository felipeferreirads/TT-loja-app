import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDownIcon, CloseIcon, SelectIcon } from './icons'
import { useIsMobile } from '../lib/useIsMobile'

// Copiado do catálogo pessoal (`src/features/specimens/BulkSelectionBar.tsx`),
// enxugado: sem diálogos próprios (categoria/exibição/catálogo/coleção — quem
// usa a barra passa TODAS as ações) e sem i18n (loja é só PT).

/**
 * Ação em massa: a MESMA ação vira botão na barra do desktop, ícone na linha
 * compacta do celular e linha do painel deslizante. A ORDEM do array é a ordem
 * de prioridade (mais usada primeiro, destrutiva por último).
 */
export interface BulkAction {
  key: string
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  /** Ação destrutiva (vermelho). */
  danger?: boolean
  /** Desktop: botão só com ícone (o rótulo vira `title`). */
  iconOnly?: boolean
}

interface Props {
  count: number
  actions: BulkAction[]
  /** Limpa a marcação mas continua no modo seleção. */
  onClear: () => void
  /** Sai do modo seleção (o "X" — único cancelar da tela). */
  onCancel: () => void
  /** "Selecionar todos"; `null`/ausente esconde (ex.: quando tudo já está marcado). */
  selectAll?: { label: string; onClick: () => void } | null
  /** `key`s das ações que ficam como ícone na linha compacta do celular. */
  mobilePinned?: string[]
}

/**
 * Barra de ações da seleção. No celular vira UMA linha (X, contagem, atalhos e
 * a seta ⌃); o resto fica num painel inferior que abre deslizando a barra pra
 * cima ou tocando na seta.
 */
export function BulkSelectionBar({ count, actions, onClear, onCancel, selectAll, mobilePinned = [] }: Props) {
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)
  const empty = count === 0
  const countLabel = `${count} ${count === 1 ? 'item selecionado' : 'itens selecionados'}`
  const withGuard: BulkAction[] = actions.map((a) => ({ ...a, disabled: a.disabled || empty }))

  if (isMobile) {
    const pinned = mobilePinned.map((k) => withGuard.find((a) => a.key === k)).filter((a): a is BulkAction => !!a)
    return (
      <>
        <CompactBar
          count={count}
          countWord={count === 1 ? 'selecionado' : 'selecionados'}
          pinned={pinned}
          onCancel={onCancel}
          onExpand={() => setSheetOpen(true)}
        />
        {sheetOpen && (
          <ActionSheet
            title={countLabel}
            onClose={() => setSheetOpen(false)}
            items={[
              ...(selectAll ? [{ key: 'selectAll', label: selectAll.label, icon: <SelectIcon />, onClick: selectAll.onClick }] : []),
              ...withGuard,
              { key: 'clear', label: 'Limpar seleção', icon: <CloseIcon />, onClick: onClear, disabled: empty },
            ]}
          />
        )}
      </>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-600/40 bg-stone-950/95 px-3 py-2 text-sm shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={onCancel}
        className="-my-1 -ml-1 shrink-0 rounded-full p-1.5 text-amber-300/80 transition hover:bg-amber-600/20 hover:text-amber-200"
        title="Cancelar seleção"
        aria-label="Cancelar seleção"
      >
        <CloseIcon />
      </button>
      <span className="font-medium text-amber-300">{countLabel}</span>
      {selectAll && (
        <button type="button" onClick={selectAll.onClick} className="btn-secondary inline-flex items-center gap-1.5 py-1">
          <SelectIcon /> {selectAll.label}
        </button>
      )}
      {withGuard.map((a) => (
        <button
          key={a.key}
          type="button"
          onClick={a.onClick}
          disabled={a.disabled}
          className={`${a.danger ? 'btn-danger' : 'btn-secondary'} inline-flex items-center gap-1.5 py-1 disabled:opacity-40`}
          title={a.iconOnly ? a.label : undefined}
          aria-label={a.iconOnly ? a.label : undefined}
        >
          {a.icon}
          {!a.iconOnly && a.label}
        </button>
      ))}
      <button type="button" onClick={onClear} disabled={empty} className="text-stone-400 hover:underline disabled:opacity-40">
        Limpar seleção
      </button>
    </div>
  )
}

/** Linha única do celular: [X] contagem … [ações fixadas] [⌃]. Deslizar pra cima abre o painel. */
function CompactBar({
  count,
  countWord,
  pinned,
  onCancel,
  onExpand,
}: {
  count: number
  countWord: string
  pinned: BulkAction[]
  onCancel: () => void
  onExpand: () => void
}) {
  const startY = useRef<number | null>(null)
  const iconBtn = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40'
  return (
    <div
      className="flex flex-col rounded-lg border border-amber-600/40 bg-stone-950/95 px-1.5 pt-1 pb-1 text-sm shadow-xl backdrop-blur"
      onTouchStart={(e) => {
        startY.current = e.touches[0].clientY
      }}
      onTouchEnd={(e) => {
        if (startY.current != null && startY.current - e.changedTouches[0].clientY > 30) onExpand()
        startY.current = null
      }}
    >
      {/* Alça: dica visual de que dá pra puxar pra cima. */}
      <button type="button" onClick={onExpand} className="mx-auto -mb-0.5 flex h-3 w-14 items-center justify-center" aria-label="Mais ações" tabIndex={-1}>
        <span className="h-1 w-8 rounded-full bg-stone-500/70" />
      </button>
      <div className="flex min-w-0 items-center gap-1">
        <button type="button" onClick={onCancel} className={`${iconBtn} text-amber-300/80 hover:bg-amber-600/20`} title="Cancelar seleção" aria-label="Cancelar seleção">
          <CloseIcon />
        </button>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-base font-semibold text-amber-300 tabular-nums">{count}</span>
          <span className="truncate text-[11px] text-amber-300/70">{countWord}</span>
        </span>
        {pinned.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={a.onClick}
            disabled={a.disabled}
            className={`${iconBtn} ${a.danger ? 'bg-red-900/60 text-red-200' : 'bg-stone-800 text-stone-200'}`}
            title={a.label}
            aria-label={a.label}
          >
            {a.icon}
          </button>
        ))}
        <button type="button" onClick={onExpand} className={`${iconBtn} text-stone-300 hover:bg-stone-800`} title="Mais ações" aria-label="Mais ações" aria-haspopup="dialog">
          <ChevronDownIcon className="rotate-180" />
        </button>
      </div>
    </div>
  )
}

/**
 * Painel inferior (bottom sheet) com TODAS as ações em lista. Fecha tocando
 * fora, arrastando a alça pra baixo, com Esc ou ao escolher uma ação.
 */
function ActionSheet({ title, items, onClose }: { title: string; items: BulkAction[]; onClose: () => void }) {
  const [shown, setShown] = useState(false)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const dragHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      startY.current = e.touches[0].clientY
      setDragging(true)
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (startY.current != null) setDrag(Math.max(0, e.touches[0].clientY - startY.current))
    },
    onTouchEnd: () => {
      startY.current = null
      setDragging(false)
      if (drag > 80) onClose()
      else setDrag(0)
    },
  }

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div
        className={`safe-bottom absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-stone-800 bg-stone-900 shadow-2xl ${
          dragging ? '' : 'transition-transform duration-200 ease-out'
        }`}
        style={{ transform: shown ? `translateY(${drag}px)` : 'translateY(100%)' }}
      >
        <div className="shrink-0 touch-none" {...dragHandlers}>
          <div className="flex justify-center pt-2.5 pb-2">
            <span className="h-1.5 w-10 rounded-full bg-stone-600" />
          </div>
          <p className="border-b border-stone-800 px-5 pb-3 text-base font-semibold text-amber-300">{title}</p>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {items.map((a) => (
            <li key={a.key}>
              <button
                type="button"
                disabled={a.disabled}
                onClick={() => {
                  onClose()
                  a.onClick()
                }}
                className={`flex w-full items-center gap-4 px-5 py-3.5 text-left text-base transition hover:bg-stone-800 active:bg-stone-800 disabled:opacity-40 ${
                  a.danger ? 'text-red-300' : 'text-stone-100'
                }`}
              >
                <span className={`shrink-0 text-xl ${a.danger ? 'text-red-400' : 'text-stone-400'}`}>{a.icon}</span>
                <span className="min-w-0 flex-1 truncate">{a.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}

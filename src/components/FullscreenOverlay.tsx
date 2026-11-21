import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './icons'

/**
 * Tela cheia genérica (mapa-múndi mobile, tabela periódica): cabeçalho com
 * título + fechar, corpo ocupando o resto da tela. Portal no `body` pra não
 * depender de nenhum ancestral (transform/overflow) que quebre o `fixed`.
 * Fecha no X ou com Esc; trava a rolagem da página enquanto aberta.
 * Arquivo COMPARTILHADO com a loja (scripts/shared-ui.mjs).
 */
export function FullscreenOverlay({
  title,
  onClose,
  children,
  bodyClassName = 'flex-1 min-h-0',
  closeLabel,
}: {
  title: string
  /** Rótulo do botão de fechar (arquivo compartilhado com a loja: sem idioma próprio). */
  closeLabel: string
  onClose: () => void
  children: ReactNode
  bodyClassName?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex shrink-0 items-center justify-between border-b border-stone-800 px-3 py-2">
        <h2 className="text-sm font-semibold text-stone-200">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          title={closeLabel}
          aria-label={closeLabel}
          className="tap-icon bg-stone-800 text-stone-300 transition hover:bg-stone-700 hover:text-stone-100"
        >
          <CloseIcon />
        </button>
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>,
    document.body,
  )
}

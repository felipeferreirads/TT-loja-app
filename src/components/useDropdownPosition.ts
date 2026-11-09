import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

const EDGE_MARGIN = 8 // respiro mínimo até a borda da tela

export interface DropdownPosition {
  top: number
  left: number
}

export interface DropdownPositionResult {
  pos: DropdownPosition | null
  /** Anexar ao elemento do menu — é o que permite medir a altura real dele. */
  menuRef: RefObject<HTMLDivElement | null>
}

/**
 * Posição `fixed` (relativa à viewport) para um menu suspenso ancorado a um
 * botão-gatilho, sempre grudada dentro da tela.
 *
 * Existe porque `<main>` (Layout.tsx) tem `overflow-auto`: um menu em
 * `position: absolute` com largura fixa (ex. `w-64`) ancorado a um botão que
 * não está colado à borda direita/esquerda do próprio container flex (comum
 * no mobile, onde os controles quebram linha) extrapola a viewport e é
 * CORTADO pelo overflow do `<main>` em vez de flutuar por cima — sem erro
 * visível, só o menu incompleto. `fixed` escapa desse clipping; o clamp de
 * `left` garante que ele também não vaze pra fora da tela do outro lado.
 *
 * O eixo vertical tem o mesmo problema quando o botão-gatilho está perto do
 * FIM da página (comum quando a seção acima dele é curta — ex. lote sem
 * nenhuma peça ainda): abrir sempre "pra baixo" (`top: rect.bottom + gap`)
 * sem checar se cabe deixa o menu vazando pela borda inferior da tela. Como
 * o hook não sabe de antemão a altura do menu (varia por chamador), a
 * primeira medição usa altura 0 (menu ainda não montado) e só posiciona
 * "pra baixo"; assim que `menuRef` aponta pro elemento já renderizado, uma
 * segunda passada (ainda dentro do mesmo `useLayoutEffect`, antes do
 * navegador pintar) remede com a altura real e vira pra cima se não couber
 * embaixo mas couber (ou couber melhor) em cima.
 */
export function useDropdownPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  { width, align = 'right', gap = 4 }: { width: number; align?: 'left' | 'right'; gap?: number },
): DropdownPositionResult {
  const [pos, setPos] = useState<DropdownPosition | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const compute = () => {
    const el = anchorRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const rawLeft = align === 'right' ? rect.right - width : rect.left
    const maxLeft = window.innerWidth - width - EDGE_MARGIN
    const left = Math.min(Math.max(rawLeft, EDGE_MARGIN), Math.max(maxLeft, EDGE_MARGIN))

    const menuHeight = menuRef.current?.offsetHeight ?? 0
    const spaceBelow = window.innerHeight - rect.bottom - gap - EDGE_MARGIN
    const spaceAbove = rect.top - gap - EDGE_MARGIN
    // Só vira pra cima quando embaixo não cabe E em cima é de fato melhor —
    // evita ficar trocando de lado quando nenhum dos dois sobra espaço.
    const openAbove = menuHeight > spaceBelow && spaceAbove > spaceBelow
    const top = openAbove
      ? Math.max(EDGE_MARGIN, rect.top - gap - menuHeight)
      : Math.min(rect.bottom + gap, Math.max(window.innerHeight - EDGE_MARGIN - menuHeight, EDGE_MARGIN))
    return { top, left }
  }

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const update = () => setPos(compute())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorRef, align, width, gap])

  // Segunda passada: a primeira roda antes do menu existir no DOM (altura 0,
  // sempre "cabe embaixo"); assim que ele monta e `menuRef` tem altura real,
  // remede — ainda em layout effect, então não pisca.
  useLayoutEffect(() => {
    if (!open || !pos || !menuRef.current) return
    const next = compute()
    if (next && (Math.abs(next.top - pos.top) > 0.5 || Math.abs(next.left - pos.left) > 0.5)) setPos(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos])

  return { pos, menuRef }
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const EDGE_MARGIN = 8 // respiro mínimo até a borda da tela

export interface PortalDropdownRect {
  top: number
  left: number
  width: number
}

export interface PortalDropdownResult {
  /** Anexar ao container do botão-gatilho (precisa de `position: relative`). */
  boxRef: React.RefObject<HTMLDivElement | null>
  /** Anexar ao painel renderizado no portal. */
  menuRef: React.RefObject<HTMLDivElement | null>
  /** `null` enquanto fechado/não medido ainda — só renderiza o portal com isto preenchido. */
  menuRect: PortalDropdownRect | null
}

/**
 * Mecânica compartilhada de um dropdown ancorado a um botão-gatilho, aberto
 * num PORTAL pra `document.body` (posição `fixed` calculada a partir do
 * próprio gatilho). Existe porque um painel `absolute` comum, dentro de uma
 * célula da tabela em lista/planilha (que rola dentro de um container
 * virtualizado), ficava CORTADO ou era desenhado ATRÁS das linhas seguintes —
 * mesmo bug em três lugares (MultiTagSelect, SwatchSelect, ShapeSelect) antes
 * de virar este hook único.
 *
 * Abre sempre "pra baixo" por padrão, mas VIRA PRA CIMA quando o gatilho está
 * perto do fim da tela (linhas no fim da lista/planilha) e embaixo não cabe —
 * mesmo raciocínio de `useDropdownPosition.ts` (não duplicado daqui porque
 * este hook precisa da LARGURA do próprio gatilho, não uma largura fixa
 * passada por quem chama). Como a altura real do painel só existe depois de
 * montado, a 1ª medição usa altura 0 (sempre "cabe embaixo") e uma 2ª
 * passada, já com `menuRef` apontando pro elemento renderizado, remede e vira
 * se necessário — ainda dentro do mesmo ciclo de layout effect, então não pisca.
 *
 * `close` é chamado sempre que um clique de verdade acontece FORA do gatilho
 * e do painel — quem chama decide o que isso significa (fechar o dropdown,
 * e/ou persistir e sair da célula, como a edição inline da lista faz). Uma
 * ref interna guarda sempre a versão mais recente de `close`, então o
 * chamador pode passar uma arrow function nova a cada render (comum quando
 * ela fecha sobre estado local) sem precisar reinscrever o listener.
 */
export function usePortalDropdown(open: boolean, close: () => void, gap = 4): PortalDropdownResult {
  const boxRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuRect, setMenuRect] = useState<PortalDropdownRect | null>(null)

  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (boxRef.current?.contains(target) || menuRef.current?.contains(target)) return
      closeRef.current()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const compute = (): PortalDropdownRect | null => {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return null
    const menuHeight = menuRef.current?.offsetHeight ?? 0
    const spaceBelow = window.innerHeight - rect.bottom - gap - EDGE_MARGIN
    const spaceAbove = rect.top - gap - EDGE_MARGIN
    // Só vira pra cima quando embaixo não cabe E em cima é de fato melhor —
    // evita ficar trocando de lado quando nenhum dos dois sobra espaço.
    const openAbove = menuHeight > spaceBelow && spaceAbove > spaceBelow
    const top = openAbove
      ? Math.max(EDGE_MARGIN, rect.top - gap - menuHeight)
      : Math.min(rect.bottom + gap, Math.max(window.innerHeight - EDGE_MARGIN - menuHeight, EDGE_MARGIN))
    return { top, left: rect.left, width: rect.width }
  }

  // Reposiciona (coordenadas de viewport) ao abrir e durante o scroll — `true`
  // (fase de captura) pra pegar o scroll do container interno da tabela, que
  // não borbulha (`scroll` não tem bubbling).
  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null)
      return
    }
    const update = () => setMenuRect(compute())
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gap])

  // 2ª passada: a 1ª roda antes do painel existir no DOM (altura 0, sempre
  // "cabe embaixo"); assim que ele monta e `menuRef` tem altura real, remede
  // — ainda em layout effect, então não pisca.
  useLayoutEffect(() => {
    if (!open || !menuRect || !menuRef.current) return
    const next = compute()
    if (next && (Math.abs(next.top - menuRect.top) > 0.5 || Math.abs(next.left - menuRect.left) > 0.5)) setMenuRect(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, menuRect])

  return { boxRef, menuRef, menuRect }
}

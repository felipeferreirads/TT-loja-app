import { useRef } from 'react'

/**
 * Toque longo (500ms) sem mover o dedo/mouse. `consumeClick()` devolve true UMA
 * vez depois de um toque longo disparado — o "click" que o navegador gera ao
 * soltar não pode abrir o item por baixo da ação do toque longo.
 */
export function useLongPress(onLongPress: (() => void) | null, delay = 500) {
  const timer = useRef<number | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const cancel = () => {
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = null
    origin.current = null
  }

  const handlers = onLongPress
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          fired.current = false
          origin.current = { x: e.clientX, y: e.clientY }
          timer.current = window.setTimeout(() => {
            fired.current = true
            timer.current = null
            onLongPress()
          }, delay)
        },
        onPointerMove: (e: React.PointerEvent) => {
          const o = origin.current
          if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > 8) cancel()
        },
        onPointerUp: cancel,
        onPointerCancel: cancel,
        onPointerLeave: cancel,
        onContextMenu: (e: React.MouseEvent) => {
          if (fired.current) e.preventDefault()
        },
      }
    : {}

  return {
    handlers,
    consumeClick: () => {
      const was = fired.current
      fired.current = false
      return was
    },
  }
}

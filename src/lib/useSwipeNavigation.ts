import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * Anterior/próximo por gesto e por teclado numa ficha (compartilhado entre o
 * catálogo e a loja). Não conhece rota nem domínio: quem chama diz quem são os
 * vizinhos e o que fazer para ir até um deles (`goTo`).
 *
 * - deslizar na horizontal (toque), com a ficha acompanhando o dedo e a prévia
 *   do vizinho (`[data-browse-peek]`, desenhada por quem chama) encostada ao
 *   lado, fora da tela, que assume o lugar ao soltar;
 * - teclado ← → (desktop), fora de campos de texto e de diálogos abertos;
 * - `go(dir)` para botões (setas ‹ ›).
 *
 * Pointer Events filtrados por `pointerType === 'touch'`. Com
 * `touch-action: pan-y` na ficha, o navegador cuida da rolagem vertical (e dispara
 * `pointercancel` quando assume) e entrega o movimento lateral pra cá. Listeners
 * NATIVOS de propósito: eventos sintéticos do React borbulham por portais (o
 * visualizador de fotos em tela cheia é um portal), e lá o deslizar troca a
 * foto, não o item.
 */

export interface SwipeNeighbors {
  prev: string | null
  next: string | null
}

interface Options {
  /** Id do item aberto; ao mudar, a ficha volta ao topo e anima a entrada. */
  id: string | undefined
  /** Elemento que acompanha o dedo (a ficha inteira, com `position: relative`). */
  swipeRef: RefObject<HTMLElement | null>
  /** A ficha já renderizou o conteúdo (o elemento de `swipeRef` existe). */
  ready: boolean
  /** Vizinhos atuais; `null` desliga o gesto e as setas. */
  neighbors: SwipeNeighbors | null
  /** Abre o vizinho (a rota é de quem chama; use `replace` para não empilhar histórico). */
  goTo: (targetId: string, dir: 1 | -1) => void
  /** Impede o gesto, por exemplo com alterações não salvas num formulário. */
  disabled?: boolean
  /** Foto grande da ficha, medida no início do gesto para a prévia copiar a distância cabeçalho→foto. */
  heroSelector?: string
  /** Contêiner que rola a página. */
  scrollerId?: string
}

/**
 * Direção da última troca, lida pela ficha NOVA ao montar. Fica no módulo (não
 * num ref) porque quem chama pode remontar a página a cada item (`key={id}`).
 */
let pendingEnter: { dir: 1 | -1; swiped: boolean } | null = null

export function useSwipeNavigation({
  id,
  swipeRef,
  ready,
  neighbors,
  goTo,
  disabled = false,
  heroSelector = 'button.aspect-square',
  scrollerId = 'app-scroll-container',
}: Options) {
  // O listener nativo é registrado uma vez; lê sempre o valor atual daqui.
  const neighborsRef = useRef(neighbors)
  neighborsRef.current = neighbors
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled
  const goToRef = useRef(goTo)
  goToRef.current = goTo

  const navigateTo = useCallback((dir: 1 | -1, swiped: boolean) => {
    const n = neighborsRef.current
    const target = n ? (dir === 1 ? n.next : n.prev) : null
    if (!target || disabledRef.current) return false
    pendingEnter = { dir, swiped }
    goToRef.current(target, dir)
    return true
  }, [])
  const go = useCallback((dir: 1 | -1) => navigateTo(dir, false), [navigateTo])

  // Item novo: volta ao topo e anima a entrada (só quando veio de uma troca).
  // Layout effect: roda antes da pintura. Depois de um deslizar, a ficha ainda
  // está deslocada uma tela pro lado e não pode aparecer assim nem por um quadro.
  useLayoutEffect(() => {
    const enter = pendingEnter
    if (!enter) return
    pendingEnter = null
    document.getElementById(scrollerId)?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
    const el = swipeRef.current
    if (!el) return
    el.style.transition = 'none'
    if (enter.swiped) {
      // A prévia do vizinho já ocupava este lugar: a ficha nova entra parada.
      el.style.transform = ''
      return
    }
    el.style.transform = `translateX(${enter.dir * 48}px)`
    el.style.opacity = '0'
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out'
        el.style.transform = ''
        el.style.opacity = ''
      }),
    )
  }, [id, swipeRef, scrollerId])

  // Teclado ← →.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || t.closest('input, textarea, select, [contenteditable="true"]'))) return
      // Diálogo/visualizador de fotos aberto: as setas são dele.
      if (document.querySelector('[role="dialog"], [aria-modal="true"], .yarl__root')) return
      if (go(e.key === 'ArrowRight' ? 1 : -1)) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  // Deslizar (toque).
  useEffect(() => {
    const el = swipeRef.current
    if (!el) return
    const EDGE = 24 // borda da tela = gesto de "voltar" do sistema
    let startX = 0
    let startY = 0
    let startT = 0
    let axis: 'none' | 'x' | 'y' | 'off' = 'off'
    let dx = 0

    const blocked = (target: EventTarget | null): boolean => {
      let node = target as HTMLElement | null
      while (node && node !== el) {
        if (node.matches('input, textarea, select, [contenteditable="true"], [data-no-swipe]')) return true
        const cs = getComputedStyle(node)
        // Diálogo `fixed` renderizado dentro da ficha, ou algo que rola na horizontal.
        if (cs.position === 'fixed') return true
        if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && node.scrollWidth > node.clientWidth) return true
        node = node.parentElement
      }
      return false
    }

    const reset = (animate: boolean) => {
      el.style.transition = animate ? 'transform 180ms ease-out' : ''
      el.style.transform = ''
    }

    let pointerId = -1

    const onStart = (e: PointerEvent) => {
      axis = 'off'
      if (e.pointerType !== 'touch' || !e.isPrimary || !neighborsRef.current || disabledRef.current) return
      if (e.clientX < EDGE || e.clientX > window.innerWidth - EDGE) return
      if (blocked(e.target)) return
      pointerId = e.pointerId
      startX = e.clientX
      startY = e.clientY
      startT = performance.now()
      dx = 0
      axis = 'none'
    }

    const onMove = (e: PointerEvent) => {
      if (axis === 'off' || axis === 'y' || e.pointerId !== pointerId) return
      const mx = e.clientX - startX
      const my = e.clientY - startY
      if (axis === 'none') {
        if (Math.abs(mx) < 10 && Math.abs(my) < 10) return
        // Só trava na horizontal com gesto claramente lateral: rolagem
        // vertical meio torta continua sendo rolagem.
        axis = Math.abs(mx) > Math.abs(my) * 1.5 ? 'x' : 'y'
        if (axis === 'y') return
        // Captura o ponteiro na ficha: se o elemento sob o dedo for trocado no
        // meio do gesto (a foto terminando de carregar substitui o esqueleto), o
        // resto do gesto continua chegando aqui. Só depois de reconhecer o
        // gesto lateral, pra não desviar o clique de um toque simples num botão.
        try {
          el.setPointerCapture(e.pointerId)
        } catch {
          // ponteiro já liberado: segue sem captura
        }
        // Prévias dos vizinhos na altura da rolagem atual: o topo da ficha
        // vizinha aparece onde o topo DESTA estaria com a rolagem no zero, que
        // é onde a ficha nova vai ficar depois da troca.
        const scroller = document.getElementById(scrollerId)
        const top = (scroller?.scrollTop ?? 0) + window.scrollY
        // Distância cabeçalho→foto grande desta ficha (muda no modo de edição,
        // que põe uma barra de botões sobre a galeria): a prévia copia.
        const header = [...el.children].find((c) => !(c as HTMLElement).dataset.browsePeek)
        const heroEl = [...el.querySelectorAll<HTMLElement>(heroSelector)].find(
          (b) => !b.closest('[data-browse-peek]') && b.offsetParent !== null,
        )
        const gap = header && heroEl ? heroEl.getBoundingClientRect().top - header.getBoundingClientRect().bottom : null
        el.querySelectorAll<HTMLElement>('[data-browse-peek]').forEach((p) => {
          p.style.top = `${top}px`
          // Não passa do fim da ficha atual (a prévia pode ser mais alta).
          p.style.maxHeight = `calc(100% - ${top}px)`
          if (gap != null && gap >= 0) p.style.setProperty('--peek-hero-gap', `${gap}px`)
        })
      }
      const n = neighborsRef.current
      const hasTarget = mx < 0 ? !!n?.next : !!n?.prev
      // Sem vizinho naquele lado: resistência (anda pouco e volta).
      dx = hasTarget ? mx : mx * 0.25
      el.style.transition = 'none'
      el.style.transform = `translateX(${dx}px)`
    }

    const onEnd = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      if (axis !== 'x') {
        axis = 'off'
        return
      }
      axis = 'off'
      const width = window.innerWidth
      const velocity = Math.abs(dx) / Math.max(1, performance.now() - startT)
      const dir: 1 | -1 = dx < 0 ? 1 : -1
      const n = neighborsRef.current
      const hasTarget = dir === 1 ? !!n?.next : !!n?.prev
      const committed =
        hasTarget && !disabledRef.current && (Math.abs(dx) > width * 0.3 || (Math.abs(dx) > 60 && velocity > 0.4))
      if (!committed) {
        reset(true)
        return
      }
      // Termina o deslize: a ficha sai pelo lado do gesto e a prévia do vizinho
      // (encostada uma tela adiante) assume o lugar dela; só então troca de
      // rota. Tempo proporcional ao que falta andar, com desaceleração.
      const remaining = width - Math.abs(dx)
      const duration = Math.round(Math.min(320, Math.max(140, remaining / Math.max(velocity, 1.2))))
      el.style.transition = `transform ${duration}ms cubic-bezier(0.22, 0.61, 0.36, 1)`
      el.style.transform = `translateX(${-dir * width}px)`
      let done = false
      const finish = (ev?: Event) => {
        // `transitionend` borbulha dos filhos (botões, fotos): só vale o da ficha.
        if (done || (ev && ev.target !== el)) return
        done = true
        el.removeEventListener('transitionend', finish)
        if (!navigateTo(dir, true)) reset(true)
      }
      el.addEventListener('transitionend', finish)
      window.setTimeout(finish, duration + 60)
    }

    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      axis = 'off'
      reset(true)
    }

    el.addEventListener('pointerdown', onStart)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onEnd)
    el.addEventListener('pointercancel', onCancel)
    return () => {
      el.removeEventListener('pointerdown', onStart)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onEnd)
      el.removeEventListener('pointercancel', onCancel)
    }
    // `el` só existe depois que a ficha carrega: `ready` re-roda o efeito.
  }, [navigateTo, swipeRef, ready, heroSelector, scrollerId])

  return { go }
}

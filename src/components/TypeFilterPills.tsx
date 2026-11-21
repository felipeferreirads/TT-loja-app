import { useEffect, useRef, useState } from 'react'
import { ExpandablePillSelect } from './ExpandablePillSelect'

interface Option {
  value: string
  label: string
}

interface Props {
  value: string
  options: readonly Option[]
  onChange: (value: string) => void
}

/**
 * Filtro de tipo em chips que vira a pílula expansível (`ExpandablePillSelect`)
 * quando os chips não cabem — mesmo comportamento do `SpecimenToolbar` do
 * catálogo pessoal. No celular (abaixo de `sm`) a pílula vale sempre; de `sm`
 * para cima, a pílula só entra quando a largura NATURAL dos chips passa do
 * espaço livre ao lado dos outros controles. Nesse modo os chips ficam
 * invisíveis e fora do fluxo, só para continuar sendo medidos.
 *
 * Precisa ficar num contêiner que tenha a largura do espaço livre (ex.: o
 * slot `summary` do `ListToolbar`, que é `flex-1 min-w-0`).
 */
export function TypeFilterPills({ value, options, onChange }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const chipsRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    chipsRef.current?.scrollTo({ left: 0 })
    const measure = () => {
      const box = boxRef.current
      const chips = chipsRef.current
      const first = chips?.firstElementChild as HTMLElement | null
      const last = chips?.lastElementChild as HTMLElement | null
      if (!box || !first || !last) return
      const natural = last.offsetLeft + last.offsetWidth - first.offsetLeft
      // Escondido (celular, display:none) mede 0: a pílula já vale por sm:hidden.
      if (natural <= 0) return setCompact(false)
      setCompact(natural > box.clientWidth - 8)
    }
    measure()
    const ro = new ResizeObserver(measure)
    for (const el of [boxRef.current, chipsRef.current]) if (el) ro.observe(el)
    return () => ro.disconnect()
  }, [options])

  return (
    <div ref={boxRef} className="relative flex w-full items-center gap-2">
      <ExpandablePillSelect className={`shrink-0 ${compact ? '' : 'sm:hidden'}`} value={value} options={options} onChange={onChange} />
      <div
        ref={chipsRef}
        style={{ overflowAnchor: 'none' }}
        className={`no-scrollbar hidden gap-2 overflow-x-auto pb-1 sm:flex ${compact ? 'pointer-events-none invisible absolute' : ''}`}
        aria-hidden={compact || undefined}
      >
        {options.map((o) => (
          <button
            key={o.value || 'all'}
            type="button"
            tabIndex={compact ? -1 : undefined}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm whitespace-nowrap transition ${
              value === o.value ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

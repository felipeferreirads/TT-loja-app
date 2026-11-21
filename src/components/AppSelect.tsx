import { Children, Fragment, isValidElement, useMemo, type ReactElement, type ReactNode } from 'react'
import { OptionSelect, type SelectOption } from './OptionSelect'

/** Evento mínimo entregue ao `onChange` (compatível com `e.target.value` do `<select>`). */
export interface AppSelectChange {
  target: { value: string }
  currentTarget: { value: string }
}

interface Props {
  value: string | number
  onChange: (e: AppSelectChange) => void
  /** `<option>` e `<optgroup>`, como no `<select>` nativo. */
  children?: ReactNode
  /** Classes de layout (largura, margem, flex) vão para o contêiner; as de aparência são ignoradas — o visual é o do app. */
  className?: string
  disabled?: boolean
  title?: string
  'aria-label'?: string
  /** Abre a lista ao montar (edição inline). */
  autoFocus?: boolean
  /** Fechou sem escolher (clique fora ou Esc). */
  onClose?: () => void
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

type OptionProps = { value?: string | number; disabled?: boolean; label?: string; children?: ReactNode }

function collect(children: ReactNode, out: SelectOption[]) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const el = child as ReactElement<OptionProps>
    if (el.type === Fragment) {
      collect(el.props.children, out)
    } else if (el.type === 'optgroup') {
      out.push({ value: `__group-${out.length}`, label: el.props.label ?? '', heading: true })
      collect(el.props.children, out)
    } else if (el.type === 'option') {
      const label = textOf(el.props.children)
      out.push({
        value: el.props.value != null ? String(el.props.value) : label,
        label,
        disabled: el.props.disabled,
      })
    }
  })
}

const LAYOUT_TOKEN = /^(?:[a-z-]+:)*(?:w-|min-w-|max-w-|flex-|shrink|grow|col-span|row-span|self-|m[trblxy]?-|basis-)/
const COMPACT_TOKEN = /(?:^|:)(?:text-xs|h-7|h-8|py-0|py-1)$/

/**
 * Substituto do `<select>` nativo com a mesma assinatura (`value`, `onChange`
 * com `e.target.value`, filhos `<option>`/`<optgroup>`), renderizado pelo
 * `OptionSelect`: a lista abre com o visual do app, não do sistema.
 */
export function AppSelect({ value, onChange, children, className = '', disabled, title, autoFocus, onClose, ...rest }: Props) {
  const options = useMemo(() => {
    const out: SelectOption[] = []
    collect(children, out)
    return out
  }, [children])
  const tokens = className.split(/\s+/).filter(Boolean)
  const layout = tokens.filter((t) => LAYOUT_TOKEN.test(t)).join(' ')
  return (
    <OptionSelect
      value={String(value)}
      options={options}
      onChange={(v) => onChange({ target: { value: v }, currentTarget: { value: v } })}
      ariaLabel={rest['aria-label'] ?? title ?? ''}
      className={layout}
      compact={tokens.some((t) => COMPACT_TOKEN.test(t))}
      invalid={tokens.includes('border-red-600')}
      active={tokens.includes('text-amber-500')}
      disabled={disabled}
      title={title}
      defaultOpen={autoFocus}
      onClose={onClose}
    />
  )
}

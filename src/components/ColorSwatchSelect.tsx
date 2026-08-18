// Copiado de src/components/ColorSwatchSelect.tsx do catálogo pessoal — sem
// i18n, rótulos vêm crus de `COLOR_OPTIONS` (claude.md §2).

function Chip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean
  onClick: () => void
  color?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs ${
        active ? 'border-amber-500 bg-stone-800 text-stone-100' : 'border-stone-700 text-stone-300 hover:bg-stone-800'
      }`}
    >
      {color && (
        <span
          className="h-3 w-3 shrink-0 rounded-full border border-stone-700"
          style={color.includes('gradient') ? { background: color } : { backgroundColor: color }}
        />
      )}
      {children}
    </button>
  )
}

interface SingleProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  /** Opção → cor representativa (hex) do chip. */
  swatches: Record<string, string>
}

/**
 * Seletor de cor por chips coloridos (bolinha + nome), single-select — usado
 * pelo campo "Cor" do item. Substitui um `<select>` comum porque cor é um
 * dos poucos campos onde ver a cor de verdade ajuda a escolher mais do que
 * ler o nome.
 */
export function ColorSwatchSelect({ value, onChange, options, swatches }: SingleProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip active={value === ''} onClick={() => onChange('')}>
        Nenhuma
      </Chip>
      {options.map((o) => (
        <Chip key={o} active={value === o} onClick={() => onChange(o)} color={swatches[o]}>
          {o}
        </Chip>
      ))}
    </div>
  )
}

interface MultiProps {
  values: string[]
  onChange: (values: string[]) => void
  options: string[]
  swatches: Record<string, string>
}

/**
 * Mesma UI de chips, multi-select (toggle) — usado por "Cores secundárias" e
 * pelos campos condicionais de cor (UV, iridescência, jogo de cor). `options`
 * já vem sem a cor predominante quando aplicável (o chamador filtra antes).
 */
export function ColorSwatchMultiSelect({ values, onChange, options, swatches }: MultiProps) {
  const toggle = (o: string) => onChange(values.includes(o) ? values.filter((v) => v !== o) : [...values, o])
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Chip key={o} active={values.includes(o)} onClick={() => toggle(o)} color={swatches[o]}>
          {o}
        </Chip>
      ))}
    </div>
  )
}

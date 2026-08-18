import type { StorePricingPreset } from '../../types/db'
import { usePrompt } from '../../components/DialogProvider'

const CUSTOM = '__custom__'

interface Option {
  label: string
  value: number
  /** Preset criado pelo dono — só esses podem ser apagados. */
  presetId?: string
}

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  percent: boolean
  builtin: { label: string; value: number }[]
  custom: StorePricingPreset[]
  onCreatePreset: (label: string, value: number) => Promise<void>
  onDeletePreset: (id: string) => Promise<void>
}

function formatOption(value: number, percent: boolean): string {
  return percent ? `${(value * 100).toFixed(2).replace('.', ',')}%` : `R$ ${value.toFixed(2)}`
}

export function PresetSelect({ label, value, onChange, percent, builtin, custom, onCreatePreset, onDeletePreset }: Props) {
  const prompt = usePrompt()
  const options: Option[] = [
    ...builtin,
    ...custom.map((c) => ({ label: c.label, value: c.value, presetId: c.id })),
  ]
  const matched = options.find((o) => Math.abs(o.value - value) < 1e-9)
  const selectedKey = matched ? matched.label : CUSTOM

  const handleAdd = async () => {
    const newLabel = await prompt('Nome da opção (ex.: "3x Nuvemshop"):', '', { title: 'Nova opção' })
    if (newLabel === null || !newLabel.trim()) return
    const rawValue = await prompt(percent ? 'Valor em % (ex.: 4,95):' : 'Valor em R$:', '', { title: newLabel.trim() })
    if (rawValue === null) return
    const parsed = Number(rawValue.replace(',', '.'))
    if (Number.isNaN(parsed)) return
    await onCreatePreset(newLabel.trim(), percent ? parsed / 100 : parsed)
  }

  return (
    <div className="block">
      <span className="text-sm text-stone-300">{label}</span>
      <div className="mt-1 flex gap-2">
        <select
          value={selectedKey}
          onChange={(e) => {
            if (e.target.value === CUSTOM) return
            const opt = options.find((o) => o.label === e.target.value)
            if (opt) onChange(opt.value)
          }}
          className="input"
        >
          {options.map((o) => (
            <option key={o.label} value={o.label}>
              {o.label} ({formatOption(o.value, percent)})
            </option>
          ))}
          <option value={CUSTOM}>Personalizado…</option>
        </select>
        <button type="button" onClick={() => void handleAdd()} className="btn-secondary shrink-0 px-3" title="Nova opção">
          +
        </button>
      </div>

      {selectedKey === CUSTOM && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            value={percent ? (value * 100).toFixed(2) : value}
            onChange={(e) => {
              const raw = Number(e.target.value) || 0
              onChange(percent ? raw / 100 : raw)
            }}
            className="input"
          />
          <span className="text-sm text-stone-500">{percent ? '%' : 'R$'}</span>
        </div>
      )}

      {custom.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {custom.map((c) => (
            <span key={c.id} className="flex items-center gap-1 rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-400">
              {c.label}
              <button type="button" onClick={() => void onDeletePreset(c.id)} className="text-red-400 hover:text-red-300">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

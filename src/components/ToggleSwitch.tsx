import type { ReactNode } from 'react'

// Copiado do catálogo pessoal (src/components/ToggleSwitch.tsx) sem
// alteração — zero dependências, nada a simplificar (claude.md §2).

/** Interruptor liga/desliga em formato de pílula, com label opcional ao lado. */
export function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-stone-400">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
          checked ? 'bg-amber-600' : 'bg-stone-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
            checked ? 'translate-x-[18px]' : 'translate-x-1'
          }`}
        />
      </button>
      {label}
    </label>
  )
}

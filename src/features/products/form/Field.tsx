import type { ReactNode } from 'react'

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <Labeled label={label}>
      <input
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1"
      />
    </Labeled>
  )
}

/** Rótulo + qualquer controle (select, seletor de país, campo com sugestão). */
export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-stone-300">{label}</span>
      {children}
    </label>
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-stone-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-stone-700 bg-stone-800 text-amber-600 focus:ring-amber-600"
      />
      {label}
    </label>
  )
}

export function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-stone-800 p-4">
      <h2 className="flex items-center gap-2 font-medium text-stone-200">
        {icon && <span className="text-stone-400">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  )
}

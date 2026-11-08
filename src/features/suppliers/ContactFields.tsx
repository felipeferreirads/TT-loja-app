import type { EmailEntry, PhoneEntry } from '../../types/db'
import { PlusIcon, TrashIcon } from '../../components/icons'
import { maskBrazilianPhoneInput, normalizeBrazilianPhone } from '../../lib/brMask'

// Editor das listas de telefones/e-mails do fornecedor. Versão PT-only do
// `ContactFields.tsx` do catálogo pessoal (que usa i18n) — ver claude.md §2.

const EMPTY_PHONE: PhoneEntry = { value: '', whatsapp: false, label: '' }
const EMPTY_EMAIL: EmailEntry = { value: '', label: '' }

/** Sempre mostra ao menos uma linha, mesmo com a lista vazia. */
function rows<T>(entries: T[], empty: T): T[] {
  return entries.length ? entries : [empty]
}

export function PhonesEditor({
  entries,
  onChange,
  isBR,
}: {
  entries: PhoneEntry[]
  onChange: (next: PhoneEntry[]) => void
  /** Aplica a máscara e o formato brasileiros. */
  isBR: boolean
}) {
  const list = rows(entries, EMPTY_PHONE)
  const set = (i: number, patch: Partial<PhoneEntry>) => onChange(list.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  return (
    <div className="space-y-2">
      {list.map((e, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <input
            value={e.label}
            onChange={(ev) => set(i, { label: ev.target.value })}
            placeholder="Rótulo (ex.: Comercial)"
            aria-label="Rótulo"
            className="input w-full sm:w-36 sm:shrink-0"
          />
          <input
            type="tel"
            value={e.value}
            onChange={(ev) => set(i, { value: isBR ? maskBrazilianPhoneInput(ev.target.value) : ev.target.value })}
            onBlur={() => {
              if (isBR && e.value) set(i, { value: normalizeBrazilianPhone(e.value) })
            }}
            placeholder="Telefone"
            aria-label="Telefone"
            className="input min-w-0 flex-1"
          />
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-stone-400">
            <input type="checkbox" checked={e.whatsapp} onChange={(ev) => set(i, { whatsapp: ev.target.checked })} />É WhatsApp
          </label>
          <button
            type="button"
            onClick={() => onChange(list.filter((_, j) => j !== i))}
            title="Remover telefone"
            aria-label="Remover telefone"
            className="shrink-0 px-2 text-stone-400 hover:text-red-400"
          >
            <TrashIcon />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...list, EMPTY_PHONE])} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
        <PlusIcon /> Adicionar telefone
      </button>
    </div>
  )
}

export function EmailsEditor({ entries, onChange }: { entries: EmailEntry[]; onChange: (next: EmailEntry[]) => void }) {
  const list = rows(entries, EMPTY_EMAIL)
  const set = (i: number, patch: Partial<EmailEntry>) => onChange(list.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  return (
    <div className="space-y-2">
      {list.map((e, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <input
            value={e.label}
            onChange={(ev) => set(i, { label: ev.target.value })}
            placeholder="Rótulo (ex.: Comercial)"
            aria-label="Rótulo"
            className="input w-full sm:w-36 sm:shrink-0"
          />
          <input
            type="email"
            value={e.value}
            onChange={(ev) => set(i, { value: ev.target.value })}
            placeholder="E-mail"
            aria-label="E-mail"
            className="input min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={() => onChange(list.filter((_, j) => j !== i))}
            title="Remover e-mail"
            aria-label="Remover e-mail"
            className="shrink-0 px-2 text-stone-400 hover:text-red-400"
          >
            <TrashIcon />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...list, EMPTY_EMAIL])} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
        <PlusIcon /> Adicionar e-mail
      </button>
    </div>
  )
}

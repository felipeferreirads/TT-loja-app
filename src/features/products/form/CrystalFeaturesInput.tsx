import { useState } from 'react'
import {
  CRYSTAL_FEATURE_GROUPS,
  CRYSTAL_FEATURE_HINTS,
  CRYSTAL_GROUP_LABELS,
  hideImpliedCrystalParents,
  visibleCrystalFeatures,
  withImpliedCrystalParents,
} from '../crystalFeatures'
import { ChevronDownIcon, CloseIcon } from '../../../components/icons'
import { InfoTooltip } from '../../../components/InfoTooltip'

/**
 * Características cristalográficas (0036) — mesma lista fechada e mesmos valores
 * gravados do catálogo pessoal (`crystalFeatures.ts`). Escolher um item filho
 * grava o pai junto (ex.: "Macla de Contato" grava "Macla"); a tela mostra só o filho.
 */
export function CrystalFeaturesInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = visibleCrystalFeatures(value)

  const commit = (next: string[]) => onChange(withImpliedCrystalParents(next).join(', '))
  const toggle = (v: string) => commit(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {hideImpliedCrystalParents(selected).map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-amber-600/15 py-0.5 pr-1 pl-2.5 text-xs text-amber-300">
            {v}
            <button type="button" onClick={() => toggle(v)} aria-label={`Remover ${v}`} className="rounded-full p-0.5 hover:bg-amber-600/30">
              <CloseIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-stone-700 bg-stone-800 px-3 text-xs text-stone-300 transition hover:bg-stone-700"
        >
          {selected.length === 0 ? 'Selecionar características' : 'Editar'}
          <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-900/60 p-3">
          {CRYSTAL_FEATURE_GROUPS.map((g) => (
            <div key={g.key}>
              <span className="mb-1.5 block text-xs font-medium text-stone-400">{CRYSTAL_GROUP_LABELS[g.key] ?? g.key}</span>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((i) => {
                  const active = selected.includes(i.value)
                  const hint = CRYSTAL_FEATURE_HINTS[i.value]
                  return (
                    <span key={i.value} className="inline-flex items-center">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggle(i.value)}
                        className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs whitespace-nowrap transition ${
                          i.parent ? 'italic' : ''
                        } ${active ? 'bg-amber-600 text-white' : 'border border-stone-700 bg-stone-800 text-stone-300 hover:bg-stone-700'}`}
                      >
                        {i.value}
                      </button>
                      {hint && <InfoTooltip text={hint} iconClassName="h-3.5 w-3.5" className="ml-0.5 text-stone-500 hover:text-stone-300" />}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

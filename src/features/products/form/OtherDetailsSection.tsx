import { useCallback, useMemo } from 'react'
import type { CustomField } from '../../../types/db'
import { SuggestInput } from '../../../components/SuggestInput'
import { CloseIcon, InfoIcon, PlusIcon } from '../../../components/icons'
import { useProducts } from '../queries'
import { Section } from './Field'
import { CUSTOM_FIELDS_KEY, parseDraftCustomFields, type Draft } from './draft'

/** Sugestões locais: valores já usados, sem acento/caixa, até 20. */
function localSuggest(values: string[]) {
  const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return async (q: string) => {
    const needle = strip(q.trim())
    return values.filter((v) => !needle || strip(v).includes(needle)).slice(0, 20)
  }
}

/**
 * Campos do tipo "Outro" (0041): subtipo livre e lista de atributos livres
 * (rótulo + valor). Mesma interface de `OtherDetailsFields.tsx` do catálogo
 * pessoal; o nome do item é o próprio nome do produto ("Dados da loja").
 * Sugestões vêm do que já existe nos produtos, para manter a grafia estável.
 */
export function OtherDetailsSection({ draft, set }: { draft: Draft; set: (key: string) => (v: string) => void }) {
  const { data: products = [] } = useProducts()
  const rows = parseDraftCustomFields(draft[CUSTOM_FIELDS_KEY])
  const setRows = (next: CustomField[]) => set(CUSTOM_FIELDS_KEY)(JSON.stringify(next))
  const updateRow = (i: number, patch: Partial<CustomField>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const { subtypes, labels } = useMemo(() => {
    const sub = new Set<string>()
    const lab = new Set<string>()
    for (const p of products) {
      if (p.kind !== 'other') continue
      if (p.species_or_type?.trim()) sub.add(p.species_or_type.trim())
      for (const f of p.custom_fields ?? []) if (f.label.trim()) lab.add(f.label.trim())
    }
    const sort = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return { subtypes: sort(sub), labels: sort(lab) }
  }, [products])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const suggestSubtype = useCallback(localSuggest(subtypes), [subtypes])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const suggestLabel = useCallback(localSuggest(labels), [labels])

  return (
    <Section title="Dados do item" icon={<InfoIcon />}>
      <label className="block w-full">
        <span className="mb-1 block text-xs text-stone-400">Subtipo</span>
        <SuggestInput
          value={draft.species_or_type ?? ''}
          onChange={set('species_or_type')}
          fetchSuggestions={suggestSubtype}
          minChars={0}
          placeholder="Ex.: Concha, Âmbar, Artefato"
        />
      </label>

      <div>
        <h4 className="text-xs font-medium text-stone-300">Atributos</h4>
        <p className="mt-0.5 mb-2 text-xs text-stone-500">Campos livres para registrar características próprias deste item.</p>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <SuggestInput
                  value={row.label}
                  onChange={(v) => updateRow(i, { label: v })}
                  fetchSuggestions={suggestLabel}
                  minChars={0}
                  placeholder="Atributo"
                />
                <input
                  value={row.value}
                  placeholder="Valor"
                  onChange={(e) => updateRow(i, { value: e.target.value })}
                  className="input"
                />
              </div>
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
                title="Remover atributo"
                aria-label="Remover atributo"
                className="mt-1 rounded-lg p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
              >
                <CloseIcon />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows([...rows, { label: '', value: '' }])}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-800"
        >
          <PlusIcon />
          Adicionar atributo
        </button>
      </div>
    </Section>
  )
}

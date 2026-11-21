import { useState } from 'react'
import { SuggestInput } from '../../../components/SuggestInput'
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, LinkIcon, PlusIcon, TrashIcon } from '../../../components/icons'
import { EMPTY_PROVENANCE, filledDrafts, parsePartialDate, resolveParty, type PartyRef, type ProvenanceDraft } from '../provenance'

/**
 * Editor da Procedência — copiado do catálogo pessoal
 * (`features/specimens/ProvenanceEditor.tsx`, lado "antes do dono"), mesma
 * interface com rótulos fixos em PT. Ex-donos em ordem cronológica, cada um com
 * nome, data de compra (ano, mês/ano ou data completa; "~" para aproximada) e
 * observações. O nome que bate com um cadastro é vinculado ao salvar.
 */
export function ProvenanceEditor({
  value,
  onChange,
  nameSuggestions,
  parties,
  endNote,
}: {
  value: ProvenanceDraft[]
  onChange: (next: ProvenanceDraft[]) => void
  nameSuggestions: (q: string) => Promise<string[]>
  parties: PartyRef[]
  endNote?: string | null
}) {
  const list = value
  const [toggled, setToggled] = useState<Record<number, boolean>>({})
  const set = (i: number, patch: Partial<ProvenanceDraft>) => onChange(list.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  const move = (i: number, dir: -1 | 1) => {
    const next = [...list]
    const [row] = next.splice(i, 1)
    next.splice(i + dir, 0, row)
    onChange(next)
    setToggled((prev) => {
      const out = { ...prev }
      const a = prev[i]
      const b = prev[i + dir]
      if (b === undefined) delete out[i]
      else out[i] = b
      if (a === undefined) delete out[i + dir]
      else out[i + dir] = a
      return out
    })
  }
  const remove = (i: number) => {
    onChange(list.filter((_, j) => j !== i))
    setToggled((prev) => {
      const out: Record<number, boolean> = {}
      for (const [k, v] of Object.entries(prev)) {
        const n = Number(k)
        if (n < i) out[n] = v
        else if (n > i) out[n - 1] = v
      }
      return out
    })
  }

  return (
    <div className="space-y-2">
      {list.length > 1 && <p className="text-xs text-stone-500">Ordem cronológica, do mais antigo para o mais recente.</p>}
      {list.map((d, i) => {
        const date = parsePartialDate(d.date)
        const linked = d.name.trim() !== '' && parties.length > 0 && resolveParty(d.name, parties) !== null
        const summary = [d.date.trim(), d.notes.trim()].filter(Boolean).join(' · ')
        const open = date === 'invalid' || (toggled[i] ?? summary !== '')
        return (
          <div key={i} className="space-y-1 rounded-lg border border-stone-800 p-2">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SuggestInput
                  value={d.name}
                  fetchSuggestions={nameSuggestions}
                  placeholder="Nome do ex-dono"
                  onChange={(name) => set(i, { name, partyId: null })}
                />
              </div>
              {linked && (
                <span className="shrink-0 text-amber-500" title="Vinculado ao cadastro" aria-label="Vinculado ao cadastro">
                  <LinkIcon />
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setToggled((prev) => ({ ...prev, [i]: !open }))}
                aria-expanded={open}
                disabled={date === 'invalid'}
                className="flex min-w-0 items-center gap-1 rounded py-1 text-xs text-stone-400 hover:text-stone-100"
              >
                <ChevronDownIcon className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                <span className="truncate">{open || !summary ? 'Data e observações' : summary}</span>
              </button>
              <div className="flex shrink-0 items-center">
                {list.length > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      title="Mover para antes"
                      aria-label="Mover para antes"
                      className="p-1.5 text-stone-400 hover:text-stone-100 disabled:opacity-30"
                    >
                      <ChevronUpIcon />
                    </button>
                    <button
                      type="button"
                      disabled={i === list.length - 1}
                      onClick={() => move(i, 1)}
                      title="Mover para depois"
                      aria-label="Mover para depois"
                      className="p-1.5 text-stone-400 hover:text-stone-100 disabled:opacity-30"
                    >
                      <ChevronDownIcon />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  title="Remover ex-dono"
                  aria-label="Remover ex-dono"
                  className="p-1.5 text-stone-400 hover:text-red-400"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
            {open && (
              <div className="grid gap-2 pt-1 sm:grid-cols-[11rem_1fr]">
                <label className="block">
                  <span className="text-xs text-stone-400">Data de aquisição</span>
                  <input
                    value={d.date}
                    onChange={(e) => set(i, { date: e.target.value })}
                    placeholder="aaaa, mm/aaaa ou dd/mm/aaaa; ~ para aproximada"
                    inputMode="numeric"
                    aria-invalid={date === 'invalid'}
                    className="input mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-400">Observações</span>
                  <input value={d.notes} onChange={(e) => set(i, { notes: e.target.value })} className="input mt-1" />
                </label>
              </div>
            )}
            {date === 'invalid' && (
              <p className="text-xs text-red-400">
                Data inválida. Use o ano, o mês e o ano ou a data completa. Para data aproximada, comece com ~.
              </p>
            )}
          </div>
        )
      })}
      <button type="button" onClick={() => onChange([...list, EMPTY_PROVENANCE])} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
        <PlusIcon /> Adicionar ex-dono
      </button>
      {endNote && filledDrafts(list).length > 0 && (
        <p className="flex items-center gap-1 text-xs text-stone-500">
          <ArrowRightIcon className="shrink-0" />
          <span className="truncate">Fornecedor (quem vendeu para você): {endNote}</span>
        </p>
      )}
    </div>
  )
}

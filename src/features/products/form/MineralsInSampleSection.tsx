import { useCallback, useState } from 'react'
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon, SpecimenIcon, SearchIcon, RestoreAutoIcon } from '../../../components/icons'
import { SuggestInput } from '../../../components/SuggestInput'
import { lookupMineral, searchMineralNames, type MineralAutoInfo } from '../../../lib/mineralReference'
import type { StoreProductMineral, StoreProductMineralInput } from '../../../types/db'
import { Section } from './Field'
import { MINERAL_PROPS, type MineralPropKey } from './mineralFields'

/**
 * "Minerais da amostra" (0015, reverte a simplificação anterior de "um item
 * = uma espécie mineral principal") — mesmo modelo de `specimen_minerals` do
 * catálogo pessoal: a peça pode ter mais de um mineral (Mineral 1, 2, 3...),
 * cada um com nome, busca/autofill próprios no catálogo `minerals_reference`
 * e ficha completa de propriedades químicas/físicas/ópticas. Persistido numa
 * tabela à parte (`store_product_minerals`); este componente é só a UI —
 * quem carrega/salva de verdade é `ProductPage.tsx` (reconcilia contra
 * `fetchProduct`/`addProductMineral`/`updateProductMineral`/
 * `removeProductMineral` num único ponto, junto do "Salvar" do produto).
 */
export interface MineralRowDraft {
  /** Chave estável de UI (React key) — nunca vai pro banco. */
  key: string
  /** Presente só quando a linha já existe em `store_product_minerals`. */
  id?: string
  name: string
  mineral_reference_id: string | null
  auto_fields: string[]
  formula: string
  formula_name: string
  mineral_class: string
  group_name: string
  color_cause: string
  chromophore: string
  hardness: string
  tenacity: string
  cleavage: string
  fracture: string
  streak: string
  density: string
  crystal_system: string
  luster: string
  transparency: string
  refractive_index: string
}

export function emptyMineralRow(): MineralRowDraft {
  const row = { key: crypto.randomUUID(), name: '', mineral_reference_id: null, auto_fields: [] } as unknown as MineralRowDraft
  for (const p of MINERAL_PROPS) row[p.key] = ''
  return row
}

export function mineralRowToDraft(row: StoreProductMineral): MineralRowDraft {
  const draft = {
    key: row.id,
    id: row.id,
    name: row.name ?? '',
    mineral_reference_id: row.mineral_reference_id,
    auto_fields: row.auto_fields ?? [],
  } as unknown as MineralRowDraft
  for (const p of MINERAL_PROPS) draft[p.key] = (row as unknown as Record<string, string | null>)[p.key] ?? ''
  return draft
}

export function mineralRowToInput(d: MineralRowDraft): StoreProductMineralInput {
  const input: Record<string, unknown> = {
    name: d.name.trim() || null,
    mineral_reference_id: d.mineral_reference_id,
    auto_fields: d.auto_fields,
  }
  for (const p of MINERAL_PROPS) input[p.key] = d[p.key].trim() === '' ? null : d[p.key].trim()
  return input as StoreProductMineralInput
}

export function MineralsInSampleSection({
  minerals,
  onChange,
}: {
  minerals: MineralRowDraft[]
  onChange: (minerals: MineralRowDraft[]) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(minerals.length > 0 ? [minerals[0].key] : []))
  const [lookupMsg, setLookupMsg] = useState<Record<string, string>>({})

  const nameSuggestions = useCallback((q: string) => searchMineralNames(q), [])

  const updateAt = (key: string, patch: Partial<MineralRowDraft>) =>
    onChange(minerals.map((m) => (m.key === key ? { ...m, ...patch } : m)))

  const addMineral = () => {
    const next = emptyMineralRow()
    onChange([...minerals, next])
    setExpanded((prev) => new Set(prev).add(next.key))
  }

  const removeMineral = (key: string) => onChange(minerals.filter((m) => m.key !== key))

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  /** Preenche as propriedades ainda automáticas (ou vazias) a partir do
   *  catálogo; campo já editado à mão fica congelado e não é sobrescrito. */
  const applyLookup = async (row: MineralRowDraft) => {
    if (!row.name.trim()) return
    setLookupMsg((m) => ({ ...m, [row.key]: 'Buscando…' }))
    const hit = await lookupMineral(row.name)
    if (!hit) {
      setLookupMsg((m) => ({ ...m, [row.key]: 'Não encontrado no catálogo de minerais.' }))
      return
    }
    const patch: Partial<MineralRowDraft> = {}
    const auto = new Set(row.auto_fields)
    for (const p of MINERAL_PROPS) {
      const isManual = !auto.has(p.key) && row[p.key] !== ''
      if (isManual) continue
      const value = hit.info[p.key as keyof MineralAutoInfo]
      if (value) {
        ;(patch as Record<string, string>)[p.key] = value
        auto.add(p.key)
      }
    }
    patch.auto_fields = Array.from(auto)
    patch.mineral_reference_id = hit.id
    updateAt(row.key, patch)
    setLookupMsg((m) => ({
      ...m,
      [row.key]: hit.kind === 'variety' && hit.parentName ? `${hit.info.name} — variedade de ${hit.parentName}.` : `${hit.info.name} — preenchido pelo catálogo.`,
    }))
  }

  const setField = (row: MineralRowDraft, key: MineralPropKey, value: string) =>
    updateAt(row.key, { [key]: value, auto_fields: row.auto_fields.filter((k) => k !== key) } as Partial<MineralRowDraft>)

  /** "Restaurar para automático": readiciona a chave em `auto_fields` e já
   *  repreenche o campo com o dado atual do catálogo. */
  const restoreAutoField = async (row: MineralRowDraft, key: MineralPropKey) => {
    const hit = await lookupMineral(row.name)
    const value = hit?.info[key as keyof MineralAutoInfo]
    updateAt(row.key, {
      ...(value ? { [key]: value } : {}),
      auto_fields: row.auto_fields.includes(key) ? row.auto_fields : [...row.auto_fields, key],
    } as Partial<MineralRowDraft>)
  }

  const anyManualField = minerals.some((m) => m.auto_fields.length < MINERAL_PROPS.length)

  return (
    <Section title="Minerais da amostra — dados automáticos" icon={<SpecimenIcon />}>
      <p className="text-xs text-stone-500">
        Uma peça pode ter mais de um mineral — digite o nome e clique em "Buscar dados do mineral" pra trazer fórmula,
        dureza, sistema cristalino e o resto do catálogo <code>minerals_reference</code>.
      </p>

      <div className="space-y-2">
        {minerals.map((m, i) => {
          const isOpen = expanded.has(m.key)
          return (
            <div key={m.key} className="rounded-lg border border-stone-800">
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => toggle(m.key)}
                  aria-label={isOpen ? 'Recolher' : 'Expandir'}
                  className="tap-icon shrink-0 bg-stone-800 text-stone-300"
                >
                  {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                </button>
                <span className="flex-1 truncate text-sm text-stone-200">
                  {m.name || `Mineral ${i + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => removeMineral(m.key)}
                  title="Remover mineral"
                  aria-label="Remover mineral"
                  className="tap-icon shrink-0 bg-stone-800 text-red-400 hover:bg-red-950/60"
                >
                  <TrashIcon />
                </button>
              </div>

              {isOpen && (
                <div className="space-y-3 border-t border-stone-800 p-3">
                  <div className="flex items-end gap-2">
                    <label className="block flex-1">
                      <span className="text-sm text-stone-300">Mineral {i + 1}</span>
                      <div className="mt-1">
                        <SuggestInput
                          value={m.name}
                          onChange={(v) => updateAt(m.key, { name: v })}
                          onPick={(v) => void applyLookup({ ...m, name: v })}
                          fetchSuggestions={nameSuggestions}
                          placeholder="Ex.: Ametista"
                        />
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => void applyLookup(m)}
                      disabled={!m.name.trim()}
                      className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <SearchIcon className="h-4 w-4" />
                      Buscar dados do mineral
                    </button>
                  </div>
                  {lookupMsg[m.key] && <p className="text-xs text-stone-400">{lookupMsg[m.key]}</p>}

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {MINERAL_PROPS.map((p) => {
                      const isAuto = m.auto_fields.includes(p.key)
                      const inputClass = !isAuto && m[p.key].trim() ? 'input mt-1 border-l-2 border-l-amber-500' : 'input mt-1'
                      return (
                        <label key={p.key} className="block">
                          <span className="flex items-center gap-1 text-sm text-stone-300">
                            {p.label}
                            {!isAuto && m[p.key].trim() && (
                              <button
                                type="button"
                                title="Voltar ao valor do catálogo"
                                aria-label="Voltar ao valor do catálogo"
                                onClick={() => void restoreAutoField(m, p.key)}
                                className="text-stone-500 hover:text-amber-500"
                              >
                                <RestoreAutoIcon />
                              </button>
                            )}
                          </span>
                          {'options' in p && p.options ? (
                            <select value={m[p.key]} onChange={(e) => setField(m, p.key, e.target.value)} className={inputClass}>
                              <option value="">—</option>
                              {p.options.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input value={m[p.key]} onChange={(e) => setField(m, p.key, e.target.value)} className={inputClass} />
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button type="button" onClick={addMineral} className="btn-secondary gap-1.5">
        <PlusIcon /> Adicionar mineral
      </button>

      {minerals.length === 0 && <p className="text-sm text-stone-400">Nenhum mineral adicionado ainda.</p>}

      {anyManualField && (
        <p className="flex items-center gap-1.5 text-xs text-stone-400">
          <span className="inline-block h-3 w-1 shrink-0 rounded-sm bg-amber-500" aria-hidden="true" />
          Campo com borda âmbar foi editado à mão — não é mais atualizado automaticamente pelo catálogo.
        </p>
      )}
    </Section>
  )
}

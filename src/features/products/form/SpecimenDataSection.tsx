import { useCallback, useState } from 'react'
import type { StoreItemKind } from '../../../types/db'
import { lookupMineral, searchMineralNames, type MineralAutoInfo } from '../../../lib/mineralReference'
import { fetchSubdivisions, matchSubdivision } from '../../../lib/subdivisionReference'
import { SuggestInput } from '../../../components/SuggestInput'
import { CountrySelect } from '../../../components/CountrySelect'
import { SubdivisionSelect } from '../../../components/SubdivisionSelect'
import { LocalitySearchInput } from '../../../components/LocalitySearchInput'
import { Field, Labeled, Section } from './Field'
import { AUTO_FIELDS, type Draft } from './draft'

/**
 * Identidade geológica/taxonômica do item — o que o cliente da loja precisa
 * saber sobre a peça. É a parte reaproveitada do formulário do catálogo
 * pessoal; Categorias e dados privados da coleção ficam de fora de propósito
 * (não existem no domínio comercial).
 */
export function SpecimenDataSection({
  draft,
  set,
  setMany,
  kind,
  onAutofill,
}: {
  draft: Draft
  set: (key: string) => (v: string) => void
  setMany: (values: Draft) => void
  kind: StoreItemKind
  /** Avisa quem guarda `auto_fields`/`mineral_reference_id` do vínculo novo. */
  onAutofill: (referenceId: string | null, filledKeys: string[]) => void
}) {
  const [autofillNote, setAutofillNote] = useState<string | null>(null)

  const speciesSuggestions = useCallback((q: string) => searchMineralNames(q), [])

  /** Preenche as propriedades vazias a partir do catálogo; nunca sobrescreve o
   *  que o dono já digitou à mão. */
  const applyMineralLookup = async (name: string) => {
    setAutofillNote('Buscando no catálogo…')
    const hit = await lookupMineral(name)
    if (!hit) {
      setAutofillNote('Não encontrado no catálogo de minerais.')
      onAutofill(null, [])
      return
    }
    const filled: Draft = {}
    const filledKeys: string[] = []
    for (const key of AUTO_FIELDS) {
      const value = hit.info[key as keyof MineralAutoInfo]
      if (value && !draft[key]?.trim()) {
        filled[key] = value
        filledKeys.push(key)
      }
    }
    setMany(filled)
    onAutofill(hit.id, filledKeys)
    setAutofillNote(
      hit.kind === 'variety' && hit.parentName
        ? `${hit.info.name} — variedade de ${hit.parentName}.`
        : `${hit.info.name} — preenchido pelo catálogo.`,
    )
  }

  /** Ao escolher uma localidade, resolve país e estado de uma vez. */
  const applyLocality = async (candidate: {
    displayName: string
    state: string | null
    countryCode: string | null
  }) => {
    const values: Draft = { origin: candidate.displayName }
    if (candidate.countryCode) values.origin_country = candidate.countryCode
    setMany(values)
    if (!candidate.countryCode || !candidate.state) return
    const options = await fetchSubdivisions(candidate.countryCode)
    const iso = matchSubdivision(candidate.state, options)
    if (iso) setMany({ origin_state: iso })
  }

  return (
    <Section title="Dados do item">
      <div className="grid grid-cols-2 gap-3">
        <Labeled label={kind === 'fossil' ? 'Espécie' : 'Espécie mineral'}>
          <div className="mt-1">
            <SuggestInput
              value={draft.species}
              onChange={set('species')}
              onPick={(v) => void applyMineralLookup(v)}
              fetchSuggestions={speciesSuggestions}
              placeholder="Ex.: Ametista"
            />
          </div>
        </Labeled>
        <Field label="Variedade" value={draft.variety} onChange={set('variety')} />
      </div>

      {kind !== 'fossil' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void applyMineralLookup(draft.species)}
            disabled={!draft.species.trim()}
            className="btn-secondary"
          >
            Buscar dados do mineral
          </button>
          {autofillNote && <span className="text-xs text-stone-500">{autofillNote}</span>}
        </div>
      )}

      <Field label="Cor" value={draft.color} onChange={set('color')} />

      <Labeled label="Buscar localidade">
        <div className="mt-1">
          <LocalitySearchInput onPick={(c) => void applyLocality(c)} />
        </div>
      </Labeled>

      <Field label="Localidade" value={draft.origin} onChange={set('origin')} />

      <div className="grid grid-cols-2 gap-3">
        <Labeled label="País de origem">
          <div className="mt-1">
            <CountrySelect value={draft.origin_country} onChange={set('origin_country')} />
          </div>
        </Labeled>
        <Labeled label="Estado / Província">
          <div className="mt-1">
            <SubdivisionSelect
              countryCode={draft.origin_country}
              value={draft.origin_state}
              onChange={set('origin_state')}
            />
          </div>
        </Labeled>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Peso (g)" value={draft.weight_g} onChange={set('weight_g')} type="number" />
        <Field label="Dimensões (mm)" value={draft.dimensions} onChange={set('dimensions')} placeholder="L × A × P" />
      </div>

      {kind === 'gem' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lapidação" value={draft.gem_cut} onChange={set('gem_cut')} />
          <Field label="Peso (ct)" value={draft.weight_ct} onChange={set('weight_ct')} type="number" />
        </div>
      )}

      {kind === 'meteorite' && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Classe" value={draft.met_class} onChange={set('met_class')} />
          <Field label="Grupo/tipo" value={draft.met_type_group} onChange={set('met_type_group')} />
          <Field label="Estrutura" value={draft.met_structure} onChange={set('met_structure')} />
        </div>
      )}
    </Section>
  )
}

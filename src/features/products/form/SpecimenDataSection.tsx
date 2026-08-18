import { useState } from 'react'
import type { StoreItemKind } from '../../../types/db'
import { fetchSubdivisions, matchSubdivision } from '../../../lib/subdivisionReference'
import { CountrySelect } from '../../../components/CountrySelect'
import { SubdivisionSelect } from '../../../components/SubdivisionSelect'
import { LocalitySearchInput } from '../../../components/LocalitySearchInput'
import { ColorSwatchSelect, ColorSwatchMultiSelect } from '../../../components/ColorSwatchSelect'
import { MultiTagSelect } from '../../../components/MultiTagSelect'
import { COLOR_OPTIONS, COLOR_SWATCH } from '../colorOptions'
import { DEFAULT_SPECIAL_PROPS, FLUORESCENCE_COLOR_OPTIONS, SPECTRUM_COLOR_OPTIONS, splitProps } from './mineralFields'
import { ChevronDownIcon, SpecimenIcon } from '../../../components/icons'
import { Field, Labeled, Section } from './Field'
import type { Draft } from './draft'

/**
 * Identidade geológica/taxonômica do item — o que o cliente da loja precisa
 * saber sobre a peça. É a parte reaproveitada do formulário do catálogo
 * pessoal; Categorias e dados privados da coleção ficam de fora de propósito
 * (não existem no domínio comercial). A identificação do(s) mineral(is) da
 * amostra (nome, autofill, propriedades químicas/físicas/ópticas) mudou pra
 * `MineralsInSampleSection` (0015) — aqui ficam só as características do
 * exemplar como um todo (cor, cores secundárias, propriedades especiais).
 */
export function SpecimenDataSection({
  draft,
  set,
  setMany,
  kind,
}: {
  draft: Draft
  set: (key: string) => (v: string) => void
  setMany: (values: Draft) => void
  kind: StoreItemKind
}) {
  const [showColorSecondary, setShowColorSecondary] = useState(false)

  const specialProps = splitProps(draft.special_properties)
  const setSpecialProps = (next: string[]) => set('special_properties')(next.join(', '))

  const colorSecondary = splitProps(draft.color_secondary)
  const setColorSecondary = (next: string[]) => set('color_secondary')(next.join(', '))

  const uvColors = splitProps(draft.uv_color)
  const setUvColors = (next: string[]) => set('uv_color')(next.join(', '))

  const iridescenceColors = splitProps(draft.iridescence_color)
  const setIridescenceColors = (next: string[]) => set('iridescence_color')(next.join(', '))

  const playOfColors = splitProps(draft.play_of_color)
  const setPlayOfColors = (next: string[]) => set('play_of_color')(next.join(', '))

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
    <Section title="Dados do item" icon={<SpecimenIcon />}>
      {/* Detalhes do tipo — mesma posição do app principal: campos
          específicos do tipo vêm antes de Origem/Características físicas. */}
      {(kind === 'mineral' || kind === 'gem') && (
        <>
          <Labeled label="Propriedades especiais">
            <div className="mt-1">
              <MultiTagSelect
                options={DEFAULT_SPECIAL_PROPS}
                values={specialProps}
                onChange={setSpecialProps}
                placeholder="Ex.: Fluorescência, Magnetismo"
              />
            </div>
          </Labeled>

          {/* Condicional: só existe sentido em perguntar a cor sob UV de quem
              já foi marcado como fluorescente. Multi-seleção: a mesma peça
              pode emitir mais de uma cor sob UV. */}
          {specialProps.includes('Fluorescência') && (
            <Labeled label="Cor sob luz UV (fluorescência)">
              <div className="mt-1">
                <ColorSwatchMultiSelect
                  values={uvColors}
                  onChange={setUvColors}
                  options={FLUORESCENCE_COLOR_OPTIONS}
                  swatches={COLOR_SWATCH}
                />
              </div>
            </Labeled>
          )}

          {/* Mesmo padrão, condicional a "Iridescência". */}
          {specialProps.includes('Iridescência') && (
            <Labeled label="Cor da iridescência">
              <div className="mt-1">
                <ColorSwatchMultiSelect
                  values={iridescenceColors}
                  onChange={setIridescenceColors}
                  options={SPECTRUM_COLOR_OPTIONS}
                  swatches={COLOR_SWATCH}
                />
              </div>
            </Labeled>
          )}

          {/* Mesmo padrão, condicional a "Jogo de Cor" (opala). */}
          {specialProps.includes('Jogo de Cor') && (
            <Labeled label="Cor do jogo de cor">
              <div className="mt-1">
                <ColorSwatchMultiSelect
                  values={playOfColors}
                  onChange={setPlayOfColors}
                  options={SPECTRUM_COLOR_OPTIONS}
                  swatches={COLOR_SWATCH}
                />
              </div>
            </Labeled>
          )}
        </>
      )}

      {kind === 'meteorite' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Classe" value={draft.met_class} onChange={set('met_class')} />
            <Field label="Grupo/tipo" value={draft.met_type_group} onChange={set('met_type_group')} />
            <Field label="Estrutura" value={draft.met_structure} onChange={set('met_structure')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Composição" value={draft.met_material} onChange={set('met_material')} />
            <Field label="Massa total conhecida" value={draft.met_total_mass} onChange={set('met_total_mass')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Choque" value={draft.met_shock} onChange={set('met_shock')} placeholder="S1..S6" />
            <Field label="Intemperismo" value={draft.met_weathering} onChange={set('met_weathering')} placeholder="W0..W6" />
          </div>
        </>
      )}

      {/* Origem */}
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

      {/* Características físicas */}
      <div className={`grid gap-3 ${kind === 'mineral' || kind === 'gem' ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Field label="Peso (g)" value={draft.weight_g} onChange={set('weight_g')} type="number" />
        {(kind === 'mineral' || kind === 'gem') && (
          <Field label="Peso (ct)" value={draft.weight_ct} onChange={set('weight_ct')} type="number" />
        )}
        <Field label="Dimensões (mm)" value={draft.dimensions} onChange={set('dimensions')} placeholder="A × L × P" />
      </div>

      {kind === 'gem' && <Field label="Lapidação" value={draft.gem_cut} onChange={set('gem_cut')} />}

      <Labeled label="Cor">
        <div className="mt-1">
          <ColorSwatchSelect
            value={draft.color}
            onChange={(v) => {
              set('color')(v)
              // Escolher X como predominante não deixa X também marcado como secundária.
              if (v) setColorSecondary(colorSecondary.filter((c) => c !== v))
            }}
            options={COLOR_OPTIONS}
            swatches={COLOR_SWATCH}
          />
        </div>
      </Labeled>

      {(kind === 'mineral' || kind === 'gem') && (
        <div>
          <button
            type="button"
            onClick={() => setShowColorSecondary((v) => !v)}
            aria-expanded={showColorSecondary}
            className="mb-1 flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200"
          >
            <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showColorSecondary ? '' : '-rotate-90'}`} />
            Cores secundárias
            {/* Recolhido com valor já salvo: mostra as bolinhas mesmo sem abrir, senão o dado fica invisível. */}
            {!showColorSecondary && colorSecondary.length > 0 && (
              <span className="flex items-center gap-1">
                {colorSecondary.map((c) => (
                  <span key={c} className="h-2.5 w-2.5 shrink-0 rounded-full border border-stone-700" style={{ backgroundColor: COLOR_SWATCH[c] }} />
                ))}
              </span>
            )}
          </button>
          {showColorSecondary && (
            <ColorSwatchMultiSelect
              values={colorSecondary}
              onChange={setColorSecondary}
              options={COLOR_OPTIONS.filter((o) => o !== draft.color)}
              swatches={COLOR_SWATCH}
            />
          )}
        </div>
      )}
    </Section>
  )
}

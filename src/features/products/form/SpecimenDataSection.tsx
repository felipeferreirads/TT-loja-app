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
import { GEM_SHAPE_OPTIONS, GEM_STYLE_OPTIONS, CUT_TYPE_OPTIONS } from './gemFields'
import {
  MET_ACID_ETCHED,
  MET_ALL_CLASSES,
  MET_CATEGORIES,
  MET_CLASSES_BY_CATEGORY,
  MET_MAGNETISM,
  MET_SHOCK,
  MET_WEATHERING,
  MET_YES_NO_PARTIAL,
} from './meteoriteFields'
import { ChevronDownIcon, SpecimenIcon } from '../../../components/icons'
import { ToggleSwitch } from '../../../components/ToggleSwitch'
import { Field, Labeled, Section } from './Field'
import type { Draft } from './draft'

/** Toggles Sim/vazio do bloco "Espécime" de meteorito (mesma ordem do catálogo pessoal). */
const MET_TOGGLE_FIELDS: { key: string; label: string }[] = [
  { key: 'met_individual_fragment', label: 'Fragmento individual' },
  { key: 'met_end_cut', label: 'End cut / corte terminal' },
  { key: 'met_chondrules_visible', label: 'Côndrulos visíveis' },
  { key: 'met_metal_matrix_visible', label: 'Matriz metálica visível' },
  { key: 'met_olivine_visible', label: 'Olivina visível' },
  { key: 'met_polished', label: 'Polido' },
  { key: 'met_cut_sliced', label: 'Fatiado / cortado' },
  { key: 'met_polished_window', label: 'Janela polida' },
]

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
      {(kind === 'mineral') && (
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
        <div className="space-y-4">
          {/* Espécime — selects (crosta/intemperismo do exemplar/ataque ácido/
              magnetismo) + toggles Sim/vazio, mesma ordem do catálogo pessoal. */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-stone-300">Espécime</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Labeled label="Crosta de fusão">
                  <select value={draft.met_crust_fusion} onChange={(e) => set('met_crust_fusion')(e.target.value)} className="input mt-1">
                    <option value="">—</option>
                    {MET_YES_NO_PARTIAL.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Intemperismo do exemplar">
                  <select value={draft.met_weathering_specimen} onChange={(e) => set('met_weathering_specimen')(e.target.value)} className="input mt-1">
                    <option value="">—</option>
                    {MET_WEATHERING.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Ataque ácido">
                  <select value={draft.met_acid_etched} onChange={(e) => set('met_acid_etched')(e.target.value)} className="input mt-1">
                    <option value="">—</option>
                    {MET_ACID_ETCHED.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Magnetismo">
                  <select value={draft.met_magnetism} onChange={(e) => set('met_magnetism')(e.target.value)} className="input mt-1">
                    <option value="">—</option>
                    {MET_MAGNETISM.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Labeled>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MET_TOGGLE_FIELDS.map((f) => (
                  <div
                    key={f.key}
                    className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-stone-800 bg-stone-900/70 px-3 text-sm text-stone-300"
                  >
                    <span className="truncate">{f.label}</span>
                    <ToggleSwitch checked={draft[f.key] === 'Sim'} onChange={(v) => set(f.key)(v ? 'Sim' : '')} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Designação — classificação à esquerda, queda/datas/massas à direita. */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-stone-300">Designação</h3>
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="space-y-3">
                <Labeled label="Categoria">
                  <select
                    value={draft.met_category}
                    onChange={(e) => {
                      const v = e.target.value
                      const classes = v ? (MET_CLASSES_BY_CATEGORY[v] ?? []) : MET_ALL_CLASSES
                      setMany({
                        met_category: v,
                        // Classe já escolhida não pertence mais à categoria nova: limpa.
                        met_class: classes.includes(draft.met_class) ? draft.met_class : '',
                      })
                    }}
                    className="input mt-1"
                  >
                    <option value="">—</option>
                    {MET_CATEGORIES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Classe">
                  <select value={draft.met_class} onChange={(e) => set('met_class')(e.target.value)} className="input mt-1">
                    <option value="">—</option>
                    {(draft.met_category ? (MET_CLASSES_BY_CATEGORY[draft.met_category] ?? []) : MET_ALL_CLASSES).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Field label="Composição" value={draft.met_material} onChange={set('met_material')} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Grupo" value={draft.met_group} onChange={set('met_group')} />
                  <Field label="Tipo" value={draft.met_type} onChange={set('met_type')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Labeled label="Choque">
                    <select value={draft.met_shock} onChange={(e) => set('met_shock')(e.target.value)} className="input mt-1">
                      <option value="">—</option>
                      {MET_SHOCK.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </Labeled>
                  <Labeled label="Intemperismo geral">
                    <select value={draft.met_weathering} onChange={(e) => set('met_weathering')(e.target.value)} className="input mt-1">
                      <option value="">—</option>
                      {MET_WEATHERING.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </Labeled>
                </div>
                <Field label="Estrutura / Textura" value={draft.met_structure} onChange={set('met_structure')} />
              </div>
              <div className="space-y-3">
                <Labeled label="Queda observada">
                  <div className="mt-1 inline-flex min-h-11 w-full overflow-hidden rounded-lg border border-stone-700 text-sm" role="radiogroup">
                    {(
                      [
                        { value: 'Não', label: 'Não', active: 'bg-red-600 text-white' },
                        { value: '', label: '—', active: 'bg-stone-600 text-white' },
                        { value: 'Sim', label: 'Sim', active: 'bg-green-600 text-white' },
                      ] as const
                    ).map((o, i) => (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={draft.met_fall_observed === o.value}
                        onClick={() => set('met_fall_observed')(o.value)}
                        className={`flex flex-1 items-center justify-center transition ${i > 0 ? 'border-l border-stone-700' : ''} ${
                          draft.met_fall_observed === o.value ? o.active : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </Labeled>
                <Field label="Data da queda" value={draft.met_fall_date} onChange={set('met_fall_date')} />
                <Field label="Data do achado" value={draft.met_found_date} onChange={set('met_found_date')} />
                <Field label="Idade" value={draft.met_age} onChange={set('met_age')} />
                <Field label="Massa total conhecida" value={draft.met_total_mass} onChange={set('met_total_mass')} />
                <Field label="Maior fragmento" value={draft.met_largest_fragment} onChange={set('met_largest_fragment')} />
                <Field
                  label="Dimensões do maior fragmento"
                  value={draft.met_largest_fragment_dimensions}
                  onChange={set('met_largest_fragment_dimensions')}
                />
              </div>
            </div>
          </div>
        </div>
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
      <div className={`grid gap-3 ${kind === 'mineral' ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Field label="Peso (g)" value={draft.weight_g} onChange={set('weight_g')} type="number" />
        {(kind === 'mineral') && (
          <Field label="Peso (ct)" value={draft.weight_ct} onChange={set('weight_ct')} type="number" />
        )}
        <Field label="Dimensões (mm)" value={draft.dimensions} onChange={set('dimensions')} placeholder="A × L × P" />
      </div>

      {/* Gema (mineral lapidado) — mesma posição/comportamento do catálogo
          pessoal: checkbox liga os campos exclusivos de lapidação. */}
      {kind === 'mineral' && (
        <div className="space-y-3 border-t border-stone-800 pt-3">
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={draft.is_gem === 'true'}
              onChange={(e) => set('is_gem')(e.target.checked ? 'true' : 'false')}
              className="accent-amber-600"
            />
            Lapidado (Gema)
          </label>
          {draft.is_gem === 'true' && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Labeled label="Tipo de lapidação">
                  <select value={draft.cut_type} onChange={(e) => set('cut_type')(e.target.value)} className="input mt-1">
                    <option value="">—</option>
                    {CUT_TYPE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Formato">
                  <select value={draft.gem_shape} onChange={(e) => set('gem_shape')(e.target.value)} className="input mt-1">
                    <option value="">—</option>
                    {GEM_SHAPE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Labeled>
                {/* Estilo só faz sentido pra pedra Facetado ou Misto — a
                    geometria das facetas não existe em Cabochão/Escultura/Esfera. */}
                {(draft.cut_type === 'Facetado' || draft.cut_type === 'Misto') && (
                  <Labeled label="Estilo">
                    <select value={draft.gem_cut_style} onChange={(e) => set('gem_cut_style')(e.target.value)} className="input mt-1">
                      <option value="">—</option>
                      {GEM_STYLE_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </Labeled>
                )}
              </div>
              <Field label="Nome do corte" value={draft.cut_name} onChange={set('cut_name')} />
            </>
          )}
          {/* Tratamento vale pra qualquer mineral, não só lapidado (ex.: opala bruta já tratada com fumaça/irradiação). */}
          <Labeled label="Tratamento">
            <textarea
              value={draft.gem_treatment}
              onChange={(e) => set('gem_treatment')(e.target.value)}
              className="input mt-1 min-h-16"
            />
          </Labeled>
        </div>
      )}

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

      {(kind === 'mineral') && (
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

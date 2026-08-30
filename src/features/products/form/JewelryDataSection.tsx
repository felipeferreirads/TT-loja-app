import { ColorSwatchSelect } from '../../../components/ColorSwatchSelect'
import { COLOR_OPTIONS, COLOR_SWATCH } from '../colorOptions'
import { JWL_CLASP_OPTIONS, JWL_FINISH_OPTIONS, JWL_MATERIAL_OPTIONS } from './jewelryFields'
import { JewelryIcon } from '../../../components/icons'
import { ToggleSwitch } from '../../../components/ToggleSwitch'
import { Field, Labeled, Section } from './Field'
import type { Draft } from './draft'

/**
 * Dados de joia/bijuteria (`kind='jewelry'`) — bem mais enxuto que
 * `SpecimenDataSection`: nada de origem geológica/lapidação, só o que
 * descreve a peça pronta (material, pedra, tamanho, acabamento).
 */
export function JewelryDataSection({ draft, set }: { draft: Draft; set: (key: string) => (v: string) => void }) {
  return (
    <Section title="Dados da joia" icon={<JewelryIcon />}>
      <Labeled label="Material">
        <select value={draft.jwl_material} onChange={(e) => set('jwl_material')(e.target.value)} className="input mt-1">
          <option value="">—</option>
          {JWL_MATERIAL_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Labeled>

      <Field label="Pedra central / gema" value={draft.jwl_stone} onChange={set('jwl_stone')} placeholder="Ex.: Zircônia, ametista" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tamanho" value={draft.jwl_size} onChange={set('jwl_size')} placeholder="Aro / comprimento" />
        <Labeled label="Acabamento">
          <select value={draft.jwl_finish} onChange={(e) => set('jwl_finish')(e.target.value)} className="input mt-1">
            <option value="">—</option>
            {JWL_FINISH_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Labeled>
      </div>

      <Labeled label="Fecho">
        <select value={draft.jwl_clasp} onChange={(e) => set('jwl_clasp')(e.target.value)} className="input mt-1">
          <option value="">—</option>
          {JWL_CLASP_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Labeled>

      <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-stone-800 bg-stone-900/70 px-3 text-sm text-stone-300">
        <span>Ajustável</span>
        <ToggleSwitch checked={draft.jwl_adjustable === 'Sim'} onChange={(v) => set('jwl_adjustable')(v ? 'Sim' : '')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Peso (g)" value={draft.weight_g} onChange={set('weight_g')} type="number" />
        <Field label="Dimensões (mm)" value={draft.dimensions} onChange={set('dimensions')} placeholder="A × L × P" />
      </div>

      <Labeled label="Cor">
        <div className="mt-1">
          <ColorSwatchSelect value={draft.color} onChange={set('color')} options={COLOR_OPTIONS} swatches={COLOR_SWATCH} />
        </div>
      </Labeled>
    </Section>
  )
}

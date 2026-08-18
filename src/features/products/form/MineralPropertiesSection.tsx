import { RestoreAutoIcon } from '../../../components/icons'
import { Section } from './Field'
import { AUTO_FIELDS, AUTO_FIELD_LABELS, type Draft } from './draft'

/**
 * Propriedades químicas, físicas e ópticas — as que o catálogo global
 * `minerals_reference` preenche sozinho. Campo ainda automático ganha borda
 * âmbar; editar à mão o congela (sai de `auto_fields`) e mostra o botão de
 * voltar ao automático. Mesmo mecanismo do catálogo pessoal.
 */
export function MineralPropertiesSection({
  draft,
  set,
  autoFields,
  onManualEdit,
  onRestoreAuto,
}: {
  draft: Draft
  set: (key: string) => (v: string) => void
  autoFields: string[]
  onManualEdit: (key: string) => void
  onRestoreAuto: (key: string) => void
}) {
  const anyFilled = AUTO_FIELDS.some((f) => draft[f]?.trim())

  return (
    <Section title="Propriedades">
      {!anyFilled && (
        <p className="text-sm text-stone-400">
          Preencha a espécie e use "Buscar dados do mineral" para trazer fórmula, dureza, sistema cristalino e o resto
          do catálogo.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {AUTO_FIELDS.map((key) => {
          const isAuto = autoFields.includes(key)
          return (
            <label key={key} className="block">
              <span className="flex items-center gap-1 text-sm text-stone-300">
                {AUTO_FIELD_LABELS[key]}
                {!isAuto && draft[key]?.trim() && (
                  <button
                    type="button"
                    title="Voltar ao valor do catálogo"
                    aria-label="Voltar ao valor do catálogo"
                    onClick={() => onRestoreAuto(key)}
                    className="text-stone-500 hover:text-amber-500"
                  >
                    <RestoreAutoIcon />
                  </button>
                )}
              </span>
              <input
                value={draft[key] ?? ''}
                onChange={(e) => {
                  set(key)(e.target.value)
                  if (isAuto) onManualEdit(key)
                }}
                className={`input mt-1 ${isAuto ? 'border-l-2 border-l-amber-600' : ''}`}
              />
            </label>
          )
        })}
      </div>
    </Section>
  )
}

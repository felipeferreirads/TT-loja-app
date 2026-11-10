import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, SpecimenIcon, TrashIcon } from '../../../components/icons'
import { HintSelect } from '../../../components/HintSelect'
import { InfoTooltip } from '../../../components/InfoTooltip'
import { SuggestInput } from '../../../components/SuggestInput'
import { usePortalDropdown } from '../../../components/usePortalDropdown'
import { Section } from './Field'
import {
  COMMON_ROCK_NAMES,
  ROCK_CEMENTS,
  ROCK_COLOR_INDEXES,
  ROCK_HCL_REACTIONS,
  ROCK_ROLES,
  ROCK_ROUNDNESS,
  ROCK_STRUCTURES,
  ROCK_TEXTURES,
  ROCK_TYPES,
  ROCK_VISIBLE,
  emptyRockRow,
  grainSizeOptions,
  splitList,
  subtypeOptions,
  type RockOption,
  type RockRowDraft,
} from './rockFields'

/**
 * "Rochas da amostra" (0032) — mesmo modelo de `specimen_rocks` do catálogo
 * pessoal: o produto pode ter mais de uma rocha (matriz, hospedeira, clasto…),
 * todas preenchidas à mão (sem catálogo de referência). Cada opção das listas
 * traz o seu ícone de informação (ⓘ) com a explicação do termo. Persistido em
 * `store_product_rocks`; este componente é só a UI — quem carrega/salva é
 * `ProductPage.tsx`, junto do "Salvar" do produto.
 */
export function RocksInSampleSection({ rocks, onChange }: { rocks: RockRowDraft[]; onChange: (rows: RockRowDraft[]) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(rocks.length > 0 ? [rocks[0].key] : []))

  const updateAt = (key: string, patch: Partial<RockRowDraft>) => onChange(rocks.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const add = () => {
    const next = emptyRockRow()
    onChange([...rocks, next])
    setExpanded((prev) => new Set(prev).add(next.key))
  }
  const remove = (key: string) => onChange(rocks.filter((r) => r.key !== key))
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <Section title="Rochas da amostra" icon={<SpecimenIcon />}>
      <p className="text-xs text-stone-500">Registre as rochas presentes no item. Os campos são preenchidos manualmente.</p>
      {rocks.map((r, i) => {
        const open = expanded.has(r.key)
        const title = r.name.trim() || ROCK_TYPES.find((t) => t.value === r.rock_type)?.label || `Rocha ${i + 1}`
        return (
          <div key={r.key} className="rounded-lg border border-stone-800">
            <div className="flex items-center gap-2 px-3 py-2">
              <button type="button" onClick={() => toggle(r.key)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <SpecimenIcon className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="flex-1 truncate text-sm text-stone-200">{title}</span>
                {open ? <ChevronDownIcon className="shrink-0 text-stone-400" /> : <ChevronRightIcon className="shrink-0 text-stone-400" />}
              </button>
              <button
                type="button"
                onClick={() => remove(r.key)}
                title="Remover rocha"
                aria-label="Remover rocha"
                className="btn-danger h-8 min-h-0 w-8 shrink-0 p-0"
              >
                <TrashIcon width="1.25em" height="1.25em" />
              </button>
            </div>
            {open && <RockFields row={r} onPatch={(patch) => updateAt(r.key, patch)} />}
          </div>
        )
      })}
      <button type="button" onClick={add} className="btn-secondary">
        <PlusIcon /> Adicionar rocha
      </button>
    </Section>
  )
}

function Shell({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`block w-full ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs text-stone-400">{label}</span>
      {children}
    </div>
  )
}

function Select({ label, value, options, onChange, disabled }: { label: string; value: string; options: RockOption[]; onChange: (v: string) => void; disabled?: boolean }) {
  return <HintSelect value={value} options={options.map((x) => ({ ...x, indent: x.value === 'septarian_concretion' }))} onChange={onChange} disabled={disabled} ariaLabel={label} />
}

function RockFields({ row, onPatch }: { row: RockRowDraft; onPatch: (patch: Partial<RockRowDraft>) => void }) {
  const nameSuggestions = async (q: string) => {
    const term = q.trim().toLowerCase()
    return COMMON_ROCK_NAMES.filter((n) => n.toLowerCase().includes(term)).slice(0, 8)
  }
  return (
    <div className="grid grid-cols-1 gap-3 border-t border-stone-800 p-3 sm:grid-cols-2">
      <Shell label="Nome da rocha">
        <div>
          <SuggestInput value={row.name} onChange={(v) => onPatch({ name: v })} fetchSuggestions={nameSuggestions} placeholder="Ex.: Granito" minChars={1} />
        </div>
      </Shell>
      <Shell label="Papel na amostra">
        <Select label="Papel na amostra" value={row.role} options={ROCK_ROLES} onChange={(v) => onPatch({ role: v })} />
      </Shell>
      <Shell label="Tipo">
        <Select label="Tipo" value={row.rock_type} options={ROCK_TYPES} onChange={(v) => onPatch({ rock_type: v })} />
      </Shell>
      <Shell label="Subtipo / origem">
        <Select label="Subtipo / origem" value={row.subtype} options={subtypeOptions(row.rock_type)} onChange={(v) => onPatch({ subtype: v })} disabled={!row.rock_type} />
        {!row.rock_type && <p className="mt-1 text-xs text-stone-500">Selecione o tipo</p>}
      </Shell>
      <Shell label="Granulação">
        <Select label="Granulação" value={row.grain_size} options={grainSizeOptions(row.rock_type)} onChange={(v) => onPatch({ grain_size: v })} />
      </Shell>
      <Shell label="Estrutura">
        <Select label="Estrutura" value={row.structure} options={ROCK_STRUCTURES} onChange={(v) => onPatch({ structure: v })} />
      </Shell>
      <Shell label="Textura" wide>
        <TextureSelect value={splitList(row.texture)} onChange={(next) => onPatch({ texture: next.join(', ') })} />
      </Shell>
      {ROCK_VISIBLE.color_index(row) && (
        <Shell label="Índice de cor">
          <Select label="Índice de cor" value={row.color_index} options={ROCK_COLOR_INDEXES} onChange={(v) => onPatch({ color_index: v })} />
        </Shell>
      )}
      {ROCK_VISIBLE.hcl_reaction(row) && (
        <Shell label="Reação ao HCl">
          <Select label="Reação ao HCl" value={row.hcl_reaction} options={ROCK_HCL_REACTIONS} onChange={(v) => onPatch({ hcl_reaction: v })} />
        </Shell>
      )}
      {ROCK_VISIBLE.protolith(row) && (
        <Shell label="Protólito">
          <div className="relative">
            <input value={row.protolith} onChange={(e) => onPatch({ protolith: e.target.value })} placeholder="Ex.: Calcário" className="input" style={{ paddingRight: '2rem' }} />
            <span className="absolute inset-y-0 right-2 flex items-center">
              <InfoTooltip
                text="Rocha original antes do metamorfismo. Exemplos: calcário originou mármore, arenito originou quartzito, granito originou gnaisse. Em muitos casos só é possível inferir."
                iconClassName="h-3.5 w-3.5"
              />
            </span>
          </div>
        </Shell>
      )}
      {ROCK_VISIBLE.cement(row) && (
        <Shell label="Cimento">
          <Select label="Cimento" value={row.cement} options={ROCK_CEMENTS} onChange={(v) => onPatch({ cement: v })} />
        </Shell>
      )}
      {ROCK_VISIBLE.grain_roundness(row) && (
        <Shell label="Arredondamento dos grãos">
          <Select label="Arredondamento dos grãos" value={row.grain_roundness} options={ROCK_ROUNDNESS} onChange={(v) => onPatch({ grain_roundness: v })} />
        </Shell>
      )}
      {ROCK_VISIBLE.crater(row) && (
        <Shell label="Cratera / campo de dispersão" wide>
          <div className="relative">
            <input value={row.crater} onChange={(e) => onPatch({ crater: e.target.value })} placeholder="Ex.: Ries (Alemanha)" className="input" style={{ paddingRight: '2rem' }} />
            <span className="absolute inset-y-0 right-2 flex items-center">
              <InfoTooltip
                text="Estrutura de impacto que originou o material, ou região onde ele foi espalhado. Exemplo: as moldavitas vêm da cratera de Ries, na Alemanha."
                iconClassName="h-3.5 w-3.5"
              />
            </span>
          </div>
        </Shell>
      )}
      <Shell label="Observações" wide>
        <textarea value={row.notes} onChange={(e) => onPatch({ notes: e.target.value })} rows={2} className="input" />
      </Shell>
    </div>
  )
}

/** Textura é multivalor: lista de opções com caixa de marcar e o ⓘ de cada uma, num painel em portal. */
function TextureSelect({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const { boxRef, menuRef, menuRect } = usePortalDropdown(open, () => setOpen(false))
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const labelOf = (v: string) => ROCK_TEXTURES.find((t) => t.value === v)?.label ?? v
  return (
    <div ref={boxRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="input flex min-h-[2.5rem] w-full flex-wrap items-center gap-1 text-left" aria-expanded={open}>
        {value.length === 0 && <span className="text-stone-500">Textura</span>}
        {value.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full bg-stone-700 px-2 py-0.5 text-xs text-stone-200">
            {labelOf(v)}
            <span
              role="button"
              title="Remover"
              onClick={(e) => {
                e.stopPropagation()
                toggle(v)
              }}
              className="cursor-pointer text-stone-400 hover:text-stone-100"
            >
              ✕
            </span>
          </span>
        ))}
        <span className="ml-auto text-stone-500">{open ? '▴' : '▾'}</span>
      </button>
      {open &&
        menuRect &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
            className="fixed z-50 max-h-64 overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 p-2 shadow-xl"
          >
            {ROCK_TEXTURES.map((t) => (
              <div key={t.value} className="flex items-center gap-1">
                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-stone-200 hover:bg-stone-800">
                  <input type="checkbox" checked={value.includes(t.value)} onChange={() => toggle(t.value)} className="accent-amber-600" />
                  {t.label}
                </label>
                <InfoTooltip text={t.hint} iconClassName="h-3.5 w-3.5" className="mr-1 text-stone-500 hover:text-stone-300" />
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

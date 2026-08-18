import { useState } from 'react'
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon, StackIcon } from '../../../components/icons'
import type { StoreProductFossilSpecies, StoreProductFossilSpeciesInput } from '../../../types/db'
import { Field, Section } from './Field'

/**
 * Taxonomia de fóssil MULTI-ESPÉCIE (18/08/2026, reverte a simplificação
 * anterior de "uma espécie só por produto") — mesmo modelo de `fossil_species`
 * do catálogo pessoal: o produto pode ser um lote com várias espécies, cada
 * uma com sua própria taxonomia, nome popular e contagem de itens. Persistido
 * numa tabela à parte (`store_product_fossil_species`); este componente é só
 * a UI — quem carrega/salva de verdade é `ProductPage.tsx` (reconcilia contra
 * `fetchFossilSpecies`/`addFossilSpecies`/`updateFossilSpecies`/
 * `removeFossilSpecies` num único ponto, junto do "Salvar" do produto).
 */
export interface FossilSpeciesDraft {
  /** Chave estável de UI (React key) — nunca vai pro banco. */
  key: string
  /** Presente só quando a linha já existe em `store_product_fossil_species`. */
  id?: string
  name: string
  popular_name: string
  item_count: string
  kingdom: string
  taxon_type: string
  phylum: string
  taxon_class: string
  taxon_order: string
  family: string
  clades: string
  formation: string
  period_era: string
  age: string
}

export function emptyFossilSpecies(): FossilSpeciesDraft {
  return {
    key: crypto.randomUUID(),
    name: '',
    popular_name: '',
    item_count: '1',
    kingdom: '',
    taxon_type: '',
    phylum: '',
    taxon_class: '',
    taxon_order: '',
    family: '',
    clades: '',
    formation: '',
    period_era: '',
    age: '',
  }
}

export function fossilSpeciesToDraft(row: StoreProductFossilSpecies): FossilSpeciesDraft {
  return {
    key: row.id,
    id: row.id,
    name: row.name ?? '',
    popular_name: row.popular_name ?? '',
    item_count: row.item_count != null ? String(row.item_count) : '1',
    kingdom: row.kingdom ?? '',
    taxon_type: row.taxon_type ?? '',
    phylum: row.phylum ?? '',
    taxon_class: row.taxon_class ?? '',
    taxon_order: row.taxon_order ?? '',
    family: row.family ?? '',
    clades: row.clades ?? '',
    formation: row.formation ?? '',
    period_era: row.period_era ?? '',
    age: row.age ?? '',
  }
}

export function fossilSpeciesToInput(d: FossilSpeciesDraft): StoreProductFossilSpeciesInput {
  return {
    name: d.name.trim() || null,
    popular_name: d.popular_name.trim() || null,
    item_count: d.item_count.trim() === '' ? null : Number(d.item_count),
    kingdom: d.kingdom.trim() || null,
    taxon_type: d.taxon_type.trim() || null,
    phylum: d.phylum.trim() || null,
    taxon_class: d.taxon_class.trim() || null,
    taxon_order: d.taxon_order.trim() || null,
    family: d.family.trim() || null,
    clades: d.clades.trim() || null,
    formation: d.formation.trim() || null,
    period_era: d.period_era.trim() || null,
    age: d.age.trim() || null,
  }
}

export function FossilTaxonomySection({
  species,
  onChange,
}: {
  species: FossilSpeciesDraft[]
  onChange: (species: FossilSpeciesDraft[]) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(species.length > 0 ? [species[0].key] : []))

  const updateAt = (key: string, patch: Partial<FossilSpeciesDraft>) =>
    onChange(species.map((s) => (s.key === key ? { ...s, ...patch } : s)))

  const addSpecies = () => {
    const next = emptyFossilSpecies()
    onChange([...species, next])
    setExpanded((prev) => new Set(prev).add(next.key))
  }

  const removeSpecies = (key: string) => onChange(species.filter((s) => s.key !== key))

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <Section title="Taxonomia e idade" icon={<StackIcon />}>
      <p className="text-xs text-stone-500">
        Uma peça pode reunir várias espécies (lote/placa) — cada uma com sua própria taxonomia e contagem de itens.
      </p>

      <div className="space-y-2">
        {species.map((s) => {
          const isOpen = expanded.has(s.key)
          return (
            <div key={s.key} className="rounded-lg border border-stone-800">
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => toggle(s.key)}
                  aria-label={isOpen ? 'Recolher' : 'Expandir'}
                  className="tap-icon shrink-0 bg-stone-800 text-stone-300"
                >
                  {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                </button>
                <input
                  value={s.name}
                  onChange={(e) => updateAt(s.key, { name: e.target.value })}
                  placeholder="Espécie (nome científico)"
                  className="input flex-1"
                />
                <input
                  value={s.item_count}
                  onChange={(e) => updateAt(s.key, { item_count: e.target.value })}
                  type="number"
                  min="1"
                  title="Quantidade de itens desta espécie"
                  placeholder="Qtd."
                  className="input w-20 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => removeSpecies(s.key)}
                  title="Remover espécie"
                  aria-label="Remover espécie"
                  className="tap-icon shrink-0 bg-stone-800 text-red-400 hover:bg-red-950/60"
                >
                  <TrashIcon />
                </button>
              </div>

              {isOpen && (
                <div className="space-y-3 border-t border-stone-800 p-3">
                  <Field label="Nome popular" value={s.popular_name} onChange={(v) => updateAt(s.key, { popular_name: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Reino" value={s.kingdom} onChange={(v) => updateAt(s.key, { kingdom: v })} />
                    <Field
                      label="Tipo"
                      value={s.taxon_type}
                      onChange={(v) => updateAt(s.key, { taxon_type: v })}
                      placeholder="Invertebrado / Vertebrado"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Filo" value={s.phylum} onChange={(v) => updateAt(s.key, { phylum: v })} />
                    <Field label="Classe" value={s.taxon_class} onChange={(v) => updateAt(s.key, { taxon_class: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ordem" value={s.taxon_order} onChange={(v) => updateAt(s.key, { taxon_order: v })} />
                    <Field label="Família" value={s.family} onChange={(v) => updateAt(s.key, { family: v })} />
                  </div>
                  <Field
                    label="Clados"
                    value={s.clades}
                    onChange={(v) => updateAt(s.key, { clades: v })}
                    placeholder="Ex.: Theropoda › Coelurosauria"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Formação" value={s.formation} onChange={(v) => updateAt(s.key, { formation: v })} />
                    <Field label="Período/Era" value={s.period_era} onChange={(v) => updateAt(s.key, { period_era: v })} />
                    <Field label="Idade" value={s.age} onChange={(v) => updateAt(s.key, { age: v })} />
                  </div>
                </div>
              )}

              {!isOpen && (s.popular_name || s.phylum || s.taxon_class) && (
                <p className="truncate px-3 pb-2 text-xs text-stone-500">
                  {[s.popular_name, s.phylum, s.taxon_class].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <button type="button" onClick={addSpecies} className="btn-secondary gap-1.5">
        <PlusIcon /> Adicionar espécie
      </button>

      {species.length === 0 && <p className="text-sm text-stone-400">Nenhuma espécie adicionada ainda.</p>}
    </Section>
  )
}

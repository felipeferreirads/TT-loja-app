import { Field, Section } from './Field'
import type { Draft } from './draft'

/**
 * Taxonomia do fóssil. O catálogo pessoal guarda uma lista de espécies por
 * amostra (`fossil_species`); aqui é uma espécie só, em colunas da própria
 * `store_products` — produto de loja é registro mais raso.
 */
export function FossilTaxonomySection({
  draft,
  set,
}: {
  draft: Draft
  set: (key: string) => (v: string) => void
}) {
  return (
    <Section title="Taxonomia e idade">
      <Field label="Nome popular" value={draft.popular_name} onChange={set('popular_name')} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Filo" value={draft.phylum} onChange={set('phylum')} />
        <Field label="Classe" value={draft.taxon_class} onChange={set('taxon_class')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ordem" value={draft.taxon_order} onChange={set('taxon_order')} />
        <Field label="Família" value={draft.family} onChange={set('family')} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Formação" value={draft.formation} onChange={set('formation')} />
        <Field label="Período/Era" value={draft.period_era} onChange={set('period_era')} />
        <Field label="Idade" value={draft.age} onChange={set('age')} />
      </div>
    </Section>
  )
}

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon, StackIcon } from '../../../components/icons'
import type { StoreProductFossilSpecies, StoreProductFossilSpeciesInput } from '../../../types/db'
import { fetchFossilSpeciesCatalog } from '../api'
import {
  formatStratRange,
  isSpeciesLevel,
  lookupFossilTaxonomy,
  RANK_LABEL,
  TAXON_SOURCE_LABEL,
} from '../../../lib/fossilLookup'
import { Field, Labeled, Section } from './Field'

/**
 * Taxonomia de fóssil MULTI-ESPÉCIE (18/08/2026, reverte a simplificação
 * anterior de "uma espécie só por produto") — mesmo modelo de `fossil_species`
 * do catálogo pessoal: o produto pode ser um lote com várias espécies, cada
 * uma com sua própria taxonomia, nome popular e contagem de itens. Persistido
 * numa tabela à parte (`store_product_fossil_species`); este componente é só
 * a UI — quem carrega/salva de verdade é `ProductPage.tsx` (reconcilia contra
 * `fetchFossilSpecies`/`addFossilSpecies`/`updateFossilSpecies`/
 * `removeFossilSpecies` num único ponto, junto do "Salvar" do produto).
 *
 * Layout e botão "🔎 Taxonomia" espelham `SpecimenFormPage.tsx` do catálogo
 * pessoal (claude.md §2): nome+quantidade numa linha [1fr, 5rem], ações
 * (buscar taxonomia / remover) na linha seguinte, depois nome popular,
 * taxonomia (Reino/Tipo em select, Filo/Classe/Ordem/Família em texto livre)
 * e por fim clados/formação/período/idade.
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

const KINGDOM_OPTIONS = ['Animalia', 'Plantae', 'Fungi', 'Chromista', 'Protozoa', 'Bacteria', 'Archaea']
const TAXON_TYPE_OPTIONS = ['Invertebrado', 'Vertebrado']

/** Chaves de taxonomia que o botão "🔎 Taxonomia" preenche — mesma ordem de
 *  exibição dos campos (Reino → Filo → Classe → Ordem → Família → Tipo). */
const TAXONOMY_KEYS = ['kingdom', 'phylum', 'taxon_class', 'taxon_order', 'family', 'taxon_type'] as const
const TAXONOMY_FIELD_LABEL: Record<(typeof TAXONOMY_KEYS)[number], string> = {
  kingdom: 'Reino',
  phylum: 'Filo',
  taxon_class: 'Classe',
  taxon_order: 'Ordem',
  family: 'Família',
  taxon_type: 'Tipo',
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
  const [msg, setMsg] = useState<Record<string, string>>({})

  // Catálogo de espécies já cadastradas em QUALQUER produto — 1ª camada da
  // busca de taxonomia (instantânea, respeita o que o dono já digitou antes
  // de consultar PBDB/GBIF). Ver claude.md §4 do catálogo pessoal
  // (lookupFossilTaxonomy) pro raciocínio completo das camadas.
  const { data: catalogRows } = useQuery({ queryKey: ['fossil-species-catalog'], queryFn: fetchFossilSpeciesCatalog })
  const catalog = useMemo(() => {
    const seen = new Map<string, Partial<FossilSpeciesDraft>>()
    for (const row of catalogRows ?? []) {
      const key = row.name?.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      const taxonomy: Partial<FossilSpeciesDraft> = {}
      if (row.popular_name) taxonomy.popular_name = row.popular_name
      if (row.kingdom) taxonomy.kingdom = row.kingdom
      if (row.taxon_type) taxonomy.taxon_type = row.taxon_type
      if (row.phylum) taxonomy.phylum = row.phylum
      if (row.taxon_class) taxonomy.taxon_class = row.taxon_class
      if (row.taxon_order) taxonomy.taxon_order = row.taxon_order
      if (row.family) taxonomy.family = row.family
      if (row.clades) taxonomy.clades = row.clades
      seen.set(key, taxonomy)
    }
    return seen
  }, [catalogRows])

  const updateAt = (key: string, patch: Partial<FossilSpeciesDraft>) =>
    onChange(species.map((s) => (s.key === key ? { ...s, ...patch } : s)))

  /** Só preenche o que ainda está VAZIO — nunca sobrescreve o que o dono já digitou. */
  const fillEmpty = (row: FossilSpeciesDraft, patch: Partial<FossilSpeciesDraft>) => {
    const filtered: Partial<FossilSpeciesDraft> = {}
    for (const [k, v] of Object.entries(patch) as [keyof FossilSpeciesDraft, string][]) {
      if (v && !row[k]?.trim()) filtered[k] = v
    }
    if (Object.keys(filtered).length > 0) updateAt(row.key, filtered)
    return filtered
  }

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

  /** Camadas: 1ª a própria loja (instantânea, sem ida ao servidor); 2ª a
   *  Edge Function "fossil-taxonomy" (PBDB + GBIF). */
  const handleLookup = async (row: FossilSpeciesDraft) => {
    const target = row.name.trim()
    if (!target) return

    const local = catalog.get(target.toLowerCase())
    if (local && Object.keys(local).length > 0) {
      const filled = fillEmpty(row, local)
      setMsg((m) => ({
        ...m,
        [row.key]:
          Object.keys(filled).length > 0
            ? 'Copiado de outro item já cadastrado na loja.'
            : 'Já cadastrado na loja, mas sem nada novo pra preencher.',
      }))
      return
    }

    setMsg((m) => ({ ...m, [row.key]: 'Buscando…' }))
    const { data, error } = await lookupFossilTaxonomy(target)
    if (!data) {
      setMsg((m) => ({ ...m, [row.key]: error ?? 'Não encontrado.' }))
      return
    }

    const patch: Partial<FossilSpeciesDraft> = {}
    const filledLabels: string[] = []
    for (const key of TAXONOMY_KEYS) {
      const incoming = data.info[key]
      if (incoming && !row[key].trim()) {
        patch[key] = incoming
        filledLabels.push(`${TAXONOMY_FIELD_LABEL[key]} (${TAXON_SOURCE_LABEL[data.origin[key] ?? 'pbdb']})`)
      }
    }
    // O campo "Espécie" guarda espécie ou gênero. Se o nome digitado era de um
    // nível maior (família, ordem, classe…), o valor já foi pro campo próprio
    // acima — deixá-lo aqui também duplicaria e faria a ficha exibir uma
    // família como se fosse a espécie.
    const promoted = !isSpeciesLevel(data.rank)
    if (promoted) patch.name = ''
    if (Object.keys(patch).length > 0) updateAt(row.key, patch)

    const strat = formatStratRange(data.range)
    const found = data.matchedName ? `"${data.matchedName}"` : target
    const translatedNote = data.queried.toLowerCase() !== target.toLowerCase() ? ` (busquei por "${data.queried}")` : ''
    const promotedNote = promoted && data.rank ? ` — nome promovido a ${RANK_LABEL[data.rank]}` : ''
    const head =
      filledLabels.length > 0
        ? `Encontrado ${found}${translatedNote}${promotedNote}: preenchi ${filledLabels.join(', ')}.`
        : `Encontrado ${found}${translatedNote}${promotedNote}, mas nada novo pra preencher.`
    setMsg((m) => ({ ...m, [row.key]: strat ? `${head} Alcance: ${strat}.` : head }))
  }

  return (
    <Section title="Espécie(s) e taxonomia" icon={<StackIcon />}>
      <p className="text-xs text-stone-500">
        Uma peça pode reunir várias espécies (lote/placa) — cada uma com sua própria taxonomia e contagem de itens.
      </p>

      <div className="space-y-2">
        {species.map((s) => {
          const isOpen = expanded.has(s.key)
          return (
            <div key={s.key} className="rounded-lg border border-stone-800 p-3">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => toggle(s.key)}
                  aria-label={isOpen ? 'Recolher' : 'Expandir'}
                  className="tap-icon mt-6 shrink-0 bg-stone-800 text-stone-300"
                >
                  {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                </button>

                <div className="min-w-0 flex-1 space-y-3">
                  {/* Espécie e quantidade — responsivo, mesma proporção do catálogo pessoal. */}
                  <div className="grid gap-3 sm:grid-cols-[1fr_5rem]">
                    <Field
                      label="Espécie (nome científico)"
                      value={s.name}
                      onChange={(v) => updateAt(s.key, { name: v })}
                    />
                    <Field
                      label="Qtd."
                      value={s.item_count}
                      onChange={(v) => updateAt(s.key, { item_count: v })}
                      type="number"
                    />
                  </div>

                  {isOpen && (
                    <>
                      {/* Botões de ação */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleLookup(s)}
                          disabled={!s.name.trim()}
                          title="Busca a taxonomia: na sua loja primeiro, depois PBDB/GBIF. Aceita nome científico em qualquer nível e nome popular."
                          className="btn-secondary min-w-fit flex-1 disabled:opacity-50 sm:flex-none"
                        >
                          🔎 Taxonomia
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSpecies(s.key)}
                          title="Remover espécie"
                          aria-label="Remover espécie"
                          className="btn-danger shrink-0"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-stone-500">
                        O botão "🔎 Taxonomia" busca a taxonomia primeiro na sua própria loja (outro fóssil já
                        cadastrado com a mesma espécie) e, se não encontrar, num banco de dados externo (PBDB/GBIF).
                      </p>

                      {msg[s.key] && <p className="text-xs text-stone-400">{msg[s.key]}</p>}

                      <Field label="Nome popular" value={s.popular_name} onChange={(v) => updateAt(s.key, { popular_name: v })} />

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Labeled label="Reino">
                          <select
                            value={s.kingdom}
                            onChange={(e) => updateAt(s.key, { kingdom: e.target.value })}
                            className="input mt-1"
                          >
                            <option value="">—</option>
                            {KINGDOM_OPTIONS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </Labeled>
                        <Field label="Filo" value={s.phylum} onChange={(v) => updateAt(s.key, { phylum: v })} />
                        <Field label="Classe" value={s.taxon_class} onChange={(v) => updateAt(s.key, { taxon_class: v })} />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Field label="Ordem" value={s.taxon_order} onChange={(v) => updateAt(s.key, { taxon_order: v })} />
                        <Field label="Família" value={s.family} onChange={(v) => updateAt(s.key, { family: v })} />
                        {/* "Tipo" (Invertebrado/Vertebrado) só faz sentido dentro de Animalia —
                            desabilitado (sem apagar valor já gravado) nos demais reinos. */}
                        <label className={`block ${s.kingdom === 'Animalia' ? '' : 'opacity-50'}`}>
                          <span className="text-sm text-stone-300">Tipo</span>
                          <select
                            value={s.taxon_type}
                            onChange={(e) => updateAt(s.key, { taxon_type: e.target.value })}
                            disabled={s.kingdom !== 'Animalia'}
                            title={s.kingdom === 'Animalia' ? undefined : 'Só se aplica dentro de Animalia'}
                            className={`input mt-1 ${s.kingdom === 'Animalia' ? '' : 'cursor-not-allowed'}`}
                          >
                            <option value="">—</option>
                            {TAXON_TYPE_OPTIONS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <Field
                        label="Clados"
                        value={s.clades}
                        onChange={(v) => updateAt(s.key, { clades: v.replace(/,\s*/g, ' > ') })}
                        placeholder="Ex.: Theropoda > Coelurosauria"
                      />

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Field label="Formação" value={s.formation} onChange={(v) => updateAt(s.key, { formation: v })} />
                        <Field label="Período/Era" value={s.period_era} onChange={(v) => updateAt(s.key, { period_era: v })} />
                        <Field label="Idade" value={s.age} onChange={(v) => updateAt(s.key, { age: v })} />
                      </div>
                    </>
                  )}

                  {!isOpen && (s.popular_name || s.phylum || s.taxon_class) && (
                    <p className="truncate text-xs text-stone-500">
                      {[s.popular_name, s.phylum, s.taxon_class].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
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

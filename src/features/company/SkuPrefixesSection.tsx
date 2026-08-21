import { useEffect, useState } from 'react'
import { ITEM_KIND_LABELS, type StoreItemKind, type StoreSkuPrefix } from '../../types/db'
import { DEFAULT_KIND_PREFIX, DEFAULT_GEM_PREFIX, DEFAULT_DIGITS, fetchSkuPrefixes, upsertSkuPrefix, deleteSkuPrefix } from '../products/skuPrefixes'
import { useConfirm } from '../../components/DialogProvider'
import { PlusIcon, TagIcon, TrashIcon } from '../../components/icons'

const KINDS = Object.keys(ITEM_KIND_LABELS) as StoreItemKind[]

/**
 * Prefixos de SKU (0020) — um padrão por tipo (`MIN-0001`) e prefixos
 * customizados por espécie (`OPL-0001` pra opala), usados pelo autofill do
 * formulário de produto (sem botão, ver `ProductPage.tsx`). Vive em Empresa
 * por ser a única tela de configuração que a loja tem hoje.
 */
export function SkuPrefixesSection() {
  const [prefixes, setPrefixes] = useState<StoreSkuPrefix[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newKind, setNewKind] = useState<StoreItemKind>('mineral')
  const [newSpecies, setNewSpecies] = useState('')
  const [newPrefix, setNewPrefix] = useState('')
  const confirm = useConfirm()

  const load = () => fetchSkuPrefixes().then(setPrefixes).catch((err) => setError(err instanceof Error ? err.message : String(err)))

  useEffect(() => {
    load()
  }, [])

  if (!prefixes) return null

  const typeDefault = (kind: StoreItemKind) => prefixes.find((p) => p.kind === kind && p.match_key === '' && !p.is_gem)
  const gemDefault = () => prefixes.find((p) => p.kind === 'mineral' && p.match_key === '' && p.is_gem)
  const speciesRows = prefixes.filter((p) => p.match_key !== '')

  const saveTypeDefault = async (kind: StoreItemKind, prefix: string) => {
    setError(null)
    try {
      await upsertSkuPrefix({ ...typeDefault(kind), kind, match_key: '', is_gem: false, prefix: prefix.trim() || DEFAULT_KIND_PREFIX[kind], digits: typeDefault(kind)?.digits ?? DEFAULT_DIGITS })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  /** Prefixo padrão de GEMA (0021) — mineral com `is_gem=true`; tem
   *  prioridade sobre o padrão comum de mineral, mas espécie customizada
   *  (ex. OPL) continua vencendo os dois. */
  const saveGemDefault = async (prefix: string) => {
    setError(null)
    try {
      await upsertSkuPrefix({
        ...gemDefault(),
        kind: 'mineral',
        match_key: '',
        is_gem: true,
        prefix: prefix.trim() || DEFAULT_GEM_PREFIX,
        digits: gemDefault()?.digits ?? DEFAULT_DIGITS,
      })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleAddSpecies = async () => {
    const species = newSpecies.trim()
    const prefix = newPrefix.trim()
    if (!species || !prefix) return
    setError(null)
    try {
      await upsertSkuPrefix({ kind: newKind, match_key: species, prefix, digits: DEFAULT_DIGITS })
      setNewSpecies('')
      setNewPrefix('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleRemove = async (row: StoreSkuPrefix) => {
    if (!(await confirm(`Remover o prefixo "${row.prefix}" (${row.match_key})?`))) return
    await deleteSkuPrefix(row.id)
    load()
  }

  return (
    <section className="space-y-3 rounded-xl border border-stone-800 bg-stone-900/20 p-5">
      <div className="flex items-center gap-2">
        <TagIcon className="h-4 w-4 text-stone-400" />
        <h2 className="font-medium text-stone-200">Prefixos de SKU</h2>
      </div>
      <p className="text-xs text-stone-500">
        O SKU é sugerido sozinho ao criar um produto (tipo/espécie → prefixo → próximo número), sem precisar apertar em
        nada. O campo continua editável — sobrescrever à mão substitui a sugestão.
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Padrão por tipo</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {KINDS.map((kind) => (
            <label key={kind} className="flex flex-col gap-1 text-xs text-stone-400">
              {ITEM_KIND_LABELS[kind]}
              <input
                type="text"
                maxLength={8}
                defaultValue={typeDefault(kind)?.prefix ?? DEFAULT_KIND_PREFIX[kind]}
                onBlur={(e) => {
                  const value = e.target.value.trim().toUpperCase() || DEFAULT_KIND_PREFIX[kind]
                  e.target.value = value
                  if (value !== (typeDefault(kind)?.prefix ?? DEFAULT_KIND_PREFIX[kind])) void saveTypeDefault(kind, value)
                }}
                className="input"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-xs text-stone-400">
            Gema
            <input
              type="text"
              maxLength={8}
              defaultValue={gemDefault()?.prefix ?? DEFAULT_GEM_PREFIX}
              onBlur={(e) => {
                const value = e.target.value.trim().toUpperCase() || DEFAULT_GEM_PREFIX
                e.target.value = value
                if (value !== (gemDefault()?.prefix ?? DEFAULT_GEM_PREFIX)) void saveGemDefault(value)
              }}
              className="input"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          "Gema" não é um tipo — é o mineral marcado como gema (checkbox "É gema") na ficha. Tem prioridade sobre o
          prefixo padrão de mineral, mas uma espécie customizada abaixo (ex.: opala → OPL) continua vencendo os dois.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Personalizados por espécie</h3>
        {speciesRows.length === 0 && <p className="text-sm text-stone-500">Nenhum ainda — ex.: opala → OPL.</p>}
        <div className="space-y-1">
          {speciesRows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-2 rounded-lg border border-stone-800 px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-stone-200">
                <span className="text-stone-500">{ITEM_KIND_LABELS[row.kind]} · </span>
                {row.match_key} <span className="text-stone-500">→</span> <span className="font-mono text-amber-500">{row.prefix}</span>
              </span>
              <button
                type="button"
                onClick={() => void handleRemove(row)}
                className="shrink-0 text-stone-500 hover:text-red-400"
                aria-label="Remover prefixo"
                title="Remover"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-stone-400">
            Tipo
            <select value={newKind} onChange={(e) => setNewKind(e.target.value as StoreItemKind)} className="input">
              {KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {ITEM_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-stone-400">
            Espécie (ex.: Opala)
            <input
              type="text"
              value={newSpecies}
              onChange={(e) => setNewSpecies(e.target.value)}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone-400">
            Prefixo (ex.: OPL)
            <input
              type="text"
              maxLength={8}
              value={newPrefix}
              onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
              className="input w-24"
            />
          </label>
          <button type="button" onClick={() => void handleAddSpecies()} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-sm">
            <PlusIcon className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>
    </section>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAlert, usePrompt } from '../../components/DialogProvider'
import { CheckIcon, ChevronDownIcon, CloseIcon } from '../../components/icons'
import {
  createStorefront,
  createSupplier,
  fetchSuppliersWithStorefronts,
  storefrontLabel,
  SUPPLIERS_WITH_STOREFRONTS_KEY,
  type StoreSupplierWithStorefronts,
} from './api'

// Copiado do catálogo pessoal (`features/suppliers/SupplierPicker.tsx`), mesma
// interface; rótulos fixos em PT. A tabela `suppliers` é a mesma nos dois apps.

export interface SupplierValue {
  supplierId: string | null
  storefrontId: string | null
  /** Texto livre (fornecedor não cadastrado). Só usado quando `allowText`. */
  text: string
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** Casa um texto com nome OU apelido de um fornecedor (sem acento/caixa). */
export function matchSupplierByText(suppliers: StoreSupplierWithStorefronts[], text: string): StoreSupplierWithStorefronts | undefined {
  const q = normalize(text)
  if (!q) return undefined
  return suppliers.find((s) => [s.name, ...(s.aliases ?? [])].some((n) => normalize(n) === q))
}

/**
 * Seletor de fornecedor → loja, com texto livre opcional. Um único campo de
 * busca: digitar filtra os cadastrados (nome, apelidos, lojas); sem cadastro
 * correspondente, oferece "usar como texto livre" e "cadastrar". Com um
 * fornecedor escolhido, a loja vira um seletor dentro da mesma caixa.
 */
export function SupplierPicker({
  value,
  onChange,
  allowText = false,
}: {
  value: SupplierValue
  onChange: (v: SupplierValue) => void
  allowText?: boolean
}) {
  const alert = useAlert()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const { data: suppliers = [] } = useQuery({ queryKey: SUPPLIERS_WITH_STOREFRONTS_KEY, queryFn: fetchSuppliersWithStorefronts })
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [storeOpen, setStoreOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
        setStoreOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const selected = suppliers.find((s) => s.id === value.supplierId) ?? null
  const currentStorefront = selected?.storefronts.find((f) => f.id === value.storefrontId) ?? null

  const matches = useMemo(() => {
    const q = normalize(query)
    const list = q
      ? suppliers.filter((s) =>
          normalize([s.name, ...(s.aliases ?? []), ...s.storefronts.flatMap((f) => [f.name, f.marketplace ?? ''])].join(' ')).includes(q),
        )
      : suppliers
    return list.slice(0, 50)
  }, [suppliers, query])

  const textMatch = !selected && allowText && value.text ? matchSupplierByText(suppliers, value.text) : undefined

  const pick = (s: StoreSupplierWithStorefronts) => {
    onChange({ supplierId: s.id, storefrontId: s.storefronts.length === 1 ? s.storefronts[0].id : null, text: '' })
    setQuery('')
    setOpen(false)
  }

  const register = async (name: string) => {
    const n = name.trim()
    if (!n) return
    try {
      const created = await createSupplier({ name: n })
      const list = await queryClient.fetchQuery({ queryKey: SUPPLIERS_WITH_STOREFRONTS_KEY, queryFn: fetchSuppliersWithStorefronts, staleTime: 0 })
      const full = list.find((s) => s.id === created.id)
      if (full) pick(full)
    } catch (err) {
      await alert(err instanceof Error ? err.message : String(err))
    }
  }

  const addStorefront = async () => {
    if (!selected) return
    const name = await prompt('Nome da loja (ex.: Estelle Jewel):')
    if (!name?.trim()) return
    const marketplace = await prompt('Marketplace (ex.: Opal Auctions). Opcional:', '')
    if (marketplace === null) return
    try {
      const sf = await createStorefront(selected.id, { name: name.trim(), marketplace: marketplace.trim() || null })
      await queryClient.invalidateQueries({ queryKey: SUPPLIERS_WITH_STOREFRONTS_KEY })
      onChange({ ...value, storefrontId: sf.id })
    } catch (err) {
      await alert(err instanceof Error ? err.message : String(err))
    }
  }

  const trimmedQuery = query.trim()
  const exact = trimmedQuery ? matchSupplierByText(suppliers, trimmedQuery) : undefined

  return (
    <div ref={boxRef} className="relative space-y-2">
      {selected ? (
        <div className="input flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-[8rem] flex-1 truncate text-stone-100">{selected.name}</span>
          {selected.storefronts.length > 0 && (
            <div className="relative min-w-0 max-w-full shrink">
              <button
                type="button"
                onClick={() => setStoreOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={storeOpen}
                aria-label="Loja"
                className={`flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm transition ${
                  storeOpen
                    ? 'border-amber-600/70 bg-stone-800 text-stone-100'
                    : 'border-stone-700 bg-stone-800/60 text-stone-300 hover:border-stone-600 hover:text-stone-100'
                }`}
              >
                <span className={`truncate ${currentStorefront ? '' : 'text-stone-500'}`}>
                  {currentStorefront ? storefrontLabel(currentStorefront) : '(loja não informada)'}
                </span>
                <ChevronDownIcon className={`shrink-0 text-stone-500 transition-transform ${storeOpen ? 'rotate-180' : ''}`} />
              </button>
              {storeOpen && (
                <ul
                  role="listbox"
                  className="absolute top-full right-0 z-30 mt-1.5 max-h-64 w-max max-w-[min(20rem,80vw)] min-w-full overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-xl"
                >
                  {[null, ...selected.storefronts].map((sf) => {
                    const active = (sf?.id ?? null) === (value.storefrontId ?? null)
                    return (
                      <li key={sf?.id ?? 'none'} role="option" aria-selected={active}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange({ ...value, storefrontId: sf?.id ?? null })
                            setStoreOpen(false)
                          }}
                          className={`flex min-h-11 w-full items-center gap-2 rounded px-2 text-left text-sm sm:min-h-0 sm:py-1.5 ${
                            active ? 'bg-amber-600/15 text-amber-300' : 'text-stone-200 hover:bg-stone-800'
                          }`}
                        >
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className={`truncate ${sf ? '' : 'text-stone-500 italic'}`}>{sf ? sf.name : '(loja não informada)'}</span>
                            {sf?.marketplace && <span className="truncate text-xs text-stone-500">{sf.marketplace}</span>}
                          </span>
                          {active && <CheckIcon className="shrink-0" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={addStorefront}
            title="Adicionar loja"
            aria-label="Adicionar loja"
            className="rounded px-1.5 py-0.5 text-sm text-stone-400 hover:bg-stone-800 hover:text-amber-400"
          >
            {selected.storefronts.length > 0 ? '+' : '+ Loja'}
          </button>
          <button
            type="button"
            onClick={() => onChange({ supplierId: null, storefrontId: null, text: '' })}
            title="Limpar fornecedor"
            aria-label="Limpar fornecedor"
            className="text-stone-500 hover:text-stone-200"
          >
            <CloseIcon />
          </button>
        </div>
      ) : (
        <input
          value={open ? query : allowText ? value.text : query}
          onFocus={() => {
            setQuery(allowText ? value.text : '')
            setOpen(true)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (allowText) onChange({ supplierId: null, storefrontId: null, text: e.target.value })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (exact) pick(exact)
              else setOpen(false)
            } else if (e.key === 'Escape') setOpen(false)
          }}
          placeholder={allowText ? 'Buscar fornecedor ou digitar livremente…' : 'Buscar fornecedor cadastrado…'}
          className="input"
        />
      )}

      {open && !selected && (
        <div className="absolute top-full z-30 mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 shadow-xl">
          <div className="max-h-60 overflow-y-auto p-1">
            {matches.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="flex min-h-11 w-full flex-col items-start rounded px-2 text-left text-sm text-stone-200 hover:bg-stone-800 sm:min-h-0 sm:py-1.5"
              >
                <span>{s.name}</span>
                {s.storefronts.length > 0 && <span className="text-xs text-stone-500">{s.storefronts.map(storefrontLabel).join(', ')}</span>}
              </button>
            ))}
            {matches.length === 0 && <p className="px-2 py-2 text-sm text-stone-500">Nenhum fornecedor cadastrado corresponde.</p>}
          </div>
          {trimmedQuery && !exact && (
            <div className="border-t border-stone-800 p-1">
              {allowText && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center rounded px-2 text-left text-sm text-stone-300 hover:bg-stone-800 sm:min-h-0 sm:py-1.5"
                >
                  Usar "{trimmedQuery}" como texto livre
                </button>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void register(trimmedQuery)}
                className="flex min-h-11 w-full items-center rounded px-2 text-left text-sm text-amber-400 hover:bg-stone-800 sm:min-h-0 sm:py-1.5"
              >
                + Cadastrar "{trimmedQuery}" como fornecedor
              </button>
            </div>
          )}
        </div>
      )}

      {!selected && allowText && value.text && !open && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          <span>Texto livre (fornecedor não cadastrado).</span>
          {textMatch ? (
            <button type="button" onClick={() => pick(textMatch)} className="text-amber-400 hover:underline">
              Usar o cadastro "{textMatch.name}"
            </button>
          ) : (
            <button type="button" onClick={() => void register(value.text)} className="text-amber-400 hover:underline">
              Converter em cadastro
            </button>
          )}
        </p>
      )}
    </div>
  )
}

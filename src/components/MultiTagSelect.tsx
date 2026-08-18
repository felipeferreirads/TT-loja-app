// Copiado de src/components/MultiTagSelect.tsx do catálogo pessoal — sem
// i18n, rótulos vêm crus dos próprios valores (claude.md §2).

import { useEffect, useMemo, useRef, useState } from 'react'

interface Props {
  /** Opções fixas. */
  options: string[]
  /** Valores selecionados. */
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}

/**
 * Caixa de seleção múltipla com chips e criação de novos itens DENTRO do
 * dropdown (visual limpo). Usada em "Propriedades especiais".
 */
export function MultiTagSelect({ options, values, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [newItem, setNewItem] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Opções + selecionados que não estão na lista (criados pelo usuário)
  const allOptions = useMemo(() => {
    const set = new Set([...options, ...values])
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [options, values])

  const toggle = (item: string) =>
    onChange(values.includes(item) ? values.filter((v) => v !== item) : [...values, item])

  const handleCreate = () => {
    const item = newItem.trim()
    if (!item) return
    // Se já existe (ignorando caixa), só marca
    const existing = allOptions.find((o) => o.localeCompare(item, 'pt-BR', { sensitivity: 'base' }) === 0)
    if (existing) {
      if (!values.includes(existing)) onChange([...values, existing])
    } else {
      onChange([...values, item])
    }
    setNewItem('')
  }

  return (
    <div ref={boxRef} className="relative">
      {/* "Input" com os chips selecionados */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex min-h-[2.5rem] w-full flex-wrap items-center gap-1 text-left"
      >
        {values.length === 0 && <span className="text-stone-500">{placeholder || 'Selecionar…'}</span>}
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full bg-stone-700 px-2 py-0.5 text-xs text-stone-200">
            {v}
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

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 shadow-xl">
          <div className="max-h-52 overflow-y-auto p-2">
            {allOptions.map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-stone-200 hover:bg-stone-800">
                <input
                  type="checkbox"
                  checked={values.includes(o)}
                  onChange={() => toggle(o)}
                  className="accent-amber-600"
                />
                {o}
              </label>
            ))}
          </div>
          {/* Criar novo item — dentro do dropdown, para o visual ficar limpo */}
          <div className="flex gap-1 border-t border-stone-800 p-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreate()
                }
              }}
              placeholder="Criar novo…"
              className="input flex-1 py-1 text-sm"
            />
            <button type="button" onClick={handleCreate} className="btn-secondary px-2 py-1 text-sm">
              Adicionar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

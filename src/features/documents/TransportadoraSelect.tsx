// Copiado do catálogo pessoal (`src/features/documents/`), sem i18n.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAlert, useConfirm, usePrompt } from '../../components/DialogProvider'
import { PencilIcon, TrashIcon } from '../../components/icons'
import {
  createTransportadora,
  deleteTransportadora,
  fetchTransportadoras,
  renameTransportadora,
} from './transportadoras'

interface Props {
  value: string
  onChange: (value: string) => void
}

/**
 * Seleção única de transportadora com criar/renomear/apagar dentro do
 * dropdown — mesmo padrão de ShapeSelect (gems/ShapeSelect.tsx), aplicado
 * ao pool global da tabela transportadoras.
 */
export function TransportadoraSelect({ value, onChange }: Props) {
  const confirm = useConfirm()
  const alert = useAlert()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const { data: custom } = useQuery({ queryKey: ['transportadoras'], queryFn: fetchTransportadoras })
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['transportadoras'] })

  const customByName = useMemo(() => new Map((custom ?? []).map((tr) => [tr.name, tr.id])), [custom])

  const options = useMemo(() => {
    const set = new Set<string>((custom ?? []).map((tr) => tr.name))
    if (value) set.add(value)
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [custom, value])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      if (!options.some((o) => o.localeCompare(name, 'pt-BR', { sensitivity: 'base' }) === 0)) {
        await createTransportadora(name)
        refresh()
      }
      onChange(name)
      setNewName('')
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao criar transportadora.')
    }
  }

  const handleRename = async (id: string, current: string) => {
    const name = await prompt('Renomear' + ':', current)
    if (!name?.trim() || name.trim() === current) return
    try {
      await renameTransportadora(id, name)
      if (value === current) onChange(name.trim())
      refresh()
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao renomear.')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirm(`Excluir a transportadora "${name}"? Os documentos já salvos não são alterados.`, { danger: true }))) return
    try {
      await deleteTransportadora(id)
      refresh()
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao criar transportadora.')
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex w-full items-center justify-between text-left"
      >
        <span className={value ? '' : 'text-stone-500'}>{value || 'Selecionar transportadora…'}</span>
        <span className="ml-auto flex items-center gap-1 text-stone-500">
          {value && (
            <span
              role="button"
              title={'Limpar'}
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="flex cursor-pointer items-center justify-center p-1 hover:text-stone-200 sm:p-0"
            >
              ✕
            </span>
          )}
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 shadow-xl">
          <div className="max-h-52 overflow-y-auto p-1">
            {options.length === 0 && <p className="px-2 py-2 text-sm text-stone-500">{'Nenhuma transportadora ainda.'}</p>}
            {options.map((name) => {
              const customId = customByName.get(name)
              return (
                <div
                  key={name}
                  className={`group flex min-h-11 items-center rounded px-2 text-sm hover:bg-stone-800 sm:min-h-0 sm:py-1 ${
                    name === value ? 'text-amber-400' : 'text-stone-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(name)
                      setOpen(false)
                    }}
                    className="flex flex-1 items-center self-stretch text-left"
                  >
                    {name}
                  </button>
                  {customId && (
                    <span className="flex gap-1 opacity-100 transition mouse:opacity-0 mouse:group-hover:opacity-100">
                      <span
                        role="button"
                        title={'Renomear'}
                        onClick={() => handleRename(customId, name)}
                        className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-stone-400 hover:text-stone-100 sm:min-h-0 sm:min-w-0"
                      >
                        <PencilIcon />
                      </span>
                      <span
                        role="button"
                        title={'Excluir transportadora'}
                        onClick={() => handleDelete(customId, name)}
                        className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-stone-400 hover:text-red-400 sm:min-h-0 sm:min-w-0"
                      >
                        <TrashIcon />
                      </span>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex gap-1 border-t border-stone-800 p-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreate()
                }
              }}
              placeholder={'Criar nova transportadora…'}
              className="input flex-1 py-1 text-sm"
            />
            <button type="button" onClick={handleCreate} className="btn-secondary min-w-11 px-2 py-1 text-sm sm:min-w-0">
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

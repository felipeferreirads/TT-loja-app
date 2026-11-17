// Copiado do catálogo pessoal (`src/features/documents/`), sem i18n.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAlert, useConfirm, usePrompt } from '../../components/DialogProvider'
import { PencilIcon, TrashIcon } from '../../components/icons'
import type { DocumentHolder } from '../../types/db'
import { formatTitular } from './api'
import { createDocumentHolder, deleteDocumentHolder, fetchDocumentHolders, updateDocumentHolder } from './titulares'

interface Props {
  nome: string
  documento: string
  onChange: (nome: string, documento: string) => void
}

/**
 * Seleção única de titular com criar/editar/apagar dentro do dropdown —
 * mesmo padrão de TransportadoraSelect, mas o titular tem dois campos
 * (nome + documento fiscal). O escolhido é snapshotado no documento.
 */
export function TitularSelect({ nome, documento, onChange }: Props) {
  const confirm = useConfirm()
  const alert = useAlert()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const { data: titulares } = useQuery({ queryKey: ['titulares'], queryFn: fetchDocumentHolders })
  const [open, setOpen] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [newDoc, setNewDoc] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['titulares'] })

  const options = useMemo(
    () => [...(titulares ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [titulares],
  )

  const handleCreate = async () => {
    const n = newNome.trim()
    if (!n) return
    const doc = newDoc.trim() || null
    try {
      const existing = options.find((o) => o.name.localeCompare(n, 'pt-BR', { sensitivity: 'base' }) === 0)
      if (!existing) {
        await createDocumentHolder(n, doc)
        refresh()
      }
      onChange(n, doc ?? '')
      setNewNome('')
      setNewDoc('')
      setOpen(false)
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao criar titular.')
    }
  }

  const handleEdit = async (tit: DocumentHolder) => {
    const n = await prompt('Editar' + ':', tit.name)
    if (n === null) return
    if (!n.trim()) {
      await alert('O nome não pode ficar vazio.')
      return
    }
    const doc = await prompt('CPF/CNPJ (opcional)…', tit.tax_id ?? '')
    if (doc === null) return
    try {
      await updateDocumentHolder(tit.id, n, doc.trim() || null)
      // Se o titular editado é o que está selecionado, atualiza o snapshot.
      if (nome === tit.name) onChange(n.trim(), doc.trim())
      refresh()
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao salvar titular.')
    }
  }

  const handleDelete = async (tit: DocumentHolder) => {
    if (!(await confirm(`Excluir o titular "${tit.name}"? Os documentos já salvos não são alterados.`, { danger: true }))) return
    try {
      await deleteDocumentHolder(tit.id)
      refresh()
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao criar titular.')
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex w-full items-center justify-between text-left"
      >
        <span className={nome ? '' : 'text-stone-500'}>{nome ? formatTitular(nome, documento || null) : 'Selecionar titular…'}</span>
        <span className="ml-auto flex items-center gap-1 text-stone-500">
          {nome && (
            <span
              role="button"
              title={'Limpar'}
              onClick={(e) => {
                e.stopPropagation()
                onChange('', '')
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
            {options.length === 0 && <p className="px-2 py-2 text-sm text-stone-500">{'Nenhum titular ainda.'}</p>}
            {options.map((tit) => (
              <div
                key={tit.id}
                className={`group flex min-h-11 items-center rounded px-2 text-sm hover:bg-stone-800 sm:min-h-0 sm:py-1 ${
                  tit.name === nome ? 'text-amber-400' : 'text-stone-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange(tit.name, tit.tax_id ?? '')
                    setOpen(false)
                  }}
                  className="flex flex-1 flex-col items-start self-stretch text-left"
                >
                  <span>{tit.name}</span>
                  {tit.tax_id && <span className="text-xs text-stone-500">{tit.tax_id}</span>}
                </button>
                <span className="flex gap-1 opacity-100 transition mouse:opacity-0 mouse:group-hover:opacity-100">
                  <span
                    role="button"
                    title={'Editar'}
                    onClick={() => handleEdit(tit)}
                    className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-stone-400 hover:text-stone-100 sm:min-h-0 sm:min-w-0"
                  >
                    <PencilIcon />
                  </span>
                  <span
                    role="button"
                    title={'Excluir titular'}
                    onClick={() => handleDelete(tit)}
                    className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-stone-400 hover:text-red-400 sm:min-h-0 sm:min-w-0"
                  >
                    <TrashIcon />
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1 border-t border-stone-800 p-2">
            <input
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreate()
                }
              }}
              placeholder={'Nome do novo titular…'}
              className="input py-1 text-sm"
            />
            <div className="flex gap-1">
              <input
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
                placeholder={'CPF/CNPJ (opcional)…'}
                className="input flex-1 py-1 text-sm"
              />
              <button type="button" onClick={handleCreate} className="btn-secondary min-w-11 px-2 py-1 text-sm sm:min-w-0">
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

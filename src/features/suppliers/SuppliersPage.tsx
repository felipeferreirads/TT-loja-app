import { useEffect, useState } from 'react'
import type { StoreSupplier } from '../../types/db'
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier, type StoreSupplierInput } from './api'
import { SupplierFormDialog } from './SupplierFormDialog'
import { useConfirm } from '../../components/DialogProvider'
import { PlusIcon } from '../../components/icons'

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<StoreSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<StoreSupplier | null | 'new'>(null)
  const confirm = useConfirm()

  const load = () => {
    setLoading(true)
    fetchSuppliers()
      .then(setSuppliers)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSave = async (input: StoreSupplierInput) => {
    if (editing && editing !== 'new') await updateSupplier(editing.id, input)
    else await createSupplier(input)
    setEditing(null)
    load()
  }

  const handleDelete = async (supplier: StoreSupplier) => {
    if (!(await confirm(`Apagar "${supplier.name}"? Essa ação não pode ser desfeita.`, { danger: true }))) return
    await deleteSupplier(supplier.id)
    load()
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-100">Fornecedores</h1>
        <button type="button" onClick={() => setEditing('new')} className="btn-primary inline-flex items-center gap-1.5">
          <PlusIcon className="h-4 w-4" />
          Novo fornecedor
        </button>
      </header>

      {loading && <p className="text-sm text-stone-400">Carregando…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && suppliers.length === 0 && (
        <p className="text-sm text-stone-400">Nenhum fornecedor cadastrado ainda.</p>
      )}

      {suppliers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-900 text-stone-400">
              <tr>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Contato</th>
                <th className="px-3 py-2 font-medium">Notas</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 text-stone-100">{s.name}</td>
                  <td className="px-3 py-2 text-stone-400">{s.contact ?? '—'}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-stone-400">{s.notes ?? '—'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setEditing(s)} className="text-amber-500 hover:underline">
                      Editar
                    </button>{' '}
                    <button type="button" onClick={() => void handleDelete(s)} className="text-red-400 hover:underline">
                      Apagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SupplierFormDialog
          supplier={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

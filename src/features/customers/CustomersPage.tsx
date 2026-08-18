import { useEffect, useState } from 'react'
import type { StoreCustomer } from '../../types/db'
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer, type StoreCustomerInput } from './api'
import { CustomerFormDialog } from './CustomerFormDialog'
import { useConfirm } from '../../components/DialogProvider'
import { PlusIcon } from '../../components/icons'

export function CustomersPage() {
  const [customers, setCustomers] = useState<StoreCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<StoreCustomer | null | 'new'>(null)
  const confirm = useConfirm()

  const load = () => {
    setLoading(true)
    fetchCustomers()
      .then(setCustomers)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSave = async (input: StoreCustomerInput) => {
    if (editing && editing !== 'new') await updateCustomer(editing.id, input)
    else await createCustomer(input)
    setEditing(null)
    load()
  }

  const handleDelete = async (customer: StoreCustomer) => {
    if (!(await confirm(`Apagar "${customer.name}"? Essa ação não pode ser desfeita.`, { danger: true }))) return
    await deleteCustomer(customer.id)
    load()
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Clientes</h1>
        </div>
        <button type="button" onClick={() => setEditing('new')} className="btn-primary inline-flex items-center gap-1.5">
          <PlusIcon className="h-4 w-4" />
          Novo cliente
        </button>
      </header>

      {loading && <p className="text-sm text-stone-400">Carregando…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && customers.length === 0 && (
        <p className="text-sm text-stone-400">Nenhum cliente cadastrado ainda.</p>
      )}

      {customers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-900 text-stone-400">
              <tr>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">CPF/CNPJ</th>
                <th className="px-3 py-2 font-medium">Telefone</th>
                <th className="px-3 py-2 font-medium">Cidade</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 text-stone-100">{c.name}</td>
                  <td className="px-3 py-2 text-stone-400">{c.doc_number ?? '—'}</td>
                  <td className="px-3 py-2 text-stone-400">{c.phone ?? '—'}</td>
                  <td className="px-3 py-2 text-stone-400">
                    {c.address_city ? `${c.address_city}${c.address_state ? `/${c.address_state}` : ''}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setEditing(c)} className="text-amber-500 hover:underline">
                      Editar
                    </button>{' '}
                    <button type="button" onClick={() => void handleDelete(c)} className="text-red-400 hover:underline">
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
        <CustomerFormDialog
          customer={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

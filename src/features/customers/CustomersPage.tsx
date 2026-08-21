import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StoreCustomer } from '../../types/db'
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer, type StoreCustomerInput } from './api'
import { CustomerFormDialog } from './CustomerFormDialog'
import { useConfirm } from '../../components/DialogProvider'
import { useToast } from '../../components/ToastProvider'
import { EmptyState } from '../../components/EmptyState'
import { SortableHeader } from '../../components/SortableHeader'
import { CardIcon, PlusIcon } from '../../components/icons'

type SortField = 'name' | 'city'

export function CustomersPage() {
  const [customers, setCustomers] = useState<StoreCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<StoreCustomer | null | 'new'>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const confirm = useConfirm()
  const toast = useToast()

  const load = () => {
    setLoading(true)
    fetchCustomers()
      .then(setCustomers)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const toggleSort = (field: SortField) => {
    if (field === sortField) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const diff = (a: StoreCustomer, b: StoreCustomer) =>
      sortField === 'name'
        ? a.name.localeCompare(b.name, 'pt-BR')
        : (a.address_city ?? '').localeCompare(b.address_city ?? '', 'pt-BR')
    return [...customers].sort((a, b) => (sortDir === 'asc' ? diff(a, b) : -diff(a, b)))
  }, [customers, sortField, sortDir])

  const handleSave = async (input: StoreCustomerInput) => {
    if (editing && editing !== 'new') await updateCustomer(editing.id, input)
    else await createCustomer(input)
    setEditing(null)
    toast.success('Cliente salvo.')
    load()
  }

  const handleDelete = async (customer: StoreCustomer) => {
    if (!(await confirm(`Mover "${customer.name}" para a lixeira? Pode ser restaurado por 15 dias.`))) return
    await deleteCustomer(customer.id)
    toast.success(`"${customer.name}" movido para a lixeira.`)
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
        <EmptyState icon={CardIcon} title="Nenhum cliente cadastrado ainda" />
      )}

      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-900 text-stone-400">
              <tr>
                <SortableHeader label="Nome" active={sortField === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                <th className="px-3 py-2 font-medium">CPF/CNPJ</th>
                <th className="px-3 py-2 font-medium">Telefone</th>
                <SortableHeader label="Cidade" active={sortField === 'city'} dir={sortDir} onClick={() => toggleSort('city')} />
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {sorted.map((c) => (
                <tr key={c.id} className="even:bg-stone-900/40 hover:bg-stone-800/60">
                  <td className="px-3 py-2 text-stone-100">
                    <Link to={`/clientes/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </td>
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

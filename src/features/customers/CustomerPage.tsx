import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { StoreCustomer } from '../../types/db'
import { fetchCustomer, updateCustomer, deleteCustomer, type StoreCustomerInput } from './api'
import { fetchCustomerPurchases, type CustomerPurchase } from './purchaseHistory'
import { CustomerFormDialog } from './CustomerFormDialog'
import { ReceiptDialog } from '../sales/ReceiptDialog'
import { PAYMENT_LABELS } from '../sales/SalesPage'
import { formatDate, formatMoney } from '../../lib/format'
import { useConfirm } from '../../components/DialogProvider'
import { useToast } from '../../components/ToastProvider'
import { EmptyState } from '../../components/EmptyState'
import { ArrowLeftIcon, CardIcon, PencilIcon, TrashIcon } from '../../components/icons'

/** Ficha do cliente — contato (editável no mesmo diálogo da listagem) +
 *  contexto de relacionamento: total gasto, nº de compras, ticket médio,
 *  última compra e o histórico completo. Mesmo papel de `ProductPage.tsx`
 *  pro produto, bem mais simples (sem seções condicionais por tipo). */
export function CustomerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()

  const [customer, setCustomer] = useState<StoreCustomer | null>(null)
  const [purchases, setPurchases] = useState<CustomerPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null)

  const load = () => {
    if (!id) return
    setLoading(true)
    Promise.all([fetchCustomer(id), fetchCustomerPurchases(id)])
      .then(([c, p]) => {
        setCustomer(c)
        setPurchases(p)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const stats = useMemo(() => {
    const totalSpent = purchases.reduce((sum, p) => sum + p.total, 0)
    const count = purchases.length
    return {
      totalSpent,
      count,
      avgTicket: count > 0 ? totalSpent / count : 0,
      lastPurchase: purchases[0]?.sale_date ?? null,
    }
  }, [purchases])

  const handleSave = async (input: StoreCustomerInput) => {
    if (!id) return
    await updateCustomer(id, input)
    setEditing(false)
    toast.success('Cliente salvo.')
    load()
  }

  const handleDelete = async () => {
    if (!customer) return
    if (!(await confirm(`Mover "${customer.name}" para a lixeira? Pode ser restaurado por 15 dias.`))) return
    await deleteCustomer(customer.id)
    toast.success(`"${customer.name}" movido para a lixeira.`)
    navigate('/clientes')
  }

  if (loading) return <p className="text-sm text-stone-400">Carregando…</p>
  if (!customer) return <p className="text-sm text-red-400">Cliente não encontrado.</p>

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/clientes" className="mb-4 inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200">
        <ArrowLeftIcon className="h-4 w-4" />
        Clientes
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-100">{customer.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {customer.phone ?? '—'} {customer.email && `· ${customer.email}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setEditing(true)} aria-label="Editar" className="tap-icon">
            <PencilIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => void handleDelete()} aria-label="Apagar" className="tap-icon hover:text-red-400">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-stone-800 p-3">
          <p className="text-xs text-stone-400">Total gasto</p>
          <p className="mt-1 text-lg font-bold text-stone-100">{formatMoney(stats.totalSpent)}</p>
        </div>
        <div className="rounded-lg border border-stone-800 p-3">
          <p className="text-xs text-stone-400">Compras</p>
          <p className="mt-1 text-lg font-bold text-stone-100">{stats.count}</p>
        </div>
        <div className="rounded-lg border border-stone-800 p-3">
          <p className="text-xs text-stone-400">Ticket médio</p>
          <p className="mt-1 text-lg font-bold text-stone-100">{formatMoney(stats.avgTicket)}</p>
        </div>
        <div className="rounded-lg border border-stone-800 p-3">
          <p className="text-xs text-stone-400">Última compra</p>
          <p className="mt-1 text-lg font-bold text-stone-100">{formatDate(stats.lastPurchase)}</p>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-stone-800 p-4">
        <h2 className="font-medium text-stone-200">Histórico de compras</h2>
        {purchases.length === 0 ? (
          <EmptyState icon={CardIcon} title="Nenhuma compra ainda" />
        ) : (
          <ul className="divide-y divide-stone-800 text-sm">
            {purchases.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-stone-200">
                      {formatDate(p.sale_date)} · {PAYMENT_LABELS[p.payment_method]}
                      {!p.paid && <span className="ml-1.5 text-amber-500">· a receber</span>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      {p.items.map((it) => `${it.quantity}× ${it.product_name}`).join(', ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-medium text-stone-100">{formatMoney(p.total)}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <button type="button" onClick={() => setReceiptSaleId(p.id)} className="text-stone-500 hover:text-amber-500 hover:underline">
                        Recibo
                      </button>
                      {p.document && (
                        <button
                          type="button"
                          onClick={() => navigate(`/documentos/${p.document!.id}`)}
                          className="text-amber-500 hover:underline"
                        >
                          NF {p.document.number ?? p.document.title}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && <CustomerFormDialog customer={customer} onSave={handleSave} onClose={() => setEditing(false)} />}
      {receiptSaleId && <ReceiptDialog saleId={receiptSaleId} onClose={() => setReceiptSaleId(null)} />}
    </div>
  )
}

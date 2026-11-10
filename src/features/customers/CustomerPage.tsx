import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { StoreSupplier } from '../../types/db'
import { fetchCustomerRecord, updateCustomer, deleteCustomer } from './api'
import type { StoreSupplierInput } from '../suppliers/api'
import { fetchCustomerPurchases, type CustomerPurchase } from './purchaseHistory'
import { SupplierFormDialog } from '../suppliers/SupplierFormDialog'
import { emailEntriesFromRow, phoneEntriesFromRow } from '../suppliers/contactEntries'
import { ReceiptDialog } from '../sales/ReceiptDialog'
import { PAYMENT_LABELS } from '../sales/SalesPage'
import { countryName, formatDate, formatMoney } from '../../lib/format'
import { safeWebHref } from '../../lib/url'
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

  const [customer, setCustomer] = useState<StoreSupplier | null>(null)
  const [purchases, setPurchases] = useState<CustomerPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null)

  const load = () => {
    if (!id) return
    setLoading(true)
    Promise.all([fetchCustomerRecord(id), fetchCustomerPurchases(id)])
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

  const contact = useMemo(() => {
    if (!customer) return null
    const c = customer
    const isBR = !c.address_country || c.address_country === 'BR'
    const line1 = [c.address_street, c.address_number, c.address_complement].filter(Boolean).join(', ')
    const line2 = [isBR ? c.address_district : null, c.address_city, c.address_state].filter(Boolean).join(' · ')
    const line3 = [c.address_zip, c.address_country && c.address_country !== 'BR' ? countryName(c.address_country) : null]
      .filter(Boolean)
      .join(' · ')
    const docLabel = c.tax_id_type === 'cnpj' ? 'CNPJ' : c.tax_id_type === 'cpf' ? 'CPF' : 'Documento fiscal'
    return {
      phones: phoneEntriesFromRow(c),
      emails: emailEntriesFromRow(c),
      address: [line1, line2, line3].filter(Boolean),
      doc: c.tax_id ? `${docLabel}: ${c.tax_id}` : null,
      website: safeWebHref(c.website),
    }
  }, [customer])

  const handleSave = async (input: StoreSupplierInput) => {
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

      <header className="mb-4 flex items-start justify-between gap-2 sm:mb-6 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold break-words text-stone-100">{customer.name}</h1>
          <p className="mt-1 text-sm break-words text-stone-500">
            {customer.kind === 'company' ? 'Pessoa jurídica' : 'Pessoa física'}
            {customer.legal_name && ` · ${customer.legal_name}`}
            {customer.is_supplier && ' · Também é fornecedor'}
            {customer.in_collection && ' · Compartilhado com a Coleção'}
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

      {contact && (
        <section className="mb-6 grid gap-4 rounded-lg border border-stone-800 p-4 text-sm sm:grid-cols-2">
          <div className="space-y-1">
            <h2 className="mb-1 font-medium text-stone-200">Contato</h2>
            {contact.phones.length === 0 && contact.emails.length === 0 && !contact.website && (
              <p className="text-stone-500">Nenhum contato informado.</p>
            )}
            {contact.phones.map((p, i) => (
              <p key={`p${i}`} className="break-words text-stone-300">
                {p.label && <span className="text-stone-500">{p.label}: </span>}
                {p.value}
                {p.whatsapp && <span className="text-stone-500"> · WhatsApp</span>}
              </p>
            ))}
            {contact.emails.map((e, i) => (
              <p key={`e${i}`} className="break-words text-stone-300">
                {e.label && <span className="text-stone-500">{e.label}: </span>}
                <a href={`mailto:${e.value}`} className="hover:text-amber-500 hover:underline">
                  {e.value}
                </a>
              </p>
            ))}
            {contact.website && (
              <p className="break-words">
                <a href={contact.website} target="_blank" rel="noreferrer" className="text-amber-500 hover:underline">
                  {customer.website}
                </a>
              </p>
            )}
          </div>
          <div className="space-y-1">
            <h2 className="mb-1 font-medium text-stone-200">Documento e endereço</h2>
            {contact.doc && <p className="text-stone-300">{contact.doc}</p>}
            {contact.address.map((line) => (
              <p key={line} className="break-words text-stone-300">
                {line}
              </p>
            ))}
            {!contact.doc && contact.address.length === 0 && <p className="text-stone-500">Nenhum endereço informado.</p>}
          </div>
          {customer.notes && (
            <p className="whitespace-pre-line text-stone-400 sm:col-span-2">{customer.notes}</p>
          )}
        </section>
      )}

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

      {editing && (
        <SupplierFormDialog role="customer" supplier={customer} onSave={handleSave} onClose={() => setEditing(false)} />
      )}
      {receiptSaleId && <ReceiptDialog saleId={receiptSaleId} onClose={() => setReceiptSaleId(null)} />}
    </div>
  )
}

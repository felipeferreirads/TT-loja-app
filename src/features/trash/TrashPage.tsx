import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StoreCustomer, StoreProduct } from '../../types/db'
import {
  daysUntilPurge,
  fetchDeletedCustomers,
  fetchDeletedProducts,
  permanentlyDeleteCustomer,
  permanentlyDeleteProduct,
  purgeExpiredTrash,
  restoreCustomer,
  restoreProduct,
} from './api'
import { useConfirm } from '../../components/DialogProvider'
import { useToast } from '../../components/ToastProvider'
import { EmptyState } from '../../components/EmptyState'
import { TrashIcon, RestoreIcon, PackageIcon, PersonIcon } from '../../components/icons'

type Tab = 'produtos' | 'clientes'

function RetentionNote({ deletedAt }: { deletedAt: string }) {
  const days = daysUntilPurge(deletedAt)
  return (
    <span className={`text-xs ${days <= 3 ? 'text-red-400' : 'text-stone-500'}`}>
      {days === 0 ? 'Apaga hoje' : `${days} dia${days === 1 ? '' : 's'} até apagar de vez`}
    </span>
  )
}

export function TrashPage() {
  const [tab, setTab] = useState<Tab>('produtos')
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [customers, setCustomers] = useState<StoreCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const confirm = useConfirm()
  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([fetchDeletedProducts(), fetchDeletedCustomers()])
      .then(([p, c]) => {
        setProducts(p)
        setCustomers(c)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // Best-effort: purga o que já passou dos 15 dias antes de listar. Uma
    // falha aqui não deve impedir a tela de abrir.
    purgeExpiredTrash()
      .catch(() => {})
      .finally(load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRestoreProduct = async (p: StoreProduct) => {
    await restoreProduct(p.id)
    toast.success(`"${p.name}" restaurado.`)
    load()
  }

  const handlePurgeProduct = async (p: StoreProduct) => {
    if (!(await confirm(`Apagar "${p.name}" para sempre? Essa ação não pode ser desfeita.`, { danger: true }))) return
    await permanentlyDeleteProduct(p.id)
    toast.success(`"${p.name}" apagado em definitivo.`)
    load()
  }

  const handleRestoreCustomer = async (c: StoreCustomer) => {
    await restoreCustomer(c.id)
    toast.success(`"${c.name}" restaurado.`)
    load()
  }

  const handlePurgeCustomer = async (c: StoreCustomer) => {
    if (!(await confirm(`Apagar "${c.name}" para sempre? Essa ação não pode ser desfeita.`, { danger: true }))) return
    await permanentlyDeleteCustomer(c.id)
    toast.success(`"${c.name}" apagado em definitivo.`)
    load()
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-stone-100">Lixeira</h1>
        <p className="mt-1 text-sm text-stone-500">Itens apagados ficam aqui por 15 dias antes de sumir de vez.</p>
      </header>

      <div className="mb-4 inline-flex overflow-hidden rounded-lg border border-stone-700">
        {([
          ['produtos', 'Produtos', products.length],
          ['clientes', 'Clientes', customers.length],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`px-4 py-1.5 text-sm transition ${
              tab === value ? 'bg-amber-600 text-white' : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
            }`}
          >
            {label} {count > 0 && `(${count})`}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-stone-400">Carregando…</p>}

      {!loading && tab === 'produtos' && (
        <>
          {products.length === 0 ? (
            <EmptyState icon={PackageIcon} title="A lixeira de produtos está vazia" />
          ) : (
            <ul className="divide-y divide-stone-800 rounded-lg border border-stone-800">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3">
                  <Link to={`/produtos/${p.id}`} className="min-w-0 flex-1 truncate text-sm text-stone-200 hover:underline">
                    {p.name}
                  </Link>
                  {p.deleted_at && <RetentionNote deletedAt={p.deleted_at} />}
                  <button
                    type="button"
                    onClick={() => void handleRestoreProduct(p)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-amber-500 hover:underline"
                  >
                    <RestoreIcon className="h-3.5 w-3.5" />
                    Restaurar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePurgeProduct(p)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-stone-500 hover:text-red-400"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Apagar para sempre
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {!loading && tab === 'clientes' && (
        <>
          {customers.length === 0 ? (
            <EmptyState icon={PersonIcon} title="A lixeira de clientes está vazia" />
          ) : (
            <ul className="divide-y divide-stone-800 rounded-lg border border-stone-800">
              {customers.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-stone-200">{c.name}</span>
                  {c.deleted_at && <RetentionNote deletedAt={c.deleted_at} />}
                  <button
                    type="button"
                    onClick={() => void handleRestoreCustomer(c)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-amber-500 hover:underline"
                  >
                    <RestoreIcon className="h-3.5 w-3.5" />
                    Restaurar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePurgeCustomer(c)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-stone-500 hover:text-red-400"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Apagar para sempre
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

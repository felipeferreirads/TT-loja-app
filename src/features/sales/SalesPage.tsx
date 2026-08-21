import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import type { StoreCustomer, StorePaymentMethod, StoreProduct } from '../../types/db'
import { fetchProducts } from '../products/api'
import { resolveScannedValue } from '../products/qr'
import { fetchCustomers, createCustomer, type StoreCustomerInput } from '../customers/api'
import { CustomerFormDialog } from '../customers/CustomerFormDialog'
import { fetchSales, createSale, type SaleWithCustomer } from './api'
import { formatDate, formatMoney } from '../../lib/format'
import { CameraIcon, CloseIcon, PackageIcon, PlusIcon, SearchIcon } from '../../components/icons'
import { SearchSelect } from '../../components/SearchSelect'
import { SortControl } from '../../components/SortControl'
import { EmptyState } from '../../components/EmptyState'
import { InlineQrScanner } from '../../components/InlineQrScanner'
import { useToast } from '../../components/ToastProvider'
import { ReceiptDialog } from './ReceiptDialog'

type SaleSortField = 'date' | 'total'

const SALE_SORT_OPTIONS: { value: SaleSortField; label: string }[] = [
  { value: 'date', label: 'Data' },
  { value: 'total', label: 'Valor' },
]

interface CartLine {
  product_id: string
  name: string
  quantity: number
  unit_price: number
  maxStock: number
}

export const PAYMENT_LABELS: Record<StorePaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  pix: 'Pix',
  outro: 'Outro',
}

interface SalesLocationState {
  /** Vindo do Escanear (modo "Coletar") — ver `ScanPage.tsx`. Pré-carrega o
   *  carrinho com esses produtos e já abre o diálogo de nova venda. */
  prefillProductIds?: string[]
}

const todayIso = () => new Date().toISOString().slice(0, 10)

export function SalesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [customers, setCustomers] = useState<StoreCustomer[]>([])
  const [sales, setSales] = useState<SaleWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cart, setCart] = useState<CartLine[]>([])
  const [productTab, setProductTab] = useState<'buscar' | 'escanear'>('buscar')
  const [scanNotFound, setScanNotFound] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod>('dinheiro')
  const [discount, setDiscount] = useState('0')
  const [discountMode, setDiscountMode] = useState<'brl' | 'pct'>('brl')
  const [extra, setExtra] = useState('0')
  const [fiado, setFiado] = useState(false)
  const [dueDate, setDueDate] = useState(todayIso())
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  const [saleDialogOpen, setSaleDialogOpen] = useState(false)
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SaleSortField>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const load = () => {
    setLoading(true)
    Promise.all([fetchProducts(), fetchCustomers(), fetchSales()])
      .then(([p, c, s]) => {
        setProducts(p)
        setCustomers(c)
        setSales(s)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    const state = location.state as SalesLocationState | null
    const ids = state?.prefillProductIds
    if (!ids || ids.length === 0 || products.length === 0) return
    setCart((prev) => {
      const next = [...prev]
      for (const id of ids) {
        const product = products.find((p) => p.id === id)
        if (!product || next.some((l) => l.product_id === id)) continue
        next.push({ product_id: product.id, name: product.name, quantity: 1, unit_price: product.sale_price, maxStock: product.stock_quantity })
      }
      return next
    })
    setSaleDialogOpen(true)
    navigate(location.pathname, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, location.state])

  const availableProducts = products.filter((p) => p.stock_quantity > 0)

  const addProductToCart = (product: StoreProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev
        return prev.map((l) => (l.product_id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { product_id: product.id, name: product.name, quantity: 1, unit_price: product.sale_price, maxStock: product.stock_quantity }]
    })
  }

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return
    addProductToCart(product)
    setSelectedProductId('')
  }

  const handleScanDetect = (raw: string) => {
    const found = resolveScannedValue(availableProducts, raw)
    if (!found) {
      setScanNotFound(raw)
      return
    }
    setScanNotFound(null)
    addProductToCart(found)
  }

  const updateLine = (productId: string, patch: Partial<CartLine>) => {
    setCart((prev) => prev.map((l) => (l.product_id === productId ? { ...l, ...patch } : l)))
  }

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product_id !== productId))
  }

  const handleCreateCustomer = async (input: StoreCustomerInput) => {
    const created = await createCustomer(input)
    setCustomers(await fetchCustomers())
    setCustomerId(created.id)
    setNewCustomerOpen(false)
  }

  const subtotal = cart.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)
  const discountValue =
    discountMode === 'pct' ? (subtotal * (Number(discount) || 0)) / 100 : Number(discount) || 0
  const extraValue = Number(extra) || 0
  const total = Math.max(0, subtotal - discountValue + extraValue)

  const closeSaleDialog = () => {
    setSaleDialogOpen(false)
    setProductTab('buscar')
    setScanNotFound(null)
  }

  const handleSubmit = async () => {
    if (cart.length === 0) return
    if (fiado && !dueDate) return
    setBusy(true)
    setSaveError(null)
    try {
      await createSale({
        customer_id: customerId || null,
        payment_method: paymentMethod,
        discount: discountValue,
        extra_amount: extraValue,
        notes: null,
        items: cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price })),
        due_date: fiado ? dueDate : null,
        paid: !fiado,
      })
      setCart([])
      setDiscount('0')
      setExtra('0')
      setCustomerId('')
      setFiado(false)
      setDueDate(todayIso())
      closeSaleDialog()
      toast.success('Venda registrada.')
      load()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const filteredSales = sales
    .filter((s) => (s.customer?.name ?? 'sem cliente').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const diff = sortField === 'date' ? new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime() : a.total - b.total
      return sortDir === 'asc' ? diff : -diff
    })

  return (
    <div>
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-stone-100">Vendas</h1>
        <button type="button" onClick={() => setSaleDialogOpen(true)} className="btn-primary inline-flex items-center gap-1.5">
          <PlusIcon className="h-4 w-4" />
          Nova venda
        </button>
      </header>

      {loading && <p className="text-sm text-stone-400">Carregando…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-md flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente…"
            className="input pl-9"
          />
        </div>
        <div className="ml-auto shrink-0">
          <SortControl
            value={sortField}
            onChange={setSortField}
            options={SALE_SORT_OPTIONS}
            dir={sortDir}
            onToggleDir={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          />
        </div>
      </div>

      {!loading && !error && (
        <section className="rounded-lg border border-stone-800 p-4">
          <h2 className="mb-3 font-medium text-stone-200">Vendas recentes</h2>
          {sales.length === 0 && <EmptyState icon={PackageIcon} title="Nenhuma venda registrada ainda" />}
          {sales.length > 0 && filteredSales.length === 0 && (
            <p className="text-sm text-stone-400">Nenhuma venda encontrada para "{search}".</p>
          )}
          {filteredSales.length > 0 && (
            <div className="space-y-2 text-sm">
              {filteredSales.map((s) => {
                const overdue = !s.paid && !!s.due_date && s.due_date < todayIso()
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 border-b border-stone-800 pb-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-stone-200">
                        {s.customer?.name ?? 'Sem cliente'}
                        {!s.paid && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${overdue ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>
                            {overdue ? 'Vencida' : 'A receber'}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-500">
                        {formatDate(s.sale_date)} · {PAYMENT_LABELS[s.payment_method]}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setReceiptSaleId(s.id)}
                        className="text-xs text-stone-500 hover:text-amber-500 hover:underline"
                      >
                        Recibo
                      </button>
                      {s.documents[0] ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/documentos/${s.documents[0].id}`)}
                          className="text-xs text-amber-500 hover:underline"
                        >
                          NF {s.documents[0].number ?? s.documents[0].title} ✓
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/documentos/novo?sale=${s.id}`)}
                          className="text-xs text-stone-500 hover:text-amber-500 hover:underline"
                        >
                          Nota fiscal
                        </button>
                      )}
                      <span className="font-medium text-stone-100">{formatMoney(s.total)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {newCustomerOpen && (
        <CustomerFormDialog customer={null} onSave={handleCreateCustomer} onClose={() => setNewCustomerOpen(false)} />
      )}

      {/* PDV em tela cheia — uso diário no balcão, precisa de espaço pra
          carrinho + totais visíveis ao mesmo tempo, sobretudo no celular. */}
      {saleDialogOpen &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex flex-col bg-stone-950">
            <header className="safe-top flex shrink-0 items-center justify-between border-b border-stone-800 px-4 py-3">
              <h2 className="text-lg font-bold text-stone-100">Nova venda</h2>
              <button type="button" onClick={closeSaleDialog} aria-label="Fechar" className="tap-icon">
                <CloseIcon className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mx-auto max-w-lg space-y-4">
                <div>
                  <div className="mb-2 inline-flex overflow-hidden rounded-lg border border-stone-700">
                    <button
                      type="button"
                      onClick={() => setProductTab('buscar')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition ${
                        productTab === 'buscar' ? 'bg-amber-600 text-white' : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <SearchIcon className="h-3.5 w-3.5" />
                      Buscar
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductTab('escanear')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition ${
                        productTab === 'escanear' ? 'bg-amber-600 text-white' : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <CameraIcon className="h-3.5 w-3.5" />
                      Escanear
                    </button>
                  </div>

                  {productTab === 'buscar' ? (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SearchSelect
                          items={availableProducts.map((p) => ({ id: p.id, label: p.name, sublabel: `estoque: ${p.stock_quantity}` }))}
                          value={selectedProductId}
                          onChange={setSelectedProductId}
                          placeholder="Digite para buscar um produto…"
                          emptyText="Nenhum produto encontrado."
                        />
                      </div>
                      <button type="button" onClick={addToCart} disabled={!selectedProductId} className="btn-secondary shrink-0">
                        Adicionar
                      </button>
                    </div>
                  ) : (
                    <div>
                      <InlineQrScanner onDetect={handleScanDetect} />
                      {scanNotFound && (
                        <p className="mt-1.5 text-xs text-red-400">Nenhum produto em estoque encontrado para "{scanNotFound}".</p>
                      )}
                      <p className="mt-1.5 text-xs text-stone-500">Aponte pro QR do produto — cada leitura adiciona ao carrinho, sem fechar a câmera.</p>
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="space-y-2">
                    {cart.map((l) => (
                      <div key={l.product_id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 text-stone-200">{l.name}</span>
                        <input
                          type="number"
                          min={1}
                          max={l.maxStock}
                          value={l.quantity}
                          onChange={(e) =>
                            updateLine(l.product_id, { quantity: Math.min(l.maxStock, Math.max(1, Number(e.target.value) || 1)) })
                          }
                          className="input w-16"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={l.unit_price}
                          onChange={(e) => updateLine(l.product_id, { unit_price: Number(e.target.value) || 0 })}
                          className="input w-24"
                        />
                        <span className="w-24 text-right text-stone-400">{formatMoney(l.quantity * l.unit_price)}</span>
                        <button type="button" onClick={() => removeLine(l.product_id)} className="text-red-400 hover:underline">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="flex items-center justify-between text-sm text-stone-300">
                      Cliente
                      <button
                        type="button"
                        onClick={() => setNewCustomerOpen(true)}
                        className="text-xs text-amber-500 hover:underline"
                      >
                        + cadastrar
                      </button>
                    </span>
                    <div className="mt-1">
                      <SearchSelect
                        items={customers.map((c) => ({ id: c.id, label: c.name }))}
                        value={customerId}
                        onChange={setCustomerId}
                        placeholder="Digite para buscar um cliente…"
                        emptyText="Nenhum cliente encontrado."
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-sm text-stone-300">Pagamento</span>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as StorePaymentMethod)}
                      className="input mt-1"
                    >
                      {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="block">
                  <span className="text-sm text-stone-300">Desconto</span>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="input"
                    />
                    <div className="flex shrink-0 overflow-hidden rounded-lg border border-stone-700">
                      {(['brl', 'pct'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setDiscountMode(mode)}
                          className={`px-3 text-sm transition ${
                            discountMode === mode ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-200 hover:bg-stone-700'
                          }`}
                        >
                          {mode === 'brl' ? 'R$' : '%'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {discountMode === 'pct' && (
                    <p className="mt-1 text-xs text-stone-500">Equivale a {formatMoney(discountValue)}</p>
                  )}
                </div>

                <label className="block">
                  <span className="text-sm text-stone-300">Adicional (frete, serviço, embalagem…)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    className="input mt-1"
                  />
                </label>

                <div className="rounded-lg border border-stone-800 p-3">
                  <label className="flex items-center gap-2 text-sm text-stone-300">
                    <input
                      type="checkbox"
                      checked={fiado}
                      onChange={(e) => setFiado(e.target.checked)}
                      className="h-4 w-4 rounded border-stone-700 bg-stone-800 text-amber-600 focus:ring-amber-600"
                    />
                    Fiado (a receber depois)
                  </label>
                  {fiado && (
                    <label className="mt-2 block">
                      <span className="text-xs text-stone-400">Vencimento</span>
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="input mt-1"
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-1 border-t border-stone-800 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-400">Subtotal</span>
                    <span className="text-stone-300">{formatMoney(subtotal)}</span>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-400">Desconto</span>
                      <span className="text-stone-300">-{formatMoney(discountValue)}</span>
                    </div>
                  )}
                  {extraValue > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-400">Adicional</span>
                      <span className="text-stone-300">+{formatMoney(extraValue)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-stone-300">Total</span>
                    <span className="text-lg font-bold text-stone-100">{formatMoney(total)}</span>
                  </div>
                </div>

                {saveError && <p className="text-sm text-red-400">{saveError}</p>}
              </div>
            </div>

            <div className="safe-bottom shrink-0 border-t border-stone-800 px-4 py-3">
              <div className="mx-auto max-w-lg">
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={busy || cart.length === 0 || (fiado && !dueDate)}
                  className="btn-primary w-full"
                >
                  {busy ? 'Registrando…' : `Registrar venda · ${formatMoney(total)}`}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {receiptSaleId && <ReceiptDialog saleId={receiptSaleId} onClose={() => setReceiptSaleId(null)} />}
    </div>
  )
}

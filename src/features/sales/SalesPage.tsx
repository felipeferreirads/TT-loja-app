import { useEffect, useState } from 'react'
import type { StoreCustomer, StorePaymentMethod, StoreProduct } from '../../types/db'
import { fetchProducts } from '../products/api'
import { fetchCustomers, createCustomer, type StoreCustomerInput } from '../customers/api'
import { CustomerFormDialog } from '../customers/CustomerFormDialog'
import { fetchSales, createSale, type SaleWithCustomer } from './api'
import { formatMoney } from '../../lib/format'

interface CartLine {
  product_id: string
  name: string
  quantity: number
  unit_price: number
  maxStock: number
}

const PAYMENT_LABELS: Record<StorePaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  pix: 'Pix',
  outro: 'Outro',
}

export function SalesPage() {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [customers, setCustomers] = useState<StoreCustomer[]>([])
  const [sales, setSales] = useState<SaleWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cart, setCart] = useState<CartLine[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod>('dinheiro')
  const [discount, setDiscount] = useState('0')
  // O banco grava `store_sales.discount` sempre em REAIS; o modo percentual é
  // só de entrada, convertido sobre o subtotal na hora de registrar.
  const [discountMode, setDiscountMode] = useState<'brl' | 'pct'>('brl')
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)

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

  const availableProducts = products.filter((p) => p.stock_quantity > 0)

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev
        return prev.map((l) => (l.product_id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { product_id: product.id, name: product.name, quantity: 1, unit_price: product.sale_price, maxStock: product.stock_quantity }]
    })
    setSelectedProductId('')
  }

  const updateLine = (productId: string, patch: Partial<CartLine>) => {
    setCart((prev) => prev.map((l) => (l.product_id === productId ? { ...l, ...patch } : l)))
  }

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product_id !== productId))
  }

  // Cadastro rápido durante a venda: cria o cliente, recarrega a lista e já
  // deixa ele selecionado — sem sair do PDV nem perder o carrinho montado.
  const handleCreateCustomer = async (input: StoreCustomerInput) => {
    const created = await createCustomer(input)
    setCustomers(await fetchCustomers())
    setCustomerId(created.id)
    setNewCustomerOpen(false)
  }

  const subtotal = cart.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)
  const discountValue =
    discountMode === 'pct' ? (subtotal * (Number(discount) || 0)) / 100 : Number(discount) || 0
  const total = Math.max(0, subtotal - discountValue)

  const handleSubmit = async () => {
    if (cart.length === 0) return
    setBusy(true)
    setSaveError(null)
    try {
      await createSale({
        customer_id: customerId || null,
        payment_method: paymentMethod,
        discount: discountValue,
        notes: null,
        items: cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price })),
      })
      setCart([])
      setDiscount('0')
      setCustomerId('')
      load()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-stone-100">Vendas</h1>
      </header>

      {loading && <p className="text-sm text-stone-400">Carregando…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-lg border border-stone-800 p-4">
            <h2 className="font-medium text-stone-200">Nova venda</h2>

            <div className="flex gap-2">
              <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="input">
                <option value="">Selecione um produto…</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (estoque: {p.stock_quantity})
                  </option>
                ))}
              </select>
              <button type="button" onClick={addToCart} disabled={!selectedProductId} className="btn-secondary shrink-0">
                Adicionar
              </button>
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
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input mt-1">
                  <option value="">Sem cliente</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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

            <div className="space-y-1 border-t border-stone-800 pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Subtotal</span>
                <span className="text-stone-300">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-300">Total</span>
                <span className="text-lg font-bold text-stone-100">{formatMoney(total)}</span>
              </div>
            </div>

            {saveError && <p className="text-sm text-red-400">{saveError}</p>}

            <button type="button" onClick={() => void handleSubmit()} disabled={busy || cart.length === 0} className="btn-primary w-full">
              {busy ? 'Registrando…' : 'Registrar venda'}
            </button>
          </section>

          <section className="rounded-lg border border-stone-800 p-4">
            <h2 className="mb-3 font-medium text-stone-200">Vendas recentes</h2>
            {sales.length === 0 && <p className="text-sm text-stone-400">Nenhuma venda registrada ainda.</p>}
            {sales.length > 0 && (
              <div className="space-y-2 text-sm">
                {sales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <div>
                      <p className="text-stone-200">{s.customer?.name ?? 'Sem cliente'}</p>
                      <p className="text-xs text-stone-500">
                        {new Date(s.sale_date).toLocaleString('pt-BR')} · {PAYMENT_LABELS[s.payment_method]}
                      </p>
                    </div>
                    <span className="font-medium text-stone-100">{formatMoney(s.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {newCustomerOpen && (
        <CustomerFormDialog customer={null} onSave={handleCreateCustomer} onClose={() => setNewCustomerOpen(false)} />
      )}
    </div>
  )
}

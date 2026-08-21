import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchSaleReceipt, type SaleReceipt } from './api'
import { fetchCompany } from '../company/api'
import type { StoreCompany } from '../../types/db'
import { formatMoney } from '../../lib/format'
import { PrinterIcon } from '../../components/icons'
import { PAYMENT_LABELS } from './SalesPage'

function formatAddress(entity: {
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_district: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
}): string {
  const line1 = [entity.address_street, entity.address_number].filter(Boolean).join(', ')
  const line2 = [entity.address_district, entity.address_city, entity.address_state].filter(Boolean).join(' - ')
  return [line1, entity.address_complement, line2, entity.address_zip].filter(Boolean).join(' · ')
}

export function ReceiptDialog({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const [sale, setSale] = useState<SaleReceipt | null>(null)
  const [company, setCompany] = useState<StoreCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchSaleReceipt(saleId), fetchCompany()])
      .then(([s, c]) => {
        setSale(s)
        setCompany(c)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [saleId])

  const subtotal = sale?.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0) ?? 0
  const companyName = company?.trade_name || company?.legal_name

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 print:static print:bg-transparent print:p-0" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-stone-900 p-5 print:max-h-none print:overflow-visible print:rounded-none print:bg-white print:p-0"
      >
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h2 className="text-lg font-bold text-stone-100">Recibo</h2>
          <button type="button" onClick={onClose} className="tap-icon" aria-label="Fechar">
            ×
          </button>
        </div>

        {loading && <p className="text-sm text-stone-400 print:hidden">Carregando…</p>}
        {error && <p className="text-sm text-red-400 print:hidden">{error}</p>}

        {sale && (
          <div id="receipt-print-area" className="space-y-4 text-sm text-stone-200 print:text-black">
            <header className="border-b border-stone-700 pb-3 text-center print:border-black">
              {companyName && <p className="text-base font-bold">{companyName}</p>}
              {company?.cnpj && <p className="text-xs text-stone-400 print:text-black">CNPJ: {company.cnpj}</p>}
              {company && formatAddress(company) && (
                <p className="text-xs text-stone-400 print:text-black">{formatAddress(company)}</p>
              )}
              {(company?.phone || company?.email) && (
                <p className="text-xs text-stone-400 print:text-black">
                  {[company?.phone, company?.email].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="mt-2 text-sm font-semibold tracking-wide uppercase">Recibo de venda</p>
            </header>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-stone-500 print:text-stone-600">Data</span>
                <p>{new Date(sale.sale_date).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <span className="text-stone-500 print:text-stone-600">Pagamento</span>
                <p>{PAYMENT_LABELS[sale.payment_method]}</p>
              </div>
              {sale.customer && (
                <div className="col-span-2">
                  <span className="text-stone-500 print:text-stone-600">Cliente</span>
                  <p>
                    {sale.customer.name}
                    {sale.customer.doc_number ? ` · ${sale.customer.doc_type === 'cnpj' ? 'CNPJ' : 'CPF'}: ${sale.customer.doc_number}` : ''}
                  </p>
                  {formatAddress(sale.customer) && <p className="text-stone-400 print:text-black">{formatAddress(sale.customer)}</p>}
                </div>
              )}
            </div>

            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-700 text-left text-stone-400 print:border-black print:text-black">
                  <th className="py-1">Produto</th>
                  <th className="py-1 text-right">Qtd.</th>
                  <th className="py-1 text-right">Unit.</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, i) => (
                  <tr key={i} className="border-b border-stone-800 print:border-stone-300">
                    <td className="py-1 pr-2">{item.product_name}</td>
                    <td className="py-1 text-right">{item.quantity}</td>
                    <td className="py-1 text-right">{formatMoney(item.unit_price)}</td>
                    <td className="py-1 text-right">{formatMoney(item.quantity * item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 border-t border-stone-700 pt-2 text-xs print:border-black">
              <div className="flex justify-between">
                <span className="text-stone-400 print:text-black">Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400 print:text-black">Desconto</span>
                  <span>-{formatMoney(sale.discount)}</span>
                </div>
              )}
              {sale.extra_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400 print:text-black">Adicional (frete/serviço)</span>
                  <span>+{formatMoney(sale.extra_amount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-stone-700 pt-1 text-sm font-bold print:border-black">
                <span>Total</span>
                <span>{formatMoney(sale.total)}</span>
              </div>
            </div>

            {sale.notes && <p className="text-xs text-stone-400 print:text-black">Obs.: {sale.notes}</p>}

            <p className="pt-6 text-center text-xs text-stone-400 print:text-black">
              Recebi(emos) a mercadoria/serviço acima descrito em perfeito estado.
            </p>
            <p className="mt-8 border-t border-stone-600 pt-1 text-center text-xs text-stone-400 print:border-black print:text-black">
              Assinatura
            </p>
          </div>
        )}

        {sale && (
          <div className="mt-4 flex gap-2 print:hidden">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Fechar
            </button>
            <button type="button" onClick={() => window.print()} className="btn-primary flex-1 inline-flex items-center justify-center gap-1.5">
              <PrinterIcon className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

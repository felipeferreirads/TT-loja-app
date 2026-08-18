import { useState } from 'react'
import type { StoreProduct } from '../../../types/db'
import { fetchCompany } from '../../company/api'
import { fetchMediaForExport } from '../api'
import { buildNuvemshopCsv } from './nuvemshop'
import { buildShopifyCsv } from './shopify'
import { downloadCsv } from './csv'
import { ExportIcon, ChevronDownIcon } from '../../../components/icons'

/**
 * Botão de exportar CSV pra Nuvemshop/Shopify — reaproveitado na lista de
 * Produtos (lote, respeitando o filtro atual da tela) e na ficha de um
 * produto (`products` com um item só). Marca é buscada de `store_company`
 * na hora do clique, não fica em cache — evita ficar velha se o dono mudar
 * o nome da empresa entre uma exportação e outra.
 */
export function ExportMenu({ products, filename }: { products: StoreProduct[]; filename: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (platform: 'nuvemshop' | 'shopify') => {
    setOpen(false)
    setBusy(true)
    setError(null)
    try {
      const company = await fetchCompany().catch(() => null)
      const brand = company?.trade_name || company?.legal_name || ''

      if (platform === 'nuvemshop') {
        downloadCsv(`${filename}-nuvemshop.csv`, buildNuvemshopCsv(products, brand))
      } else {
        const mediaByProduct = await fetchMediaForExport(products.map((p) => p.id))
        downloadCsv(`${filename}-shopify.csv`, buildShopifyCsv(products, brand, mediaByProduct))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (products.length === 0) return null

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="btn-secondary"
      >
        <ExportIcon className="mr-1" />
        {busy ? 'Exportando…' : 'Exportar'}
        <ChevronDownIcon className="ml-1 h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-stone-800 bg-stone-900 shadow-lg">
            <button
              type="button"
              onClick={() => void handleExport('nuvemshop')}
              className="block w-full px-4 py-3 text-left text-sm text-stone-200 hover:bg-stone-800"
            >
              CSV Nuvemshop
            </button>
            <button
              type="button"
              onClick={() => void handleExport('shopify')}
              className="block w-full px-4 py-3 text-left text-sm text-stone-200 hover:bg-stone-800"
            >
              CSV Shopify
            </button>
          </div>
        </>
      )}

      {error && <p className="absolute right-0 z-20 mt-1 w-64 text-xs text-red-400">{error}</p>}
    </div>
  )
}

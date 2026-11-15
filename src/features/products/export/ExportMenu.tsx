import { useState } from 'react'
import type { StoreProduct } from '../../../types/db'
import { fetchCompany } from '../../company/api'
import { fetchMediaForExport } from '../api'
import { buildNuvemshopCsv } from './nuvemshop'
import { buildShopifyCsv } from './shopify'
import { downloadCsv } from './csv'
import { ExportIcon } from '../../../components/icons'
import { ActionMenu, type ActionMenuItem } from '../../../components/ActionMenu'
import { useToast } from '../../../components/ToastProvider'

/**
 * Menu "Exportar" (CSV Nuvemshop/Shopify) — reaproveitado na lista de
 * Produtos (respeita o filtro atual da tela) e na ficha de um produto. Botão
 * quadrado só com ícone (h-9), mesmo padrão dos botões de ação do catálogo
 * pessoal. Marca é buscada de `store_company` na hora do clique.
 */
export function ExportMenu({
  products,
  filename,
  extraItems = [],
}: {
  products: StoreProduct[]
  filename: string
  /** Itens extras no topo do menu (ex.: planilha das colunas visíveis). */
  extraItems?: ActionMenuItem[]
}) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const handleExport = async (platform: 'nuvemshop' | 'shopify') => {
    setBusy(true)
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
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (products.length === 0) return null

  return (
    <ActionMenu
      label={busy ? 'Exportando' : 'Exportar'}
      buttonClassName="btn-secondary inline-flex h-9 min-h-9 w-9 items-center justify-center px-0 py-0"
      items={[
        ...extraItems,
        { label: 'CSV para Nuvemshop', icon: <ExportIcon />, onClick: () => void handleExport('nuvemshop'), disabled: busy },
        { label: 'CSV para Shopify', icon: <ExportIcon />, onClick: () => void handleExport('shopify'), disabled: busy },
      ]}
    >
      <ExportIcon />
    </ActionMenu>
  )
}

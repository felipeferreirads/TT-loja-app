import { Link } from 'react-router-dom'
import { ITEM_KIND_LABELS } from '../../../types/db'
import { formatMoney } from '../../../lib/format'
import { priceFromCost, type PricingParams } from '../../../lib/pricing'
import { TagIcon } from '../../../components/icons'
import { Field, Labeled, Section } from './Field'
import type { Draft } from './draft'

/**
 * Dados comerciais — primeira seção do formulário, por pedido do dono: numa
 * loja o que importa primeiro é estoque e preço; os dados do espécime vêm
 * depois.
 */
export function CommercialSection({
  draft,
  set,
  pricing,
}: {
  draft: Draft
  set: (key: string) => (v: string) => void
  pricing: PricingParams | null
}) {
  const cost = Number(draft.cost_price) || 0
  const suggested = pricing && cost > 0 ? priceFromCost(cost, pricing) : null

  return (
    <Section title="Dados da loja" icon={<TagIcon />}>
      <Labeled label="Tipo de item">
        <select value={draft.kind} onChange={(e) => set('kind')(e.target.value)} className="input mt-1">
          {Object.entries(ITEM_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Labeled>

      <Field label="Nome" value={draft.name} onChange={set('name')} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU" value={draft.sku} onChange={set('sku')} />
        <Field label="Qtd. em estoque" value={draft.stock_quantity} onChange={set('stock_quantity')} type="number" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Preço de custo" value={draft.cost_price} onChange={set('cost_price')} type="number" />
        <Field label="Preço de venda" value={draft.sale_price} onChange={set('sale_price')} type="number" />
      </div>

      {suggested && (
        <div className="space-y-2 rounded-lg bg-stone-950 p-3 text-sm">
          <p className="text-xs text-stone-500">
            Sugestão da calculadora (
            <Link to="/precificacao" className="text-amber-500 hover:underline">
              ajustar parâmetros
            </Link>
            )
          </p>
          {(
            [
              ['Pix', suggested.pix],
              ['Cartão 1x', suggested.card1x],
              ['Cartão 3x', suggested.card3x],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-stone-400">{label}</span>
              <span className="flex items-center gap-2">
                <span className="text-stone-100">{formatMoney(value)}</span>
                <button
                  type="button"
                  onClick={() => set('sale_price')(value.toFixed(2))}
                  className="text-xs text-amber-500 hover:underline"
                >
                  usar
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

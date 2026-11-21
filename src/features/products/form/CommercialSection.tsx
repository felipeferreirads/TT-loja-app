import { Link } from 'react-router-dom'
import { ITEM_KIND_LABELS, type StoreItemKind, type StoreSkuPrefix } from '../../../types/db'
import { formatMoney } from '../../../lib/format'
import { priceFromCost, type PricingParams } from '../../../lib/pricing'
import { computeUsd } from '../../../lib/exchangeRate'
import { useLocalToggle } from '../../../lib/useLocalToggle'
import { correctedCost, useTodayFxRate } from '../costFx'
import { StackIcon, TagIcon, UnlinkIcon } from '../../../components/icons'
import { Checkbox, Field, Labeled, Section } from './Field'
import type { Draft } from './draft'

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

function toNumber(s: string | undefined): number | null {
  const t = (s ?? '').trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function formatRate(rate: number | null): string {
  return rate == null ? '' : `R$ ${rate.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} por US$`
}

/**
 * Dados comerciais — primeira seção do formulário, por pedido do dono: numa
 * loja o que importa primeiro é estoque e preço; os dados do espécime vêm
 * depois.
 */
export function CommercialSection({
  draft,
  set,
  onSkuChange,
  pricing,
  subPrefixOptions,
  manualSubPrefixId,
  onManualSubPrefixChange,
}: {
  draft: Draft
  set: (key: string) => (v: string) => void
  /** SKU tem setter próprio (em vez de `set('sku')`): editar à mão desliga a sugestão automática (ver `ProductPage.tsx`). */
  onSkuChange: (v: string) => void
  pricing: PricingParams | null
  /** Prefixos "por espécie" cadastrados em Empresa pro tipo atual (inclui os que também valem pra gema) — vazio esconde o seletor. */
  subPrefixOptions: StoreSkuPrefix[]
  /** id da linha escolhida à mão, ou null = detectar pelo nome digitado no mineral/fóssil. */
  manualSubPrefixId: string | null
  onManualSubPrefixChange: (id: string | null) => void
}) {
  const cost = Number(draft.cost_price) || 0

  // Custo em US$ e câmbio (0040): automático (R$ ÷ câmbio) ou manual — mesmo
  // comportamento do preço líquido do catálogo pessoal.
  const fxManual = draft.cost_exchange_rate_manual === 'true'
  const rate = toNumber(draft.cost_exchange_rate)
  const usdShown = fxManual ? toNumber(draft.cost_usd) : computeUsd(toNumber(draft.cost_price), rate)
  const todayRate = useTodayFxRate()
  const [useCorrected, setUseCorrected] = useLocalToggle('tt_loja_fx_correction', true)
  const corrected = correctedCost({ cost_price: toNumber(draft.cost_price), cost_usd: usdShown }, todayRate)
  const hasCorrection = corrected != null && corrected > cost
  const costForSuggestion = hasCorrection && useCorrected ? corrected : cost
  const suggested = pricing && costForSuggestion > 0 ? priceFromCost(costForSuggestion, pricing) : null

  return (
    <Section title="Dados da loja" icon={<TagIcon />}>
      {/* Pílulas de tipo — mesmo padrão visual do seletor de tipo do
          catálogo pessoal (SpecimenFormPage.tsx). */}
      <Labeled label="Tipo de item">
        <div className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(ITEM_KIND_LABELS) as StoreItemKind[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => set('kind')(value)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                draft.kind === value ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {ITEM_KIND_LABELS[value]}
            </button>
          ))}
        </div>
      </Labeled>

      <Field label="Nome" value={draft.name} onChange={set('name')} />

      {draft.parent_id ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-stone-950 px-3 py-2 text-sm text-stone-300">
          <span className="inline-flex items-center gap-1.5">
            <StackIcon className="h-4 w-4 text-stone-500" />
            Peça de lote{draft.lot_suffix ? ` · sufixo ${draft.lot_suffix}` : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              set('parent_id')('')
              set('lot_suffix')('')
            }}
            className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-red-400"
          >
            <UnlinkIcon className="h-3.5 w-3.5" />
            Desvincular
          </button>
        </div>
      ) : (
        <Checkbox
          label="Este produto é um lote (várias peças diferentes entre si)"
          checked={draft.is_lot === 'true'}
          onChange={(checked) => {
            set('is_lot')(String(checked))
            set('is_lot_summary')(String(checked))
          }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={subPrefixOptions.length > 0 ? 'flex gap-2' : undefined}>
          <div className="flex-1">
            <Field label="SKU" value={draft.sku} onChange={onSkuChange} placeholder="sugerido automaticamente" />
          </div>
          {subPrefixOptions.length > 0 && (
            <div className="w-28 shrink-0">
              <Labeled label="Sub-prefixo">
                <select
                  value={manualSubPrefixId ?? ''}
                  onChange={(e) => onManualSubPrefixChange(e.target.value || null)}
                  className="input mt-1"
                >
                  <option value="">Auto</option>
                  {subPrefixOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {capitalize(p.match_key)} → {p.prefix}
                    </option>
                  ))}
                </select>
              </Labeled>
            </div>
          )}
        </div>
        <Field label="Qtd. em estoque" value={draft.stock_quantity} onChange={set('stock_quantity')} type="number" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Preço de custo" value={draft.cost_price} onChange={set('cost_price')} type="number" />
        <Field label="Preço de venda" value={draft.sale_price} onChange={set('sale_price')} type="number" />
      </div>

      <div className="space-y-3 rounded-lg bg-stone-950 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-400">Câmbio do preço de custo</span>
          <div className="inline-flex overflow-hidden rounded-full bg-stone-800 text-xs">
            {([['false', 'Automático (PTAX)'], ['true', 'Manual']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => set('cost_exchange_rate_manual')(value)}
                className={`px-3 py-1 transition ${
                  draft.cost_exchange_rate_manual === value || (value === 'false' && draft.cost_exchange_rate_manual === '')
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-300 hover:bg-stone-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Labeled label="Preço de custo (US$)">
            {fxManual ? (
              <input
                inputMode="decimal"
                value={draft.cost_usd}
                onChange={(e) => set('cost_usd')(e.target.value)}
                className="input mt-1"
              />
            ) : (
              <input
                inputMode="decimal"
                readOnly
                disabled
                value={usdShown?.toFixed(2) ?? ''}
                title="Calculado a partir do custo em R$ e do câmbio."
                className="input mt-1 opacity-70"
              />
            )}
          </Labeled>
          <Labeled label="Câmbio (R$/US$)">
            <input
              inputMode="decimal"
              value={draft.cost_exchange_rate}
              onChange={(e) => set('cost_exchange_rate')(e.target.value)}
              placeholder={fxManual ? 'opcional' : 'automático'}
              title={fxManual ? undefined : 'Sem valor informado, a cotação PTAX da data de aquisição é usada.'}
              className="input mt-1"
            />
          </Labeled>
          <Labeled label="Preço bruto (R$)">
            <input inputMode="decimal" value={draft.cost_gross_price} onChange={(e) => set('cost_gross_price')(e.target.value)} className="input mt-1" />
          </Labeled>
          <Labeled label="Preço bruto (US$)">
            <input inputMode="decimal" value={draft.cost_gross_usd} onChange={(e) => set('cost_gross_usd')(e.target.value)} className="input mt-1" />
          </Labeled>
        </div>
        {!fxManual && draft.cost_price && !draft.cost_exchange_rate && (
          <p className="text-xs text-stone-500">
            Sem câmbio informado, a cotação PTAX da data de aquisição é buscada ao salvar. É necessário preencher a data de aquisição.
          </p>
        )}
        {hasCorrection && (
          <div className="space-y-1.5 border-t border-stone-800 pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-stone-400">Custo corrigido pelo câmbio de hoje ({formatRate(todayRate)})</span>
              <span className="font-medium text-stone-100">{formatMoney(corrected)}</span>
            </div>
            <Checkbox label="Usar o custo corrigido na sugestão de preço" checked={useCorrected} onChange={setUseCorrected} />
          </div>
        )}
      </div>

      <div>
        <Field label="Alertar com estoque ≤ (opcional)" value={draft.min_stock} onChange={set('min_stock')} type="number" placeholder="deixe em branco pra não alertar" />
        <p className="mt-1 text-xs text-stone-500">
          Deixe em branco pra peças únicas — normalmente só faz sentido pra consumíveis (embalagem, etc.) ou itens escolhidos à mão.
        </p>
      </div>

      {suggested && (
        <div className="space-y-2 rounded-lg bg-stone-950 p-3 text-sm">
          <p className="text-xs text-stone-500">
            Sugestão da calculadora{hasCorrection && useCorrected ? ` sobre o custo corrigido (${formatMoney(costForSuggestion)})` : ''} (
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

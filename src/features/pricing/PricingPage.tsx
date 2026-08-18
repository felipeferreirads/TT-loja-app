import { useEffect, useState } from 'react'
import { priceFromCost, netFromPrice, BUILTIN_PRESETS, type PricingParams } from '../../lib/pricing'
import type { StorePricingField, StorePricingPreset } from '../../types/db'
import { fetchPricingSettings, savePricingSettings, fetchPricingPresets, createPricingPreset, deletePricingPreset } from './api'
import { PresetSelect } from './PresetSelect'
import { formatMoney } from '../../lib/format'

const PARAM_LABELS: { key: StorePricingField; label: string; percent: boolean }[] = [
  { key: 'markup', label: 'Markup', percent: true },
  { key: 'discount', label: 'Desconto concedido', percent: true },
  { key: 'tax', label: 'Imposto (Simples Nacional)', percent: true },
  { key: 'card_rate', label: 'Taxa cartão', percent: true },
  { key: 'installment3_rate', label: 'Juros 3x', percent: true },
  { key: 'pix_rate', label: 'Taxa Pix', percent: true },
  { key: 'card_fixed_fee', label: 'Taxa fixa cartão', percent: false },
  { key: 'invoice_fee', label: 'Nota fiscal / DC-e', percent: false },
]

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(2).replace('.', ',')}%`
}

export function PricingPage() {
  const [params, setParams] = useState<PricingParams | null>(null)
  const [presets, setPresets] = useState<StorePricingPreset[]>([])
  const [cost, setCost] = useState('100')
  const [finalPrice, setFinalPrice] = useState('10')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPresets = () => fetchPricingPresets().then(setPresets)

  useEffect(() => {
    Promise.all([fetchPricingSettings(), fetchPricingPresets()])
      .then(([p, presetsList]) => {
        setParams(p)
        setPresets(presetsList)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  if (error) return <p className="p-6 text-sm text-red-400">{error}</p>
  if (!params) return <p className="p-6 text-sm text-stone-400">Carregando…</p>

  const prices = priceFromCost(Number(cost) || 0, params)
  const net = netFromPrice(Number(finalPrice) || 0, params)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await savePricingSettings(params)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleCreatePreset = async (field: StorePricingField, label: string, value: number) => {
    await createPricingPreset(field, label, value)
    await loadPresets()
    setParams({ ...params, [field]: value })
  }

  const handleDeletePreset = async (id: string) => {
    await deletePricingPreset(id)
    await loadPresets()
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-stone-100">Calculadora de preço</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 rounded-lg border border-stone-800 p-4">
          <h2 className="font-medium text-stone-200">Parâmetros</h2>
          {PARAM_LABELS.map(({ key, label, percent }) => (
            <PresetSelect
              key={key}
              label={label}
              percent={percent}
              value={params[key]}
              onChange={(v) => setParams({ ...params, [key]: v })}
              builtin={BUILTIN_PRESETS[key]}
              custom={presets.filter((p) => p.field === key)}
              onCreatePreset={(l, v) => handleCreatePreset(key, l, v)}
              onDeletePreset={handleDeletePreset}
            />
          ))}
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-primary w-full">
            {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar parâmetros'}
          </button>
        </section>

        <section className="space-y-3 rounded-lg border border-stone-800 p-4">
          <h2 className="font-medium text-stone-200">Custo → preço de venda</h2>
          <label className="block">
            <span className="text-sm text-stone-300">Custo do item</span>
            <input type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} className="input mt-1" />
          </label>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between border-t border-stone-800 pt-2">
              <dt className="text-stone-400">Preço Pix</dt>
              <dd className="font-medium text-stone-100">{formatMoney(prices.pix)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-400">Preço cartão 1x</dt>
              <dd className="font-medium text-stone-100">{formatMoney(prices.card1x)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-400">Preço cartão 3x</dt>
              <dd className="font-medium text-stone-100">{formatMoney(prices.card3x)}</dd>
            </div>
            <div className="flex justify-between border-t border-stone-800 pt-2">
              <dt className="text-stone-400">Desconto Pix vs. 1x</dt>
              <dd className="text-stone-300">{formatPercent(prices.pixDiscountVsCard1x)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-400">Desconto Pix vs. 3x</dt>
              <dd className="text-stone-300">{formatPercent(prices.pixDiscountVsCard3x)}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3 rounded-lg border border-stone-800 p-4">
          <h2 className="font-medium text-stone-200">Preço → líquido</h2>
          <label className="block">
            <span className="text-sm text-stone-300">Valor final da venda</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              className="input mt-1"
            />
          </label>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between border-t border-stone-800 pt-2">
              <dt className="text-stone-400">Líquido Pix</dt>
              <dd className="font-medium text-stone-100">{formatMoney(net.pix)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-400">Líquido cartão</dt>
              <dd className="font-medium text-stone-100">{formatMoney(net.card1x)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-400">Líquido cartão 3x</dt>
              <dd className="font-medium text-stone-100">{formatMoney(net.card3x)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}

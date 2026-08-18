import { useEffect, useState } from 'react'
import { priceFromCost, netFromPrice, BUILTIN_PRESETS, type PricingParams } from '../../lib/pricing'
import type { StorePricingField, StorePricingPreset } from '../../types/db'
import { fetchPricingSettings, savePricingSettings, fetchPricingPresets, createPricingPreset, deletePricingPreset } from './api'
import { PresetSelect } from './PresetSelect'
import { formatMoney } from '../../lib/format'
import { PencilIcon, LockIcon } from '../../components/icons'

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

function formatParamValue(value: number, percent: boolean): string {
  return percent ? formatPercent(value) : formatMoney(value)
}

export function PricingPage() {
  const [params, setParams] = useState<PricingParams | null>(null)
  const [presets, setPresets] = useState<StorePricingPreset[]>([])
  const [cost, setCost] = useState('100')
  const [finalPrice, setFinalPrice] = useState('10')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

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
      setEditing(false)
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
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-stone-200">Parâmetros</h2>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1 text-sm"
              >
                <PencilIcon className="h-4 w-4" />
                Editar
              </button>
            )}
          </div>

          {editing ? (
            <>
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
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar parâmetros'}
                </button>
              </div>
            </>
          ) : (
            <dl className="space-y-2 text-sm">
              {PARAM_LABELS.map(({ key, label, percent }) =>
                key === 'markup' ? (
                  <div key={key} className="flex items-center justify-between border-t border-stone-800 pt-2 first:border-t-0 first:pt-0">
                    <dt className="text-stone-400">{label}</dt>
                    <dd className="flex items-center gap-1">
                      <input
                        type="number"
                        step="1"
                        value={(params.markup * 100).toFixed(2)}
                        onChange={(e) => setParams({ ...params, markup: (Number(e.target.value) || 0) / 100 })}
                        onBlur={() => void handleSave()}
                        className="w-16 rounded border border-stone-700 bg-stone-800 px-1 py-0.5 text-right text-sm font-medium text-stone-100 outline-none focus:border-amber-600"
                      />
                      <span className="text-stone-500">%</span>
                    </dd>
                  </div>
                ) : (
                  <div key={key} className="flex items-center justify-between border-t border-stone-800 pt-2 first:border-t-0 first:pt-0">
                    <dt className="flex items-center gap-1.5 text-stone-400">
                      <LockIcon className="h-3.5 w-3.5 text-stone-600" />
                      {label}
                    </dt>
                    <dd className="font-medium text-stone-100">{formatParamValue(params[key], percent)}</dd>
                  </div>
                ),
              )}
            </dl>
          )}
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

import { supabase } from '../../lib/supabase'
import type { StorePricingField, StorePricingPreset, StorePricingSettings } from '../../types/db'
import { DEFAULT_PRICING, type PricingParams } from '../../lib/pricing'

/** Sem linha gravada ainda = usa os padrões da planilha de origem. */
export async function fetchPricingSettings(): Promise<PricingParams> {
  const { data, error } = await supabase.from('store_pricing_settings').select('*').maybeSingle()
  if (error) throw error
  if (!data) return { ...DEFAULT_PRICING }
  const row = data as StorePricingSettings
  return {
    markup: row.markup,
    discount: row.discount,
    tax: row.tax,
    card_fixed_fee: row.card_fixed_fee,
    card_rate: row.card_rate,
    installment3_rate: row.installment3_rate,
    pix_rate: row.pix_rate,
    invoice_fee: row.invoice_fee,
  }
}

export async function savePricingSettings(params: PricingParams): Promise<void> {
  const { data: session } = await supabase.auth.getUser()
  const ownerId = session.user?.id
  if (!ownerId) throw new Error('Sessão expirada.')
  const { error } = await supabase.from('store_pricing_settings').upsert({ owner_id: ownerId, ...params })
  if (error) throw error
}

// ─── Opções nomeadas (presets) por campo ───────────────────────

export async function fetchPricingPresets(): Promise<StorePricingPreset[]> {
  const { data, error } = await supabase.from('store_pricing_presets').select('*').order('created_at')
  if (error) throw error
  return data
}

export async function createPricingPreset(field: StorePricingField, label: string, value: number): Promise<StorePricingPreset> {
  const { data, error } = await supabase.from('store_pricing_presets').insert({ field, label, value }).select().single()
  if (error) throw error
  return data
}

export async function deletePricingPreset(id: string): Promise<void> {
  const { error } = await supabase.from('store_pricing_presets').delete().eq('id', id)
  if (error) throw error
}

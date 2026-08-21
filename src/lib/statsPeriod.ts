/**
 * Presets de período pro filtro das Estatísticas — lógica pura, sem UI. Mesma
 * ideia do `presetRange`/`DatePreset` de `useSpecimenBrowser.ts` do catálogo
 * pessoal, simplificado (sem i18n, sem estado na URL: aqui é `useState` local
 * na própria página, ver `StatsPage.tsx`).
 */

export type StatsPreset = 'all' | 'month' | 'last3months' | 'year' | 'custom'

export const STATS_PRESET_LABELS: Record<StatsPreset, string> = {
  all: 'Tudo',
  month: 'Este mês',
  last3months: 'Últimos 3 meses',
  year: 'Este ano',
  custom: 'Personalizado',
}

export interface DateRange {
  from: Date | null
  to: Date | null
}

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Range do preset — `to` é sempre "agora" pros presets relativos (o período
 *  não tem por que parar antes de hoje). `'custom'` não calcula nada aqui;
 *  quem monta o range é `customRange()` a partir das datas digitadas. */
export function presetRange(preset: StatsPreset): DateRange {
  const now = new Date()
  switch (preset) {
    case 'all':
      return { from: null, to: null }
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
    case 'last3months':
      return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: now }
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1), to: now }
    case 'custom':
      return { from: null, to: null }
  }
}

export function customRange(from: string, to: string): DateRange {
  return {
    from: from ? startOfDay(new Date(`${from}T00:00:00`)) : null,
    to: to ? new Date(`${to}T23:59:59`) : null,
  }
}

export function isWithinRange(isoDate: string, range: DateRange): boolean {
  if (!range.from && !range.to) return true
  const t = new Date(isoDate).getTime()
  if (range.from && t < range.from.getTime()) return false
  if (range.to && t > range.to.getTime()) return false
  return true
}

/** Período imediatamente anterior, de mesma duração — pra calcular tendência
 *  (↑/↓) comparando com o intervalo atual. `null` quando não há período
 *  anterior que faça sentido (preset 'all'/'custom' sem os dois limites). */
export function previousRange(range: DateRange): DateRange | null {
  if (!range.from || !range.to) return null
  const durationMs = range.to.getTime() - range.from.getTime()
  return { from: new Date(range.from.getTime() - durationMs), to: new Date(range.from.getTime()) }
}

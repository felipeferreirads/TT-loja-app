// Câmbio R$/US$ via PTAX (Banco Central) — cotação de fechamento oficial,
// com histórico completo por dia. Copiado do catálogo pessoal
// (`src/lib/exchangeRate.ts`), sem i18n: mensagem de erro fixa em PT.

const PTAX_PERIOD_URL = (fromMMDDYYYY: string, toMMDDYYYY: string) =>
  `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${fromMMDDYYYY}'&@dataFinalCotacao='${toMMDDYYYY}'&$orderby=dataHoraCotacao%20desc&$top=1&$format=json`

interface PtaxResponse {
  value: { cotacaoCompra: number; cotacaoVenda: number; dataHoraCotacao: string }[]
}

function toMMDDYYYY(dateISO: string): string {
  const [y, m, d] = dateISO.split('-')
  return `${m}-${d}-${y}`
}

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Data de hoje (AAAA-MM-DD) no fuso local. */
export function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Busca a cotação de fechamento (venda) do dólar na data informada. Se a
 * data cair em dia sem cotação (fim de semana/feriado — PTAX só publica em
 * dia útil), usa o último dia útil anterior (janela de 10 dias, uma única
 * requisição).
 */
export async function fetchPtaxRate(dateISO: string): Promise<number | null> {
  const res = await fetch(PTAX_PERIOD_URL(toMMDDYYYY(addDaysISO(dateISO, -9)), toMMDDYYYY(dateISO)))
  if (!res.ok) throw new Error(`Falha ao buscar o câmbio (PTAX): ${res.status}`)
  const body = (await res.json()) as PtaxResponse
  return body.value[0]?.cotacaoVenda ?? null
}

/** BRL é sempre a fonte no modo automático: US$ é derivado de R$ e do câmbio. */
export function computeUsd(brl: number | null, rate: number | null): number | null {
  if (brl == null || rate == null || rate === 0) return null
  return brl / rate
}

import type { StorePaymentMethod, StorePricingField, StorePricingSettings } from '../types/db'

/**
 * Fórmulas transcritas da planilha de precificação do dono
 * ("Planilha sem título (1).xlsx", aba Markup). Percentuais são FRAÇÕES
 * (0.3 = 30%), como na planilha.
 *
 * A lógica dos preços é "embutir na venda tudo que sai depois": custo +
 * markup + nota fiscal vira o numerador, e o denominador desconta as fatias
 * proporcionais que serão retiradas (desconto concedido, imposto, taxa da
 * maquininha/Pix) — por isso divisão, não multiplicação.
 */

export const DEFAULT_PRICING: Omit<StorePricingSettings, 'owner_id' | 'updated_at'> = {
  markup: 0.3,
  discount: 0.1,
  tax: 0.073,
  card_fixed_fee: 0.35,
  card_rate: 0.0419,
  installment3_rate: 0.0495,
  pix_rate: 0.0099,
  invoice_fee: 0.99,
}

export type PricingParams = Omit<StorePricingSettings, 'owner_id' | 'updated_at'>

/**
 * Opções nomeadas embutidas no app (não editáveis, não vêm do banco) —
 * ponto de partida pros campos que viraram seleção. O dono complementa com
 * opções próprias (persistidas em `store_pricing_presets`, ver features/pricing).
 */
export const BUILTIN_PRESETS: Record<StorePricingField, { label: string; value: number }[]> = {
  markup: [{ label: 'Padrão', value: 0.3 }],
  discount: [],
  // Simples Nacional, Anexo I — Comércio (2026).
  tax: [
    { label: '1ª faixa — até R$ 180.000', value: 0.04 },
    { label: '2ª faixa — até R$ 360.000', value: 0.073 },
    { label: '3ª faixa — até R$ 1.800.000', value: 0.107 },
  ],
  card_fixed_fee: [],
  card_rate: [],
  installment3_rate: [{ label: '3x Nuvemshop', value: 0.0495 }],
  pix_rate: [],
  invoice_fee: [],
}

export interface PriceFromCost {
  pix: number
  card1x: number
  card3x: number
  /** Desconto que pode ser anunciado no Pix em relação ao cartão (fração). */
  pixDiscountVsCard1x: number
  pixDiscountVsCard3x: number
}

/** Bloco 1 da planilha: custo → preço de venda por forma de pagamento. */
export function priceFromCost(cost: number, p: PricingParams): PriceFromCost {
  const base = cost * (1 + p.markup) + p.invoice_fee
  const discountFactor = 1 - p.discount

  const pix = base / (discountFactor * (1 - p.tax - p.pix_rate))
  const withCardFee = base + p.card_fixed_fee
  const card1x = withCardFee / (discountFactor * (1 - p.tax - p.card_rate))
  const card3x = withCardFee / (discountFactor * (1 - p.tax - p.card_rate - p.installment3_rate))

  return {
    pix,
    card1x,
    card3x,
    pixDiscountVsCard1x: card1x > 0 ? 1 - pix / card1x : 0,
    pixDiscountVsCard3x: card3x > 0 ? 1 - pix / card3x : 0,
  }
}

export interface NetFromPrice {
  pix: number
  card1x: number
  card3x: number
}

/**
 * Bloco 2 da planilha: preço final → quanto sobra líquido.
 * `discount` é o desconto concedido na venda; `pixDiscount` é o desconto
 * extra do Pix (só se aplica à linha do Pix, como na planilha).
 */
export function netFromPrice(
  finalPrice: number,
  p: PricingParams,
  opts: { discount?: number; pixDiscount?: number } = {},
): NetFromPrice {
  const discount = opts.discount ?? 0
  const pixDiscount = opts.pixDiscount ?? 0
  const afterDiscount = finalPrice * (1 - discount)

  return {
    pix: afterDiscount * (1 - pixDiscount) * (1 - p.tax - p.pix_rate) - p.invoice_fee,
    card1x: afterDiscount * (1 - p.tax - p.card_rate) - p.invoice_fee - p.card_fixed_fee,
    card3x: afterDiscount * (1 - p.tax - p.card_rate - p.installment3_rate) - p.invoice_fee - p.card_fixed_fee,
  }
}

/**
 * Quanto sobra líquido (imposto + taxa do meio de pagamento + nota fiscal já
 * descontados) de uma venda JÁ REALIZADA — `total` é o valor final gravado
 * em `store_sales.total`, já pós-desconto, então não aplica desconto de novo
 * (diferente de `netFromPrice`, que simula uma venda hipotética a partir do
 * preço de tabela). Usado pelas Estatísticas pra separar margem bruta
 * (receita − custo) de lucro líquido (receita líquida − custo).
 *
 * `cartao` assume a taxa de 1x — `store_sales` não guarda se a venda foi
 * parcelada, só a forma de pagamento. `dinheiro`/`outro` não têm taxa de
 * meio de pagamento, só imposto + nota fiscal (a nota fiscal é emitida
 * independente de como o cliente pagou).
 */
export function netFromSaleTotal(total: number, method: StorePaymentMethod, p: PricingParams): number {
  switch (method) {
    case 'pix':
      return total * (1 - p.tax - p.pix_rate) - p.invoice_fee
    case 'cartao':
      return total * (1 - p.tax - p.card_rate) - p.invoice_fee - p.card_fixed_fee
    default:
      return total * (1 - p.tax) - p.invoice_fee
  }
}

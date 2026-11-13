import type { HintOption } from '../../components/HintSelect'
import type { StoreFiscalType } from '../../types/db'

/**
 * Origem da mercadoria (tabela A do ICMS, Ajuste SINIEF 20/2012) — 1º dígito
 * do CST/CSOSN na nota fiscal. A Nuvemshop lista só 0 a 7; o 8 existe na
 * tabela oficial e fica disponível aqui.
 *
 * `label` repete o texto da Nuvemshop quando existe; `hint` explica o caso.
 * Para minerais, fósseis e meteoritos costumam valer só 0, 1 e 2 — os demais
 * ficam atrás de "Mostrar outros códigos" (ver FiscalSection).
 */
export const TAX_ORIGIN_OPTIONS: (HintOption & { common: boolean })[] = [
  {
    value: '0',
    label: '0 – Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8',
    hint: 'Item nacional, como um mineral extraído no Brasil e vendido por empresa brasileira.',
    common: true,
  },
  {
    value: '1',
    label: '1 – Estrangeira, importação direta, exceto código 6',
    hint: 'Item importado diretamente pela própria empresa.',
    common: true,
  },
  {
    value: '2',
    label: '2 – Estrangeira, adquirida no mercado interno, exceto código 7',
    hint: 'Item de origem estrangeira, comprado de outra empresa no Brasil (por exemplo, um fornecedor que importou).',
    common: true,
  },
  {
    value: '3',
    label: '3 – Nacional, conteúdo de importação superior a 40%',
    hint: 'Item industrializado no Brasil com mais de 40% de conteúdo importado.',
    common: false,
  },
  {
    value: '4',
    label: '4 – Nacional, processos produtivos básicos',
    hint: 'Item industrializado de acordo com os processos produtivos básicos das leis citadas no ajuste.',
    common: false,
  },
  {
    value: '5',
    label: '5 – Nacional, conteúdo de importação igual ou inferior a 40%',
    hint: 'Item industrializado no Brasil com até 40% de conteúdo importado.',
    common: false,
  },
  {
    value: '6',
    label: '6 – Estrangeira, importação direta, sem similar nacional',
    hint: 'Importação direta de item sem similar nacional, constante na lista da Camex.',
    common: false,
  },
  {
    value: '7',
    label: '7 – Estrangeira, adquirida no mercado interno, sem similar nacional',
    hint: 'Item estrangeiro comprado no mercado interno, sem similar nacional, constante na lista da Camex.',
    common: false,
  },
  {
    value: '8',
    label: '8 – Nacional, conteúdo de importação superior a 70%',
    hint: 'Item industrializado no Brasil com mais de 70% de conteúdo importado.',
    common: false,
  },
]

export const FISCAL_TYPE_LABELS: Record<StoreFiscalType, string> = {
  own_production: 'Produção própria',
  resale: 'Revenda',
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** NCM como `0000.00.00` (só máscara de exibição; o valor gravado é só dígitos). */
export function formatNcm(digits: string): string {
  const d = onlyDigits(digits).slice(0, 8)
  if (d.length <= 4) return d
  if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}`
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`
}

/** Mensagem de erro dos campos fiscais do rascunho, ou null se estiverem válidos (vazio é válido). */
export function validateFiscalDraft(d: Record<string, string>): string | null {
  const ncm = onlyDigits(d.ncm ?? '')
  if (ncm && ncm.length !== 8) return 'O NCM deve ter 8 dígitos.'
  const cest = onlyDigits(d.cest ?? '')
  if (cest && cest.length !== 7) return 'O CEST deve ter 7 dígitos.'
  return null
}

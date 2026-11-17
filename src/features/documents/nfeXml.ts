// Leitura do XML da NF-e (layout nacional, `nfeProc`/`NFe`/`infNFe`) para
// preencher o documento. Lógica pura, sem DOM: o layout é fixo e o arquivo é
// pequeno, então um extrator por tag basta e roda igual no navegador e nos
// testes (Node). Aceita tags com prefixo de namespace (`<nfe:det>`).
//
// COPIADO do catálogo pessoal (`src/features/documents/nfeXml.ts`) — correção
// lá vale aqui também (e vice-versa).

/** Uma linha do quadro "Dados dos produtos" (elemento `det/prod`). */
export interface NfeItem {
  product_code: string | null
  description: string | null
  ncm: string | null
  cfop: string | null
  unit: string | null
  quantity: number | null
  unit_price: number | null
  total: number | null
}

export interface NfeData {
  /** Chave de acesso (44 dígitos). */
  key: string | null
  number: string | null
  series: string | null
  /** Data de emissão, `YYYY-MM-DD`. */
  issueDate: string | null
  protocol: string | null
  /** Emitente (fornecedor numa nota de compra). */
  issuerName: string | null
  /** Só dígitos (CNPJ ou CPF). */
  issuerTaxId: string | null
  recipientName: string | null
  recipientTaxId: string | null
  items: NfeItem[]
  /** Totais (`ICMSTot`). */
  goodsTotal: number | null
  freight: number | null
  insurance: number | null
  discount: number | null
  ipi: number | null
  icmsSt: number | null
  otherExpenses: number | null
  invoiceTotal: number | null
  carrierName: string | null
  /** Informações complementares (`infAdic/infCpl`). */
  additionalInfo: string | null
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decode(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, code: string) => {
      if (code[0] === '#') {
        const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
        return Number.isFinite(n) ? String.fromCodePoint(n) : m
      }
      return ENTITIES[code.toLowerCase()] ?? m
    })
    .trim()
}

const tagRe = (tag: string, flags = '') => new RegExp(`<(?:[\\w-]+:)?${tag}\\b([^>]*)>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, flags)

/** Conteúdo bruto (sem decodificar) do primeiro `<tag>` dentro de `xml`. */
function block(xml: string | null, tag: string): string | null {
  if (!xml) return null
  const m = tagRe(tag).exec(xml)
  return m ? m[2] : null
}

/** Todos os blocos `<tag>` (conteúdo bruto). */
function blocks(xml: string | null, tag: string): string[] {
  if (!xml) return []
  return [...xml.matchAll(tagRe(tag, 'g'))].map((m) => m[2])
}

/** Texto do primeiro `<tag>` (decodificado), nulo se ausente ou vazio. */
function text(xml: string | null, tag: string): string | null {
  const raw = block(xml, tag)
  if (raw == null) return null
  const v = decode(raw)
  return v === '' ? null : v
}

/** Número no formato do XML (ponto decimal). */
function number(xml: string | null, tag: string): number | null {
  const v = text(xml, tag)
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const digits = (v: string | null) => (v ? v.replace(/\D/g, '') || null : null)

/** Indica se o texto parece um XML de NF-e (tem `infNFe`). */
export function isNfeXml(xml: string): boolean {
  return tagRe('infNFe').test(xml)
}

/** Lê o XML da NF-e. Lança erro se o arquivo não for uma NF-e. */
export function parseNfeXml(xml: string): NfeData {
  const inf = block(xml, 'infNFe')
  if (inf == null) throw new Error('O arquivo não é um XML de NF-e.')

  const infAttrs = tagRe('infNFe').exec(xml)?.[1] ?? ''
  const idKey = /Id\s*=\s*"NFe(\d{44})"/.exec(infAttrs)?.[1] ?? null
  const prot = block(xml, 'infProt')

  const ide = block(inf, 'ide')
  const emit = block(inf, 'emit')
  const dest = block(inf, 'dest')
  const tot = block(block(inf, 'total'), 'ICMSTot')
  const transp = block(inf, 'transp')
  const rawDate = text(ide, 'dhEmi') ?? text(ide, 'dEmi')

  const items: NfeItem[] = blocks(inf, 'det').map((det) => {
    const prod = block(det, 'prod')
    return {
      product_code: text(prod, 'cProd'),
      description: text(prod, 'xProd'),
      ncm: text(prod, 'NCM'),
      cfop: text(prod, 'CFOP'),
      unit: text(prod, 'uCom'),
      quantity: number(prod, 'qCom'),
      unit_price: number(prod, 'vUnCom'),
      total: number(prod, 'vProd'),
    }
  })

  return {
    key: digits(text(prot, 'chNFe')) ?? idKey,
    number: text(ide, 'nNF'),
    series: text(ide, 'serie'),
    issueDate: rawDate ? rawDate.slice(0, 10) : null,
    protocol: text(prot, 'nProt'),
    issuerName: text(emit, 'xNome'),
    issuerTaxId: digits(text(emit, 'CNPJ') ?? text(emit, 'CPF')),
    recipientName: text(dest, 'xNome'),
    recipientTaxId: digits(text(dest, 'CNPJ') ?? text(dest, 'CPF')),
    items,
    goodsTotal: number(tot, 'vProd'),
    freight: number(tot, 'vFrete'),
    insurance: number(tot, 'vSeg'),
    discount: number(tot, 'vDesc'),
    ipi: number(tot, 'vIPI'),
    icmsSt: number(tot, 'vST'),
    otherExpenses: number(tot, 'vOutro'),
    invoiceTotal: number(tot, 'vNF'),
    carrierName: text(block(transp, 'transporta'), 'xNome'),
    additionalInfo: text(block(inf, 'infAdic'), 'infCpl'),
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Valores da compra a partir dos totais da nota, no formato de "Valores da
 * compra": produtos (já com o desconto), frete e impostos/taxas somados
 * por fora do preço (IPI, ICMS-ST, seguro, outras despesas). O ICMS próprio
 * não entra: já está embutido no preço dos produtos.
 */
export function nfeAmounts(d: NfeData): { goods: number | null; freight: number | null; fees: number | null } {
  const goods = d.goodsTotal == null ? null : round2(d.goodsTotal - (d.discount ?? 0))
  const feeParts = [d.ipi, d.icmsSt, d.insurance, d.otherExpenses].filter((v): v is number => v != null && v !== 0)
  return {
    goods,
    freight: d.freight != null && d.freight !== 0 ? d.freight : null,
    fees: feeParts.length > 0 ? round2(feeParts.reduce((a, b) => a + b, 0)) : null,
  }
}

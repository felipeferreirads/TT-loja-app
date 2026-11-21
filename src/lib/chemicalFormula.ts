import { ELEMENT_SYMBOLS } from '../data/chemicalElements'

// Extrai os elementos químicos citados numa fórmula mineral (ex.
// "KAl2(AlSi3O10)(OH)2" → K, Al, Si, O, H) — usado pela categoria virtual
// "Química" (ver features/categories/chemicalElementsCategory.ts). Heurística,
// não um parser químico completo: `/[A-Z][a-z]?(?![a-zà-ÿ])/g` já separa os
// símbolos corretamente na notação padrão (maiúscula + minúscula opcional),
// inclusive dentro de soluções sólidas entre parênteses ("(Mg,Fe)2SiO4" → Mg,
// Fe, Si, O) — números, parênteses, colchetes e vírgulas nunca casam com o
// regex, e o filtro contra ELEMENT_SYMBOLS descarta qualquer token que não
// seja um elemento real. O lookahead negativo rejeita a captura quando o
// caractere seguinte ainda é minúsculo — ou seja, quando as 1-2 letras
// batidas são só o início de uma palavra maior (ex. "Paraíba" bateria "Pa",
// símbolo real de Protactínio, se não fosse essa checagem — achado real numa
// auditoria de cromóforo com "Cobre (Paraíba)" em vez de "Cobre (Cu²⁺)").
const SYMBOL_SET = new Set(ELEMENT_SYMBOLS)

export function parseFormulaElements(formula: string | null | undefined): string[] {
  if (!formula) return []
  const tokens = formula.match(/[A-Z][a-z]?(?![a-zà-ÿ])/g) ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const token of tokens) {
    if (SYMBOL_SET.has(token) && !seen.has(token)) {
      seen.add(token)
      out.push(token)
    }
  }
  return out
}

const SUPERSCRIPT_CHARS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
}

const SUBSCRIPT_CHARS: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
}

function toScript(chars: Record<string, string>, digitsAndSign: string): string {
  return digitsAndSign
    .split('')
    .map((c) => chars[c] ?? c)
    .join('')
}

/**
 * Converte texto de química colado em notação LaTeX (ex. copiado de um
 * artigo/PDF — "Manganês (\(\text{Mn}^{3+}\))", ou fórmula com "SiO_{2}")
 * pra texto plano com unicode sobrescrito/subscrito ("Manganês (Mn³⁺)",
 * "SiO₂") — a convenção de curadoria dos campos `chromophore` e `formula`
 * do catálogo, a mesma que `parseChromophoreElements`/`parseFormulaElements`
 * acima esperam (só reconhecem símbolo em texto plano, não LaTeX). Roda a
 * cada tecla nesses dois campos em `MineralPreviewPanel` — é idempotente em
 * texto sem LaTeX, então não afeta digitação normal.
 */
export function normalizeChemistryText(raw: string): string {
  const s = raw
    .replace(/\\[()[\]]/g, '') // delimitadores LaTeX \( \) \[ \]
    .replace(/\\(?:text|mathrm|mathit|mathbf)\{([^}]*)\}/g, '$1') // \text{Mn} -> Mn
    .replace(/\^\{([^}]*)\}/g, (_, inner: string) => toScript(SUPERSCRIPT_CHARS, inner)) // ^{3+} -> ³⁺
    .replace(/_\{([^}]*)\}/g, (_, inner: string) => toScript(SUBSCRIPT_CHARS, inner)) // _{2} -> ₂
    .replace(/\^([0-9]+[+-]?)/g, (_, inner: string) => toScript(SUPERSCRIPT_CHARS, inner)) // ^3+ -> ³⁺ (sem chaves)
    .replace(/_([0-9]+)/g, (_, inner: string) => toScript(SUBSCRIPT_CHARS, inner)) // _2 -> ₂ (sem chaves)
    .replace(/\\/g, '') // barras invertidas soltas restantes
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Extrai os elementos citados num texto de cromóforo (ex. "Cromo (Cr³⁺) em
 * traço" → Cr) — usado pela categoria virtual "Química" pra também contar
 * elementos que só aparecem como impureza/traço causando a cor, não na
 * fórmula da espécie (ver docs/prompt-impurezas-cromoforos.md).
 *
 * Ao contrário de `parseFormulaElements`, NÃO roda o regex no texto inteiro:
 * o nome do elemento por extenso em português engana o regex `[A-Z][a-z]?`
 * fora de contexto (ex. "Cobre" → bateria "Co", que é Cobalto, não Cobre/Cu).
 * Só considera símbolos citados entre parênteses — a convenção de curadoria
 * do campo é sempre escrever o símbolo real ali (ex. "Cromo (Cr³⁺)", "Ferro/
 * Titânio (Fe²⁺/Ti⁴⁺)"), nunca só o nome por extenso solto.
 */

export function parseChromophoreElements(chromophore: string | null | undefined): string[] {
  if (!chromophore) return []
  const parenGroups = chromophore.match(/\(([^)]*)\)/g) ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const group of parenGroups) {
    for (const el of parseFormulaElements(group)) {
      if (!seen.has(el)) {
        seen.add(el)
        out.push(el)
      }
    }
  }
  return out
}

// Normalização de endereço web digitado à mão. Copiado do catálogo pessoal
// (`src/lib/url.ts`, com testes lá) — mudança de lógica aqui deve ir pros
// dois lados, ver claude.md §2.
//
// O dono pode escrever "site.com.br" sem o protocolo; o valor salvo e o link
// clicável sempre levam "https://". Só http e https viram link.

/** Esquema explícito ("mailto:", "javascript:"), sem confundir "localhost:3000" (porta) com esquema. */
const OTHER_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i

/** "site.com" → "https://site.com". Mantém http(s)://, completa "//site.com", devolve '' para vazio. */
export function normalizeWebUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (v.startsWith('//')) return `https:${v}`
  if (OTHER_SCHEME.test(v)) return v
  return `https://${v}`
}

/** Endereço pronto para `href`: só http(s), sem espaços. `null` quando não é um link web válido. */
export function safeWebHref(raw: string | null | undefined): string | null {
  const url = normalizeWebUrl(raw ?? '')
  return /^https?:\/\/[^\s/]+\S*$/i.test(url) ? url : null
}

// Máscaras ao vivo de CPF, CNPJ e telefone brasileiro. Copiado do catálogo
// pessoal (`src/lib/brDocMask.ts` + `src/features/suppliers/phone.ts`) —
// mudança de lógica aqui deve ir pros dois lados, ver claude.md §2.
// Só pontuação sobre os dígitos digitados, sem validar dígito verificador.

/** "123.456.789-01" — aceita colar com ou sem pontuação, corta em 11 dígitos. */
export function maskCpfInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** "12.345.678/0001-90" — aceita colar com ou sem pontuação, corta em 14 dígitos. */
export function maskCnpjInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** Máscara ao vivo no campo (sem "+55" — completado por `normalizeBrazilianPhone` ao sair do campo). */
export function maskBrazilianPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)
  if (rest.length <= 4) return `(${ddd}) ${rest}`
  if (digits.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
}

/**
 * Formato final "+55 (DD) NNNNN-NNNN" (celular) ou "+55 (DD) NNNN-NNNN"
 * (fixo). Sem 10 ou 11 dígitos reconhecíveis (estrangeiro, incompleto),
 * devolve o texto original só com espaço colapsado.
 */
export function normalizeBrazilianPhone(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^\+(?!55\b)\d/.test(trimmed)) return trimmed.replace(/\s+/g, ' ')
  let digits = trimmed.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2)
  if (digits.length !== 10 && digits.length !== 11) return trimmed.replace(/\s+/g, ' ')
  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)
  const splitAt = rest.length === 9 ? 5 : 4
  return `+55 (${ddd}) ${rest.slice(0, splitAt)}-${rest.slice(splitAt)}`
}

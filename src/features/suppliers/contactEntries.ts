import type { EmailEntry, PhoneEntry } from '../../types/db'
import { normalizeBrazilianPhone } from '../../lib/brMask'

// Vários telefones/e-mails por fornecedor (0181 do catálogo). Copiado de
// `src/features/suppliers/contactEntries.ts` do catálogo pessoal (com testes
// lá) — mudança de lógica aqui deve ir pros dois lados, ver claude.md §2.
//
// Na interface é UMA lista só; no banco o primeiro item vai para as colunas
// principais (`phone`, `phone_is_whatsapp`, `phone_label`, `email`,
// `email_label`) e os demais para `extra_phones` / `extra_emails`.

export interface PhoneColumns {
  phone: string | null
  phone_is_whatsapp: boolean
  phone_label: string | null
  extra_phones: PhoneEntry[]
}

export interface EmailColumns {
  email: string | null
  email_label: string | null
  extra_emails: EmailEntry[]
}

const digitsOf = (s: string) => s.replace(/\D/g, '')

/** Chave de comparação: só dígitos, sem o "55" do Brasil à frente. */
const phoneKey = (s: string) => digitsOf(s).replace(/^55(\d{10,11})$/, '$1')

/** Lista da interface: principal primeiro, depois os extras. */
export function phoneEntriesFromRow(row: Partial<PhoneColumns> | null | undefined): PhoneEntry[] {
  if (!row) return []
  const list: PhoneEntry[] = []
  if (row.phone) list.push({ value: row.phone, whatsapp: !!row.phone_is_whatsapp, label: row.phone_label ?? '' })
  for (const e of row.extra_phones ?? []) list.push({ value: e.value, whatsapp: !!e.whatsapp, label: e.label ?? '' })
  return list
}

export function emailEntriesFromRow(row: Partial<EmailColumns> | null | undefined): EmailEntry[] {
  if (!row) return []
  const list: EmailEntry[] = []
  if (row.email) list.push({ value: row.email, label: row.email_label ?? '' })
  for (const e of row.extra_emails ?? []) list.push({ value: e.value, label: e.label ?? '' })
  return list
}

/** Sem linha vazia, sem repetido (telefone compara só os dígitos), rótulo aparado. */
export function cleanPhoneEntries(entries: PhoneEntry[], formatBR: boolean): PhoneEntry[] {
  const seen = new Set<string>()
  const out: PhoneEntry[] = []
  for (const e of entries) {
    const raw = e.value.trim()
    if (!raw) continue
    const value = formatBR ? normalizeBrazilianPhone(raw) : raw.replace(/\s+/g, ' ')
    const key = phoneKey(value) || value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ value, whatsapp: e.whatsapp, label: e.label.trim() })
  }
  return out
}

export function cleanEmailEntries(entries: EmailEntry[]): EmailEntry[] {
  const seen = new Set<string>()
  const out: EmailEntry[] = []
  for (const e of entries) {
    const value = e.value.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ value, label: e.label.trim() })
  }
  return out
}

/** Colunas a gravar a partir da lista da interface. */
export function phoneEntriesToColumns(entries: PhoneEntry[], formatBR: boolean): PhoneColumns {
  const [main, ...rest] = cleanPhoneEntries(entries, formatBR)
  return {
    phone: main?.value ?? null,
    phone_is_whatsapp: main?.whatsapp ?? false,
    phone_label: main?.label || null,
    extra_phones: rest,
  }
}

export function emailEntriesToColumns(entries: EmailEntry[]): EmailColumns {
  const [main, ...rest] = cleanEmailEntries(entries)
  return { email: main?.value ?? null, email_label: main?.label || null, extra_emails: rest }
}

/** "Rótulo: valor" curto para a tabela: principal + quantos extras existem. */
export function contactSummary(row: Partial<PhoneColumns & EmailColumns>): string {
  const phones = phoneEntriesFromRow(row)
  const emails = emailEntriesFromRow(row)
  const parts = [
    phones[0] && (phones.length > 1 ? `${phones[0].value} (+${phones.length - 1})` : phones[0].value),
    emails[0] && (emails.length > 1 ? `${emails[0].value} (+${emails.length - 1})` : emails[0].value),
  ]
  return parts.filter(Boolean).join(' · ')
}

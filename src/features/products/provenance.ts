import type { StoreProductProvenance } from '../../types/db'

// Procedência (ex-donos) — mesma lógica de `features/specimens/provenance.ts`
// do catálogo pessoal, só o lado "antes do dono": nome (cadastro ou texto
// livre), data em que comprou a peça (ano, mês/ano ou data completa, com "~"
// para aproximada) e observações.

export type DatePrecision = 'year' | 'month' | 'day'

/** Uma linha do editor. `date` é o texto digitado: "2016", "03/2016", "15/03/2016" ou "~2016". */
export interface ProvenanceDraft {
  name: string
  partyId: string | null
  date: string
  notes: string
}

export const EMPTY_PROVENANCE: ProvenanceDraft = { name: '', partyId: null, date: '', notes: '' }

const norm = (s: string) => s.trim().replace(/\s+/g, ' ')
const key = (s: string) => norm(s).toLocaleLowerCase('pt-BR')

export interface PartialDate {
  on: string
  precision: DatePrecision
  approx: boolean
}

/** "2016" → ano; "03/2016" → mês; "15/03/2016" → dia; "~" no início = aproximada. Vazio → null. */
export function parsePartialDate(input: string): PartialDate | null | 'invalid' {
  const raw = input.trim()
  if (!raw) return null
  const approx = raw.startsWith('~')
  const s = approx ? raw.slice(1).trim() : raw
  if (!s) return 'invalid'
  let m = /^(\d{4})$/.exec(s)
  if (m) return { on: `${m[1]}-01-01`, precision: 'year', approx }
  m = /^(\d{1,2})[/.-](\d{4})$/.exec(s)
  if (m) {
    const month = Number(m[1])
    if (month < 1 || month > 12) return 'invalid'
    return { on: `${m[2]}-${String(month).padStart(2, '0')}-01`, precision: 'month', approx }
  }
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s)
  if (m) {
    const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])]
    const d = new Date(Date.UTC(year, month - 1, day))
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return 'invalid'
    return { on: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, precision: 'day', approx }
  }
  return 'invalid'
}

/** Inverso de `parsePartialDate`: "2016", "03/2016", "15/03/2016", "~2016". */
export function formatPartialDate(on: string | null, precision: DatePrecision | null, approx = false): string {
  if (!on || !precision) return ''
  const [y, m, d] = on.slice(0, 10).split('-')
  const p = approx ? '~' : ''
  if (precision === 'year') return p + y
  if (precision === 'month') return `${p}${m}/${y}`
  return `${p}${d}/${m}/${y}`
}

export function filledDrafts(drafts: ProvenanceDraft[]): ProvenanceDraft[] {
  return drafts.filter((d) => norm(d.name) !== '')
}

export function draftsFromRows(rows: StoreProductProvenance[]): ProvenanceDraft[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({
      name: r.name,
      partyId: r.party_id,
      date: formatPartialDate(r.acquired_on, r.acquired_precision, r.acquired_approx),
      notes: r.notes ?? '',
    }))
}

/** Cadastro mínimo para vincular um nome: id, nome e outras grafias. */
export interface PartyRef {
  id: string
  name: string
  aliases: string[]
}

export function resolveParty(name: string, parties: PartyRef[]): string | null {
  const k = key(name)
  const hit = parties.find((p) => key(p.name) === k || p.aliases.some((a) => key(a) === k))
  return hit?.id ?? null
}

/** Linhas a gravar: sem nome são descartadas; data inválida fica vazia (o editor já avisa). */
export function provenanceRows(drafts: ProvenanceDraft[], parties: PartyRef[]) {
  return filledDrafts(drafts).map((d, i) => {
    const date = parsePartialDate(d.date)
    const valid = date && date !== 'invalid' ? date : null
    const partyId = d.partyId && parties.some((p) => p.id === d.partyId) ? d.partyId : resolveParty(d.name, parties)
    return {
      name: norm(d.name),
      party_id: partyId,
      acquired_on: valid?.on ?? null,
      acquired_precision: valid?.precision ?? null,
      acquired_approx: valid?.approx ?? false,
      notes: d.notes.trim() || null,
      sort_order: i,
    }
  })
}

// Copiado do catálogo pessoal (`src/features/documents/DocumentItemsEditor.tsx`), sem i18n.
import type { ReactNode } from 'react'
import { useConfirm } from '../../components/DialogProvider'
import { PlusIcon, TrashIcon } from '../../components/icons'
import { formatMoney } from '../../lib/format'
import type { DocumentItem } from '../../types/db'
import type { DocumentItemInput } from './api'
import type { NfeItem } from './nfeXml'
import { TABLE_WRAP, TBODY_ROW, TD, TFOOT_ROW, TH, THEAD_ROW, UNIT_CHIP } from './documentTable'

/** Linha da nota como o formulário a edita (texto nos campos numéricos). */
export interface ItemRow {
  id: string
  product_code: string
  description: string
  ncm: string
  cfop: string
  unit: string
  quantity: string
  unit_price: string
  total: string
}

export const newItemRow = (): ItemRow => ({
  id: crypto.randomUUID(),
  product_code: '',
  description: '',
  ncm: '',
  cfop: '',
  unit: '',
  quantity: '',
  unit_price: '',
  total: '',
})

/**
 * Só os dígitos, cortados no tamanho máximo DEPOIS de limpar. Sem `maxLength`
 * no campo: o navegador cortaria o texto colado antes da limpeza (ex.:
 * "7103.10.00" virava "7103.10" → "710310").
 */
export const digitsOnly = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max)

const numStr = (n: number | null) => (n == null ? '' : n.toString())

export function itemRowFrom(i: DocumentItem | NfeItem, id: string = 'id' in i ? i.id : crypto.randomUUID()): ItemRow {
  return {
    id,
    product_code: i.product_code ?? '',
    description: i.description ?? '',
    ncm: i.ncm ?? '',
    cfop: i.cfop ?? '',
    unit: i.unit ?? '',
    quantity: numStr(i.quantity),
    unit_price: numStr(i.unit_price),
    total: numStr(i.total),
  }
}

const txt = (s: string) => (s.trim() === '' ? null : s.trim())
const num = (s: string) => {
  if (s.trim() === '') return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Quantidade × valor unitário, arredondado a centavos (nulo se faltar um dos dois). */
export function computedItemTotal(row: Pick<ItemRow, 'quantity' | 'unit_price'>): number | null {
  const q = num(row.quantity)
  const u = num(row.unit_price)
  return q == null || u == null ? null : Math.round(q * u * 100) / 100
}

/** Linha tem algum dado digitado (linhas em branco não são gravadas). */
export const itemRowFilled = (r: ItemRow) =>
  [r.product_code, r.description, r.ncm, r.cfop, r.unit, r.quantity, r.unit_price, r.total].some((v) => v.trim() !== '')

/** Linhas preenchidas no formato da API; total vazio vira quantidade × valor unitário. */
export function itemInputs(rows: ItemRow[]): DocumentItemInput[] {
  return rows.filter(itemRowFilled).map((r) => ({
    id: r.id,
    product_code: txt(r.product_code),
    description: txt(r.description),
    ncm: txt(r.ncm),
    cfop: txt(r.cfop),
    unit: txt(r.unit)?.toUpperCase() ?? null,
    quantity: num(r.quantity),
    unit_price: num(r.unit_price),
    total: num(r.total) ?? computedItemTotal(r),
  }))
}

/** Soma dos totais das linhas (nulo sem nenhum total). */
export function itemsSum(rows: Pick<DocumentItemInput, 'total'>[]): number | null {
  const totals = rows.map((r) => r.total).filter((v): v is number => v != null)
  return totals.length === 0 ? null : Math.round(totals.reduce((a, b) => a + b, 0) * 100) / 100
}

/** Editor das linhas de produto da NF-e (quadro "Dados dos produtos" do DANFE). */
export function DocumentItemsEditor({ rows, onChange }: { rows: ItemRow[]; onChange: (rows: ItemRow[]) => void }) {
  const confirm = useConfirm()
  const setRow = (id: string, patch: Partial<ItemRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const total = itemsSum(itemInputs(rows))

  return (
    <div className="space-y-3">
      <span className="block text-xs text-stone-400">{'Produtos da nota'}</span>
      {rows.length === 0 && <p className="text-sm text-stone-500">{'Nenhuma linha. Adicione as linhas da nota ou leia o XML.'}</p>}
      {rows.map((r, i) => {
        const auto = computedItemTotal(r)
        return (
          <div key={r.id} className="space-y-3 rounded-lg border border-stone-800 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-stone-400">{`Linha ${i + 1}`}</span>
              <button
                type="button"
                onClick={async () => {
                  if (itemRowFilled(r) && !(await confirm('Remover esta linha da nota?', { danger: true }))) return
                  onChange(rows.filter((x) => x.id !== r.id))
                }}
                className="rounded p-1 text-stone-400 transition hover:bg-stone-800 hover:text-red-400"
                title={'Remover linha'}
                aria-label={'Remover linha'}
              >
                <TrashIcon />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ItemField label={'Código'}>
                <input value={r.product_code} onChange={(e) => setRow(r.id, { product_code: e.target.value })} className="input" />
              </ItemField>
              <ItemField label={'NCM'}>
                <input
                  inputMode="numeric"
                  value={r.ncm}
                  onChange={(e) => setRow(r.id, { ncm: digitsOnly(e.target.value, 8) })}
                  className="input font-mono"
                />
              </ItemField>
              <ItemField label={'CFOP'}>
                <input
                  inputMode="numeric"
                  value={r.cfop}
                  onChange={(e) => setRow(r.id, { cfop: digitsOnly(e.target.value, 4) })}
                  className="input font-mono"
                />
              </ItemField>
            </div>
            <ItemField label={'Descrição'}>
              <input value={r.description} onChange={(e) => setRow(r.id, { description: e.target.value })} className="input" />
            </ItemField>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ItemField label={'Unidade'}>
                <input
                  value={r.unit}
                  onChange={(e) => setRow(r.id, { unit: e.target.value.replace(/\s/g, '').toUpperCase().slice(0, 6) })}
                  placeholder="KG, UN, G…"
                  className="input"
                />
              </ItemField>
              <ItemField label={'Quantidade'}>
                <input inputMode="decimal" value={r.quantity} onChange={(e) => setRow(r.id, { quantity: e.target.value })} className="input" />
              </ItemField>
              <ItemField label={'Valor unitário'}>
                <input inputMode="decimal" value={r.unit_price} onChange={(e) => setRow(r.id, { unit_price: e.target.value })} className="input" />
              </ItemField>
              <ItemField label={'Valor total'}>
                <input
                  inputMode="decimal"
                  value={r.total}
                  onChange={(e) => setRow(r.id, { total: e.target.value })}
                  placeholder={auto != null ? auto.toString() : undefined}
                  title={'Vazio: quantidade × valor unitário.'}
                  className="input"
                />
              </ItemField>
            </div>
          </div>
        )
      })}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => onChange([...rows, newItemRow()])} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
          <PlusIcon /> {'Adicionar linha'}
        </button>
        {total != null && (
          <p className="text-sm text-stone-300">
            <span className="text-stone-400">{'Total das linhas'}:</span>{' '}
            <span className="font-semibold text-amber-400">{formatMoney(total, 'BRL')}</span>
          </p>
        )}
      </div>
    </div>
  )
}

function ItemField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block w-full min-w-0">
      <span className="mb-1 block text-xs text-stone-400">{label}</span>
      {children}
    </label>
  )
}

/** Tabela das linhas na página do documento (somente leitura). Colunas sem nenhum dado são omitidas. */
export function DocumentItemsTable({ items, money }: { items: DocumentItem[]; money: (value: number) => string }) {
  if (items.length === 0) return null
  const total = itemsSum(items)
  const qty = (n: number | null) => (n == null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 4 }))
  const showCode = items.some((i) => i.product_code)
  // NCM e CFOP dividem uma coluna (um sobre o outro) para a tabela caber na página.
  const showFiscal = items.some((i) => i.ncm || i.cfop)
  // Colunas antes do total: descrição, unidade, quantidade, valor unitário e as opcionais.
  const leadingCols = 4 + Number(showCode) + Number(showFiscal)
  const mono = `${TD} font-mono text-xs text-stone-400`
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-xs font-medium text-stone-400">{'Produtos da nota'}</h3>
      <div className={TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead>
            <tr className={THEAD_ROW}>
              {showCode && <th className={TH}>{'Código'}</th>}
              <th className={TH}>{'Descrição'}</th>
              {showFiscal && <th className={TH}>{'NCM'} / {'CFOP'}</th>}
              <th className={TH}>{'Unidade'}</th>
              <th className={`${TH} text-right`}>{'Quantidade'}</th>
              <th className={`${TH} text-right`}>{'Valor unitário'}</th>
              <th className={`${TH} text-right`}>{'Valor total'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className={TBODY_ROW}>
                {showCode && <td className={mono}>{i.product_code ?? '—'}</td>}
                <td className={`${TD} min-w-32 font-medium text-stone-100`}>{i.description ?? '—'}</td>
                {showFiscal && (
                  <td className={mono}>
                    <span className="block text-stone-300">{i.ncm ?? '—'}</span>
                    <span className="block">{i.cfop ?? '—'}</span>
                  </td>
                )}
                <td className={TD}>{i.unit ? <span className={UNIT_CHIP}>{i.unit}</span> : <span className="text-stone-600">—</span>}</td>
                <td className={`${TD} text-right text-stone-300 tabular-nums`}>{qty(i.quantity)}</td>
                <td className={`${TD} text-right whitespace-nowrap text-stone-300 tabular-nums`}>{i.unit_price != null ? money(i.unit_price) : '—'}</td>
                <td className={`${TD} text-right font-semibold whitespace-nowrap text-stone-100 tabular-nums`}>{i.total != null ? money(i.total) : '—'}</td>
              </tr>
            ))}
          </tbody>
          {total != null && items.length > 1 && (
            <tfoot>
              <tr className={TFOOT_ROW}>
                <td colSpan={leadingCols} className={`${TD} text-right text-xs font-medium text-stone-400`}>
                  {'Total das linhas'}
                </td>
                <td className={`${TD} text-right font-semibold whitespace-nowrap text-amber-400 tabular-nums`}>{money(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { StoreSupplier } from '../../types/db'
import type { StoreSupplierInput } from './api'
import { CountrySelect } from '../../components/CountrySelect'
import { maskCnpjInput, maskCpfInput } from '../../lib/brMask'
import { normalizeWebUrl } from '../../lib/url'
import type { EmailEntry, PhoneEntry } from '../../types/db'
import { emailEntriesFromRow, emailEntriesToColumns, phoneEntriesFromRow, phoneEntriesToColumns } from './contactEntries'
import { EmailsEditor, PhonesEditor } from './ContactFields'

interface Props {
  supplier: StoreSupplier | null
  onSave: (input: StoreSupplierInput) => Promise<void>
  onClose: () => void
  /** Mesmo cadastro (`suppliers`) para fornecedor e cliente (0193 do catálogo); muda só o título e o tipo padrão. */
  role?: 'supplier' | 'customer'
}

const FIELDS = [
  'legal_name', 'tax_id', 'website',
  'address_zip', 'address_street', 'address_number', 'address_complement',
  'address_district', 'address_city', 'address_state', 'notes',
] as const
type TextField = (typeof FIELDS)[number]

export function SupplierFormDialog({ supplier, onSave, onClose, role = 'supplier' }: Props) {
  const isCustomer = role === 'customer'
  const [name, setName] = useState(supplier?.name ?? '')
  const [kind, setKind] = useState<StoreSupplier['kind']>(supplier?.kind ?? (isCustomer ? 'person' : 'company'))
  const [country, setCountry] = useState(supplier?.address_country ?? 'BR')
  const [phones, setPhones] = useState<PhoneEntry[]>(() => phoneEntriesFromRow(supplier))
  const [emails, setEmails] = useState<EmailEntry[]>(() => emailEntriesFromRow(supplier))
  const [text, setText] = useState<Record<TextField, string>>(
    () => Object.fromEntries(FIELDS.map((f) => [f, supplier?.[f] ?? ''])) as Record<TextField, string>,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isBR = country === 'BR'
  const field = (key: TextField) => ({
    value: text[key],
    onChange: (e: { target: { value: string } }) => setText((t) => ({ ...t, [key]: e.target.value })),
    className: 'input mt-1',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const clean = Object.fromEntries(FIELDS.map((f) => [f, text[f].trim() || null])) as Record<TextField, string | null>
      await onSave({
        ...clean,
        name: name.trim(),
        kind,
        tax_id_type: clean.tax_id ? (isBR ? (kind === 'person' ? 'cpf' : 'cnpj') : 'foreign') : null,
        // Site sem protocolo ("site.com") é salvo com "https://".
        website: normalizeWebUrl(clean.website ?? '') || null,
        // O primeiro telefone/e-mail vai para as colunas principais, o resto para as listas extras.
        ...phoneEntriesToColumns(phones, isBR),
        ...emailEntriesToColumns(emails),
        address_country: country || null,
        address_district: isBR ? clean.address_district : null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  const docLabel = isBR ? (kind === 'person' ? 'CPF' : 'CNPJ') : 'Documento fiscal (Tax ID)'

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-stone-900 p-5"
      >
        <h2 className="text-lg font-bold text-stone-100">
          {isCustomer ? (supplier ? 'Editar cliente' : 'Novo cliente') : supplier ? 'Editar fornecedor' : 'Novo fornecedor'}
        </h2>
        {supplier?.in_collection && (
          <p className="text-xs text-stone-500">Cadastro compartilhado com a Coleção. As alterações valem nos dois apps.</p>
        )}
        {supplier && (isCustomer ? supplier.is_supplier : supplier.is_customer) && (
          <p className="text-xs text-stone-500">
            {isCustomer ? 'Este cadastro também é fornecedor.' : 'Este cadastro também é cliente.'} As alterações valem para os dois papéis.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm text-stone-300">Nome</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Tipo</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as StoreSupplier['kind'])} className="input mt-1">
              <option value="company">Pessoa jurídica</option>
              <option value="person">Pessoa física</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">{kind === 'person' ? 'Nome completo' : 'Razão social'}</span>
            <input {...field('legal_name')} />
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">{docLabel} (se tiver)</span>
            <input
              {...field('tax_id')}
              onChange={(e) =>
                setText((t) => ({
                  ...t,
                  tax_id: isBR ? (kind === 'person' ? maskCpfInput : maskCnpjInput)(e.target.value) : e.target.value,
                }))
              }
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Site</span>
            {/* Texto livre (não type="url"): o navegador recusaria "site.com" sem
                protocolo. O "https://" é completado ao sair do campo. */}
            <input
              {...field('website')}
              inputMode="url"
              autoCapitalize="none"
              placeholder="site.com.br"
              onBlur={() => setText((t) => ({ ...t, website: normalizeWebUrl(t.website) }))}
            />
          </label>
          <div className="sm:col-span-2">
            <span className="text-sm text-stone-300">Telefones</span>
            <div className="mt-1">
              <PhonesEditor entries={phones} onChange={setPhones} isBR={isBR} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <span className="text-sm text-stone-300">E-mails</span>
            <div className="mt-1">
              <EmailsEditor entries={emails} onChange={setEmails} />
            </div>
          </div>
        </div>

        <fieldset className="grid gap-3 sm:grid-cols-6">
          <legend className="mb-1 text-sm font-medium text-stone-200">Endereço</legend>
          <label className="block sm:col-span-3">
            <span className="text-sm text-stone-300">País</span>
            <div className="mt-1">
              <CountrySelect value={country} onChange={setCountry} />
            </div>
          </label>
          <label className="block sm:col-span-3">
            <span className="text-sm text-stone-300">{isBR ? 'CEP' : 'Código postal'}</span>
            <input {...field('address_zip')} />
          </label>
          <label className="block sm:col-span-4">
            <span className="text-sm text-stone-300">Rua</span>
            <input {...field('address_street')} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-stone-300">Número</span>
            <input {...field('address_number')} />
          </label>
          <label className={`block ${isBR ? 'sm:col-span-3' : 'sm:col-span-6'}`}>
            <span className="text-sm text-stone-300">Complemento</span>
            <input {...field('address_complement')} />
          </label>
          {isBR && (
            <label className="block sm:col-span-3">
              <span className="text-sm text-stone-300">Bairro</span>
              <input {...field('address_district')} />
            </label>
          )}
          <label className="block sm:col-span-3">
            <span className="text-sm text-stone-300">Cidade</span>
            <input {...field('address_city')} />
          </label>
          <label className="block sm:col-span-3">
            <span className="text-sm text-stone-300">{isBR ? 'Estado' : 'Estado / Província'}</span>
            <input {...field('address_state')} />
          </label>
        </fieldset>

        <label className="block">
          <span className="text-sm text-stone-300">Notas</span>
          <textarea {...field('notes')} className="input mt-1 min-h-20" />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={busy} className="btn-primary flex-1">
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { StoreSupplier } from '../../types/db'
import type { StoreSupplierInput } from './api'
import { CountrySelect } from '../../components/CountrySelect'
import { maskBrazilianPhoneInput, maskCnpjInput, maskCpfInput, normalizeBrazilianPhone } from '../../lib/brMask'

interface Props {
  supplier: StoreSupplier | null
  onSave: (input: StoreSupplierInput) => Promise<void>
  onClose: () => void
}

const FIELDS = [
  'legal_name', 'tax_id', 'email', 'phone', 'website',
  'address_zip', 'address_street', 'address_number', 'address_complement',
  'address_district', 'address_city', 'address_state', 'notes',
] as const
type TextField = (typeof FIELDS)[number]

export function SupplierFormDialog({ supplier, onSave, onClose }: Props) {
  const [name, setName] = useState(supplier?.name ?? '')
  const [kind, setKind] = useState<StoreSupplier['kind']>(supplier?.kind ?? 'company')
  const [country, setCountry] = useState(supplier?.address_country ?? 'BR')
  const [whatsapp, setWhatsapp] = useState(supplier?.phone_is_whatsapp ?? false)
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
        phone_is_whatsapp: whatsapp && !!clean.phone,
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
        <h2 className="text-lg font-bold text-stone-100">{supplier ? 'Editar fornecedor' : 'Novo fornecedor'}</h2>
        {supplier?.in_collection && (
          <p className="text-xs text-stone-500">Cadastro compartilhado com a Coleção — alterações valem nos dois apps.</p>
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
            <span className="text-sm text-stone-300">E-mail</span>
            <input type="email" {...field('email')} />
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Telefone</span>
            <input
              type="tel"
              {...field('phone')}
              onChange={(e) =>
                setText((t) => ({ ...t, phone: isBR ? maskBrazilianPhoneInput(e.target.value) : e.target.value }))
              }
              onBlur={() => {
                if (isBR) setText((t) => ({ ...t, phone: normalizeBrazilianPhone(t.phone) }))
              }}
            />
            <span className="mt-1 flex items-center gap-2 text-xs text-stone-400">
              <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
              É WhatsApp
            </span>
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Site</span>
            <input type="url" {...field('website')} />
          </label>
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

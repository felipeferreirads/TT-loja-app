import { useEffect, useState, type ChangeEvent } from 'react'
import type { StoreCompanyDocument } from '../../types/db'
import {
  fetchCompany,
  saveCompany,
  fetchCompanyDocuments,
  uploadCompanyDocument,
  deleteCompanyDocument,
  type StoreCompanyInput,
} from './api'
import { signedUrl } from '../../lib/storage'
import { useConfirm, usePrompt } from '../../components/DialogProvider'
import { CopyIcon, CheckIcon, DocumentIcon, TrashIcon, PencilIcon, EyeIcon, EyeOffIcon } from '../../components/icons'
import { SkuPrefixesSection } from './SkuPrefixesSection'

type Field = { key: keyof StoreCompanyInput; label: string; wide?: boolean }

const IDENTITY_FIELDS: Field[] = [
  { key: 'legal_name', label: 'Razão social', wide: true },
  { key: 'trade_name', label: 'Nome fantasia', wide: true },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'tax_regime', label: 'Regime tributário' },
  { key: 'state_registration', label: 'Inscrição estadual' },
  { key: 'municipal_registration', label: 'Inscrição municipal' },
]

const CONTACT_FIELDS: Field[] = [
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
]

const ADDRESS_FIELDS: Field[] = [
  { key: 'address_zip', label: 'CEP' },
  { key: 'address_street', label: 'Rua' },
  { key: 'address_number', label: 'Número' },
  { key: 'address_complement', label: 'Complemento' },
  { key: 'address_district', label: 'Bairro' },
  { key: 'address_city', label: 'Cidade' },
  { key: 'address_state', label: 'UF' },
]

const PARTNER_IDENTITY_FIELDS: Field[] = [
  { key: 'partner_name', label: 'Nome', wide: true },
  { key: 'partner_nationality', label: 'Nacionalidade' },
  { key: 'partner_marital_status', label: 'Estado civil' },
  { key: 'partner_cpf', label: 'CPF' },
  { key: 'partner_rg', label: 'RG' },
]

const PARTNER_ADDRESS_FIELDS: Field[] = [
  { key: 'partner_address_zip', label: 'CEP' },
  { key: 'partner_address_street', label: 'Rua' },
  { key: 'partner_address_number', label: 'Número' },
  { key: 'partner_address_complement', label: 'Complemento' },
  { key: 'partner_address_district', label: 'Bairro' },
  { key: 'partner_address_city', label: 'Cidade' },
  { key: 'partner_address_state', label: 'UF' },
]

function formatDateBR(value?: string | null): string {
  if (!value) return ''
  const [y, m, d] = value.split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

function buildCompanyText(form: StoreCompanyInput): string {
  const lines: string[] = []
  const push = (label: string, value?: string | null) => {
    if (value && value.trim()) lines.push(`${label}: ${value.trim()}`)
  }
  push('Razão social', form.legal_name)
  push('Nome fantasia', form.trade_name)
  push('CNPJ', form.cnpj)
  push('Regime tributário', form.tax_regime)
  push('Inscrição estadual', form.state_registration)
  push('Inscrição municipal', form.municipal_registration)
  push('E-mail', form.email)
  push('Telefone', form.phone)

  const addressParts = [
    form.address_street && form.address_number
      ? `${form.address_street}, ${form.address_number}`
      : form.address_street,
    form.address_complement,
    form.address_district,
    form.address_city && form.address_state
      ? `${form.address_city}/${form.address_state}`
      : form.address_city ?? form.address_state,
    form.address_zip ? `CEP ${form.address_zip}` : null,
  ].filter(Boolean)
  if (addressParts.length > 0) lines.push(`Endereço: ${addressParts.join(', ')}`)

  if (form.notes && form.notes.trim()) lines.push(`Notas: ${form.notes.trim()}`)

  return lines.join('\n')
}

function FieldGroup({
  title,
  fields,
  form,
  onChange,
}: {
  title: string
  fields: Field[]
  form: StoreCompanyInput
  onChange: (key: keyof StoreCompanyInput, value: string) => void
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, wide }) => (
          <label key={key} className={wide ? 'col-span-2 block' : 'block'}>
            <span className="text-sm text-stone-300">{label}</span>
            <input
              value={(form[key] as string) ?? ''}
              onChange={(e) => onChange(key, e.target.value)}
              className="input mt-1"
            />
          </label>
        ))}
      </div>
    </div>
  )
}

function FieldGroupReadOnly({ title, fields, form }: { title: string; fields: Field[]; form: StoreCompanyInput }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
      <dl className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, wide }) => (
          <div key={key} className={wide ? 'col-span-2' : undefined}>
            <dt className="text-sm text-stone-400">{label}</dt>
            <dd className="mt-0.5 truncate text-sm text-stone-100">{(form[key] as string) || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function CompanyPage() {
  const [form, setForm] = useState<StoreCompanyInput | null>(null)
  const [savedForm, setSavedForm] = useState<StoreCompanyInput | null>(null)
  const [docs, setDocs] = useState<StoreCompanyDocument[]>([])
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [partnerVisible, setPartnerVisible] = useState(false)
  const [partnerEditing, setPartnerEditing] = useState(false)
  const confirm = useConfirm()
  const prompt = usePrompt()

  const loadDocs = () => {
    fetchCompanyDocuments()
      .then(setDocs)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }

  useEffect(() => {
    fetchCompany()
      .then((c) => {
        setForm(c ?? {})
        setSavedForm(c ?? {})
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
    loadDocs()
  }, [])

  if (error && !form) return <p className="p-6 text-sm text-red-400">{error}</p>
  if (!form) return <p className="p-6 text-sm text-stone-400">Carregando…</p>

  const setField = (key: keyof StoreCompanyInput, value: string) => setForm({ ...form, [key]: value })

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveCompany(form)
      setSavedForm(form)
      setSaved(true)
      setEditing(false)
      setPartnerEditing(false)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = () => {
    if (savedForm) setForm(savedForm)
    setEditing(false)
  }

  const handlePartnerCancel = () => {
    if (savedForm) setForm(savedForm)
    setPartnerEditing(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCompanyText(form))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const title = await prompt('Nome do documento:', file.name, { title: 'Novo documento' })
    if (title === null) return
    setUploading(true)
    setError(null)
    try {
      await uploadCompanyDocument(file, { title: title.trim() || file.name })
      loadDocs()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  const handleOpen = async (doc: StoreCompanyDocument) => {
    try {
      window.open(await signedUrl(doc.storage_path), '_blank', 'noopener')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDelete = async (doc: StoreCompanyDocument) => {
    if (!(await confirm(`Apagar "${doc.title}"? Essa ação não pode ser desfeita.`, { danger: true }))) return
    await deleteCompanyDocument(doc)
    loadDocs()
  }

  const initials = (form.trade_name || form.legal_name || 'E')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-900/40 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-lg font-semibold text-amber-50">
            {initials || 'E'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-100">
              {form.trade_name || form.legal_name || 'Empresa'}
            </h1>
            <p className="text-sm text-stone-500">{form.cnpj || 'CNPJ não informado'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void handleCopy()} className="btn-secondary inline-flex items-center gap-1.5">
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar dados'}
          </button>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-5 rounded-xl border border-stone-800 bg-stone-900/20 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-stone-200">Dados cadastrais</h2>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1 text-sm"
              >
                <PencilIcon className="h-4 w-4" />
                Editar
              </button>
            )}
          </div>

          {editing ? (
            <>
              <FieldGroup title="Identificação" fields={IDENTITY_FIELDS} form={form} onChange={setField} />
              <FieldGroup title="Contato" fields={CONTACT_FIELDS} form={form} onChange={setField} />
              <FieldGroup title="Endereço" fields={ADDRESS_FIELDS} form={form} onChange={setField} />
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Notas</h3>
                <textarea
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input min-h-20 w-full"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleCancel} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="button" onClick={() => void handleSave()} disabled={busy} className="btn-primary flex-1">
                  {busy ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
                </button>
              </div>
            </>
          ) : (
            <>
              <FieldGroupReadOnly title="Identificação" fields={IDENTITY_FIELDS} form={form} />
              <FieldGroupReadOnly title="Contato" fields={CONTACT_FIELDS} form={form} />
              <FieldGroupReadOnly title="Endereço" fields={ADDRESS_FIELDS} form={form} />
              {form.notes && form.notes.trim() && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Notas</h3>
                  <p className="whitespace-pre-wrap text-sm text-stone-100">{form.notes}</p>
                </div>
              )}
            </>
          )}
        </section>

        <section className="space-y-5 rounded-xl border border-stone-800 bg-stone-900/20 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-stone-200">Sócio</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPartnerVisible((v) => !v)}
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1 text-sm"
              >
                {partnerVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                {partnerVisible ? 'Ocultar' : 'Mostrar'}
              </button>
              {partnerVisible && !partnerEditing && (
                <button
                  type="button"
                  onClick={() => setPartnerEditing(true)}
                  className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1 text-sm"
                >
                  <PencilIcon className="h-4 w-4" />
                  Editar
                </button>
              )}
            </div>
          </div>

          {!partnerVisible ? (
            <p className="rounded-lg border border-dashed border-stone-800 py-8 text-center text-sm text-stone-500">
              Dados ocultos. Clique em "Mostrar" para ver.
            </p>
          ) : partnerEditing ? (
            <>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Identificação</h3>
                <div className="grid grid-cols-2 gap-3">
                  {PARTNER_IDENTITY_FIELDS.map(({ key, label, wide }) => (
                    <label key={key} className={wide ? 'col-span-2 block' : 'block'}>
                      <span className="text-sm text-stone-300">{label}</span>
                      <input
                        value={(form[key] as string) ?? ''}
                        onChange={(e) => setField(key, e.target.value)}
                        className="input mt-1"
                      />
                    </label>
                  ))}
                  <label className="block">
                    <span className="text-sm text-stone-300">Nascimento</span>
                    <input
                      type="date"
                      value={form.partner_birth_date ?? ''}
                      onChange={(e) => setField('partner_birth_date', e.target.value)}
                      className="input mt-1"
                    />
                  </label>
                </div>
              </div>
              <FieldGroup title="Endereço" fields={PARTNER_ADDRESS_FIELDS} form={form} onChange={setField} />
              <div className="flex gap-2">
                <button type="button" onClick={handlePartnerCancel} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="button" onClick={() => void handleSave()} disabled={busy} className="btn-primary flex-1">
                  {busy ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Identificação</h3>
                <dl className="grid grid-cols-2 gap-3">
                  {PARTNER_IDENTITY_FIELDS.map(({ key, label, wide }) => (
                    <div key={key} className={wide ? 'col-span-2' : undefined}>
                      <dt className="text-sm text-stone-400">{label}</dt>
                      <dd className="mt-0.5 truncate text-sm text-stone-100">{(form[key] as string) || '—'}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-sm text-stone-400">Nascimento</dt>
                    <dd className="mt-0.5 truncate text-sm text-stone-100">{formatDateBR(form.partner_birth_date) || '—'}</dd>
                  </div>
                </dl>
              </div>
              <FieldGroupReadOnly title="Endereço" fields={PARTNER_ADDRESS_FIELDS} form={form} />
            </>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-stone-800 bg-stone-900/20 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-stone-200">Documentos</h2>
            <label className="btn-secondary cursor-pointer">
              {uploading ? 'Enviando…' : 'Adicionar'}
              <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
          <p className="text-xs text-stone-500">Contrato social, alvará, certidões — arquivos privados.</p>

          {docs.length === 0 && (
            <p className="rounded-lg border border-dashed border-stone-800 py-8 text-center text-sm text-stone-500">
              Nenhum documento ainda.
            </p>
          )}
          <div className="space-y-1">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-stone-800 px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  onClick={() => void handleOpen(doc)}
                  className="flex min-w-0 items-center gap-2 text-stone-200 hover:underline"
                >
                  <DocumentIcon className="h-4 w-4 shrink-0 text-stone-500" />
                  <span className="truncate">{doc.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(doc)}
                  className="shrink-0 text-stone-500 hover:text-red-400"
                  aria-label="Apagar documento"
                  title="Apagar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <SkuPrefixesSection />
      </div>
    </div>
  )
}

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

const FIELDS: { key: keyof StoreCompanyInput; label: string; wide?: boolean }[] = [
  { key: 'legal_name', label: 'Razão social', wide: true },
  { key: 'trade_name', label: 'Nome fantasia', wide: true },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'state_registration', label: 'Inscrição estadual' },
  { key: 'municipal_registration', label: 'Inscrição municipal' },
  { key: 'tax_regime', label: 'Regime tributário' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'address_zip', label: 'CEP' },
  { key: 'address_street', label: 'Rua' },
  { key: 'address_number', label: 'Número' },
  { key: 'address_complement', label: 'Complemento' },
  { key: 'address_district', label: 'Bairro' },
  { key: 'address_city', label: 'Cidade' },
  { key: 'address_state', label: 'UF' },
]

export function CompanyPage() {
  const [form, setForm] = useState<StoreCompanyInput | null>(null)
  const [docs, setDocs] = useState<StoreCompanyDocument[]>([])
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirm = useConfirm()
  const prompt = usePrompt()

  const loadDocs = () => {
    fetchCompanyDocuments()
      .then(setDocs)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }

  useEffect(() => {
    fetchCompany()
      .then((c) => setForm(c ?? {}))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
    loadDocs()
  }, [])

  if (error && !form) return <p className="p-6 text-sm text-red-400">{error}</p>
  if (!form) return <p className="p-6 text-sm text-stone-400">Carregando…</p>

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveCompany(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
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

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Empresa</h1>
        </div>
        <button type="button" onClick={() => void handleSave()} disabled={busy} className="btn-primary">
          {busy ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
        </button>
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-stone-800 p-4">
          <h2 className="mb-3 font-medium text-stone-200">Dados cadastrais</h2>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(({ key, label, wide }) => (
              <label key={key} className={wide ? 'col-span-2 block' : 'block'}>
                <span className="text-sm text-stone-300">{label}</span>
                <input
                  value={(form[key] as string) ?? ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="input mt-1"
                />
              </label>
            ))}
            <label className="col-span-2 block">
              <span className="text-sm text-stone-300">Notas</span>
              <textarea
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input mt-1 min-h-20"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-stone-800 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-stone-200">Documentos</h2>
            <label className="btn-secondary cursor-pointer">
              {uploading ? 'Enviando…' : 'Adicionar'}
              <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
          <p className="text-xs text-stone-500">Contrato social, alvará, certidões — arquivos privados.</p>

          {docs.length === 0 && <p className="text-sm text-stone-400">Nenhum documento ainda.</p>}
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between border-t border-stone-800 pt-2 text-sm">
              <button type="button" onClick={() => void handleOpen(doc)} className="text-stone-200 hover:underline">
                {doc.title}
              </button>
              <button type="button" onClick={() => void handleDelete(doc)} className="text-red-400 hover:underline">
                Apagar
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAlert, useConfirm } from '../../../components/DialogProvider'
import type { StoreProductCertificate } from '../../../types/db'
import { useUserId } from '../../auth/AuthProvider'
import { signedUrl } from '../../../lib/storage'
import {
  addCertificate,
  fetchCertificates,
  removeCertificate,
  removeCertificateFile,
  updateCertificateFields,
  uploadCertificateFile,
  type CertificateInput,
} from '../certificates'
import { CertificateIcon } from '../../../components/icons'
import { Section } from './Field'

/** Um certificado sem nenhum campo preenchido e sem arquivo não tem nada a mostrar. */
function isBlank(input: CertificateInput): boolean {
  return !input.lab && !input.code && !input.link && !input.notes
}

interface DraftCertificate {
  tempId: string
  lab: string | null
  code: string | null
  link: string | null
  notes: string | null
}

/**
 * Bloco "Certificados de autenticidade" na ficha do produto — copiado do
 * catálogo pessoal (SpecimenCertificates.tsx), simplificado: sem gate de
 * modo de edição (a ficha da loja é sempre editável) e sem miniatura de
 * PDF/self-heal (poucos certificados esperados, decisão do dono). Certificado
 * novo nasce como rascunho local e só vira registro no banco quando algo é
 * preenchido ou um arquivo é anexado.
 */
export function CertificatesSection({ productId }: { productId: string }) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const alert = useAlert()
  const ownerId = useUserId()
  const [drafts, setDrafts] = useState<DraftCertificate[]>([])
  const { data: certificates, isLoading, error } = useQuery({
    queryKey: ['product-certificates', productId],
    queryFn: () => fetchCertificates(productId),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['product-certificates', productId] })

  const handleAdd = () => {
    setDrafts((prev) => [...prev, { tempId: crypto.randomUUID(), lab: null, code: null, link: null, notes: null }])
  }

  const removeDraft = (tempId: string) => setDrafts((prev) => prev.filter((d) => d.tempId !== tempId))

  const materializeDraft = async (tempId: string, fields: CertificateInput): Promise<string> => {
    const newId = await addCertificate(productId, fields, certificates?.length ?? 0)
    removeDraft(tempId)
    refresh()
    return newId
  }

  const handleRemove = async (certificate: StoreProductCertificate) => {
    if (!(await confirm('Apagar este certificado?', { danger: true, confirmLabel: 'Apagar certificado' }))) return
    try {
      await removeCertificate(certificate)
      refresh()
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao apagar certificado.')
    }
  }

  return (
    <Section title="Certificados de autenticidade" icon={<CertificateIcon />}>
      {isLoading && <p className="text-sm text-stone-500">Carregando…</p>}
      {error && <p className="text-sm text-red-400">{error instanceof Error ? error.message : 'Erro ao carregar.'}</p>}
      {!isLoading && !error && (
        <div className="space-y-3">
          {(certificates ?? []).length === 0 && drafts.length === 0 && (
            <p className="text-sm text-stone-500">Nenhum certificado cadastrado.</p>
          )}
          {(certificates ?? []).map((c) => (
            <CertificateCard
              key={c.id}
              certificate={c}
              ownerId={ownerId}
              onSaved={refresh}
              onRemove={() => handleRemove(c)}
            />
          ))}
          {drafts.map((d) => (
            <DraftCertificateCard
              key={d.tempId}
              draft={d}
              ownerId={ownerId}
              productId={productId}
              onMaterialize={materializeDraft}
              onRemove={() => removeDraft(d.tempId)}
            />
          ))}
          <button type="button" onClick={handleAdd} className="btn-secondary">
            + Adicionar certificado
          </button>
        </div>
      )}
    </Section>
  )
}

function DraftCertificateCard({
  draft,
  ownerId,
  productId,
  onMaterialize,
  onRemove,
}: {
  draft: DraftCertificate
  ownerId: string
  productId: string
  onMaterialize: (tempId: string, fields: CertificateInput) => Promise<string>
  onRemove: () => void
}) {
  const alert = useAlert()
  const [f, setF] = useState<CertificateInput>({ lab: draft.lab, code: draft.code, link: draft.link, notes: draft.notes })
  const [busy, setBusy] = useState(false)
  const txt = (s: string) => (s.trim() === '' ? null : s.trim())

  const handleBlur = async () => {
    if (isBlank(f)) return
    try {
      await onMaterialize(draft.tempId, f)
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao criar certificado.')
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const newId = await onMaterialize(draft.tempId, f)
      const kind = file.type === 'application/pdf' ? 'pdf' : 'image'
      const shell: StoreProductCertificate = {
        id: newId,
        owner_id: ownerId,
        product_id: productId,
        lab: f.lab,
        code: f.code,
        link: f.link,
        notes: f.notes,
        pdf_path: null,
        image_path: null,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      await uploadCertificateFile(ownerId, shell, kind, file)
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao subir arquivo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-stone-700 p-3">
      <div className="grid grid-cols-2 gap-3">
        <CertField label="Laboratório" value={f.lab ?? ''} onChange={(v) => setF((prev) => ({ ...prev, lab: txt(v) }))} onBlur={handleBlur} />
        <CertField label="Código" value={f.code ?? ''} onChange={(v) => setF((prev) => ({ ...prev, code: txt(v) }))} onBlur={handleBlur} />
      </div>
      <CertField label="Link" value={f.link ?? ''} onChange={(v) => setF((prev) => ({ ...prev, link: txt(v) }))} onBlur={handleBlur} placeholder="https://…" />
      <label className="block w-full">
        <span className="mb-1 block text-xs text-stone-400">Observações</span>
        <textarea
          rows={2}
          value={f.notes ?? ''}
          onChange={(e) => setF((prev) => ({ ...prev, notes: txt(e.target.value) }))}
          onBlur={handleBlur}
          className="input"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn-secondary cursor-pointer">
          {busy ? 'Enviando…' : 'Anexar arquivo'}
          <input
            type="file"
            accept="application/pdf,image/*"
            disabled={busy}
            onChange={(e) => {
              void handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
            className="hidden"
          />
        </label>
      </div>
      <button type="button" onClick={onRemove} className="btn-danger text-xs">
        Apagar certificado
      </button>
    </div>
  )
}

function CertificateCard({
  certificate,
  ownerId,
  onSaved,
  onRemove,
}: {
  certificate: StoreProductCertificate
  ownerId: string
  onSaved: () => void
  onRemove: () => void
}) {
  const alert = useAlert()
  const [f, setF] = useState<CertificateInput>({
    lab: certificate.lab,
    code: certificate.code,
    link: certificate.link,
    notes: certificate.notes,
  })
  const [busy, setBusy] = useState(false)
  const txt = (s: string) => (s.trim() === '' ? null : s.trim())

  const handleBlur = async () => {
    try {
      await updateCertificateFields(certificate.id, f)
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao salvar certificado.')
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const kind = file.type === 'application/pdf' ? 'pdf' : 'image'
    setBusy(true)
    try {
      await uploadCertificateFile(ownerId, certificate, kind, file)
      onSaved()
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao subir arquivo.')
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveFile = async (kind: 'pdf' | 'image') => {
    setBusy(true)
    try {
      await removeCertificateFile(certificate, kind)
      onSaved()
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao remover arquivo.')
    } finally {
      setBusy(false)
    }
  }

  const handleOpenFile = async (path: string) => {
    const url = await signedUrl(path)
    window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="space-y-3 rounded-lg border border-stone-800 p-3">
      <div className="grid grid-cols-2 gap-3">
        <CertField label="Laboratório" value={f.lab ?? ''} onChange={(v) => setF((prev) => ({ ...prev, lab: txt(v) }))} onBlur={handleBlur} />
        <CertField label="Código" value={f.code ?? ''} onChange={(v) => setF((prev) => ({ ...prev, code: txt(v) }))} onBlur={handleBlur} />
      </div>
      <CertField label="Link" value={f.link ?? ''} onChange={(v) => setF((prev) => ({ ...prev, link: txt(v) }))} onBlur={handleBlur} placeholder="https://…" />
      <label className="block w-full">
        <span className="mb-1 block text-xs text-stone-400">Observações</span>
        <textarea
          rows={2}
          value={f.notes ?? ''}
          onChange={(e) => setF((prev) => ({ ...prev, notes: txt(e.target.value) }))}
          onBlur={handleBlur}
          className="input"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {certificate.pdf_path && (
          <FileChip label="PDF" busy={busy} onOpen={() => void handleOpenFile(certificate.pdf_path!)} onRemove={() => handleRemoveFile('pdf')} />
        )}
        {certificate.image_path && (
          <FileChip label="Imagem" busy={busy} onOpen={() => void handleOpenFile(certificate.image_path!)} onRemove={() => handleRemoveFile('image')} />
        )}
        <label className="btn-secondary cursor-pointer">
          {busy ? 'Enviando…' : 'Anexar arquivo'}
          <input
            type="file"
            accept="application/pdf,image/*"
            disabled={busy}
            onChange={(e) => {
              void handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
            className="hidden"
          />
        </label>
      </div>

      <button type="button" onClick={onRemove} className="btn-danger text-xs">
        Apagar certificado
      </button>
    </div>
  )
}

function FileChip({ label, busy, onOpen, onRemove }: { label: string; busy: boolean; onOpen: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-stone-700 px-2 py-1 text-xs text-stone-300">
      <button type="button" onClick={onOpen} className="hover:underline">
        {label}
      </button>
      <button type="button" onClick={onRemove} disabled={busy} aria-label={`Remover ${label}`} className="text-stone-500 hover:text-red-400">
        ✕
      </button>
    </div>
  )
}

function CertField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  placeholder?: string
}) {
  return (
    <label className="block w-full">
      <span className="mb-1 block text-xs text-stone-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} className="input" />
    </label>
  )
}

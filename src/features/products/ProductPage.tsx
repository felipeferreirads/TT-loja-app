import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { StoreItemKind } from '../../types/db'
import { fetchProduct, createProduct, updateProduct, uploadProductMedia } from './api'
import { ProductMediaGallery } from './ProductMediaGallery'
import { fetchPricingSettings } from '../pricing/api'
import type { PricingParams } from '../../lib/pricing'
import { lookupMineral, type MineralAutoInfo } from '../../lib/mineralReference'
import { CommercialSection } from './form/CommercialSection'
import { SpecimenDataSection } from './form/SpecimenDataSection'
import { MineralPropertiesSection } from './form/MineralPropertiesSection'
import { FossilTaxonomySection } from './form/FossilTaxonomySection'
import { PendingMedia } from './form/PendingMedia'
import { LinkedDocuments } from './form/LinkedDocuments'
import { Section } from './form/Field'
import { toDraft, toInput, type Draft } from './form/draft'
import { ArrowLeftIcon } from '../../components/icons'

export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'novo'
  const navigate = useNavigate()

  const [draft, setDraft] = useState<Draft | null>(isNew ? toDraft(null) : null)
  const [autoFields, setAutoFields] = useState<string[]>([])
  const [mineralReferenceId, setMineralReferenceId] = useState<string | null>(null)
  const [pricing, setPricing] = useState<PricingParams | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPricingSettings().then(setPricing).catch(() => {})
    if (isNew || !id) return
    fetchProduct(id)
      .then((p) => {
        setDraft(toDraft(p))
        setAutoFields(p.auto_fields ?? [])
        setMineralReferenceId(p.mineral_reference_id)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [id, isNew])

  if (error && !draft) return <p className="text-sm text-red-400">{error}</p>
  if (!draft) return <p className="text-sm text-stone-400">Carregando…</p>

  const set = (key: string) => (v: string) => setDraft((d) => ({ ...(d as Draft), [key]: v }))
  const setMany = (values: Draft) => setDraft((d) => ({ ...(d as Draft), ...values }))
  const kind = draft.kind as StoreItemKind

  const handleAutofill = (referenceId: string | null, filledKeys: string[]) => {
    setMineralReferenceId(referenceId)
    setAutoFields((prev) => [...new Set([...prev, ...filledKeys])])
  }

  /** Editar um campo automático à mão o congela: sai de `auto_fields` e para
   *  de acompanhar o catálogo. */
  const handleManualEdit = (key: string) => setAutoFields((prev) => prev.filter((k) => k !== key))

  /** Volta ao valor atual do catálogo para aquele campo. */
  const handleRestoreAuto = async (key: string) => {
    const hit = await lookupMineral(draft.species)
    const value = hit?.info[key as keyof MineralAutoInfo]
    if (!value) return
    setMany({ [key]: value })
    setAutoFields((prev) => [...new Set([...prev, key])])
  }

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      const input = toInput(draft, autoFields, mineralReferenceId)
      if (isNew) {
        // Id gerado no cliente para que as mídias escolhidas antes de salvar
        // tenham um destino conhecido — o upload acontece logo após o insert.
        const newId = crypto.randomUUID()
        await createProduct({ ...input, id: newId })
        for (const file of pendingFiles) await uploadProductMedia(newId, file)
        navigate(`/produtos/${newId}`, { replace: true })
      } else if (id) {
        await updateProduct(id, input)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <header className="mb-4 flex items-start justify-between">
        <div>
          <Link to="/produtos" className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200">
            <ArrowLeftIcon />
            Produtos
          </Link>
          <h1 className="text-xl font-bold text-stone-100">{isNew ? 'Novo produto' : draft.name || 'Produto'}</h1>
        </div>
        <button type="button" onClick={() => void handleSave()} disabled={busy} className="btn-primary">
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <CommercialSection draft={draft} set={set} pricing={pricing} />

          {kind !== 'other' && (
            <SpecimenDataSection
              draft={draft}
              set={set}
              setMany={setMany}
              kind={kind}
              onAutofill={handleAutofill}
            />
          )}

          {kind === 'fossil' && <FossilTaxonomySection draft={draft} set={set} />}
        </div>

        <div className="space-y-4">
          {(kind === 'mineral' || kind === 'gem') && (
            <MineralPropertiesSection
              draft={draft}
              set={set}
              autoFields={autoFields}
              onManualEdit={handleManualEdit}
              onRestoreAuto={(key) => void handleRestoreAuto(key)}
            />
          )}

          {isNew ? (
            <PendingMedia files={pendingFiles} onChange={setPendingFiles} />
          ) : (
            id && <ProductMediaGallery productId={id} />
          )}

          {!isNew && id && <LinkedDocuments productId={id} />}

          <Section title="Notas">
            <textarea
              value={draft.notes}
              onChange={(e) => set('notes')(e.target.value)}
              placeholder="Observações internas sobre o item."
              className="input min-h-20"
            />
          </Section>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { StoreItemKind, StoreProduct, StoreProductFossilSpecies, StoreProductMineral } from '../../types/db'
import {
  fetchProduct,
  createProduct,
  updateProduct,
  uploadProductMedia,
  fetchFossilSpecies,
  addFossilSpecies,
  updateFossilSpecies,
  removeFossilSpecies,
  addProductMineral,
  updateProductMineral,
  removeProductMineral,
} from './api'
import { ProductMediaGallery } from './ProductMediaGallery'
import { ProductYoutubeGallery } from './ProductYoutubeGallery'
import { fetchPricingSettings } from '../pricing/api'
import type { PricingParams } from '../../lib/pricing'
import { CommercialSection } from './form/CommercialSection'
import { SpecimenDataSection } from './form/SpecimenDataSection'
import { MineralsInSampleSection, mineralRowToDraft, mineralRowToInput, type MineralRowDraft } from './form/MineralsInSampleSection'
import { FossilTaxonomySection, fossilSpeciesToDraft, fossilSpeciesToInput, type FossilSpeciesDraft } from './form/FossilTaxonomySection'
import { EcommerceSection } from './form/EcommerceSection'
import { PendingMedia } from './form/PendingMedia'
import { LinkedDocuments } from './form/LinkedDocuments'
import { QrLinkSection } from './form/QrLinkSection'
import { Section } from './form/Field'
import { toDraft, toInput, type Draft } from './form/draft'
import { ArrowLeftIcon, NotesIcon } from '../../components/icons'
import { ExportMenu } from './export/ExportMenu'
import { addYoutubeVideo } from './youtubeVideos'

export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'novo'
  const navigate = useNavigate()

  const [draft, setDraft] = useState<Draft | null>(isNew ? toDraft(null) : null)
  const [pricing, setPricing] = useState<PricingParams | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingYoutube, setPendingYoutube] = useState<string[]>([])
  const [fossilSpecies, setFossilSpecies] = useState<FossilSpeciesDraft[]>([])
  const [originalFossilSpecies, setOriginalFossilSpecies] = useState<StoreProductFossilSpecies[]>([])
  const [minerals, setMinerals] = useState<MineralRowDraft[]>([])
  const [originalMinerals, setOriginalMinerals] = useState<StoreProductMineral[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Guardado à parte do draft (que só tem strings) pra alimentar o
  // ExportMenu e a seção de QR com os tipos reais de StoreProduct.
  const [savedProduct, setSavedProduct] = useState<StoreProduct | null>(null)

  const refreshProduct = () => {
    if (!id || isNew) return
    fetchProduct(id).then(setSavedProduct).catch(() => {})
  }

  useEffect(() => {
    fetchPricingSettings().then(setPricing).catch(() => {})
    if (isNew || !id) return
    fetchProduct(id)
      .then((p) => {
        setDraft(toDraft(p))
        setSavedProduct(p)
        setOriginalMinerals(p.minerals ?? [])
        setMinerals((p.minerals ?? []).map(mineralRowToDraft))
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
    fetchFossilSpecies(id)
      .then((rows) => {
        setOriginalFossilSpecies(rows)
        setFossilSpecies(rows.map(fossilSpeciesToDraft))
      })
      .catch(() => {})
  }, [id, isNew])

  if (error && !draft) return <p className="text-sm text-red-400">{error}</p>
  if (!draft) return <p className="text-sm text-stone-400">Carregando…</p>

  const set = (key: string) => (v: string) => setDraft((d) => ({ ...(d as Draft), [key]: v }))
  const setMany = (values: Draft) => setDraft((d) => ({ ...(d as Draft), ...values }))
  const kind = draft.kind as StoreItemKind

  /** Reconcilia a lista de espécies do fóssil contra o banco: remove as que
   *  saíram da lista, atualiza as existentes, cria as novas. */
  const saveFossilSpecies = async (productId: string) => {
    if (kind !== 'fossil') return
    const currentIds = new Set(fossilSpecies.filter((s) => s.id).map((s) => s.id))
    for (const original of originalFossilSpecies) {
      if (!currentIds.has(original.id)) await removeFossilSpecies(original.id)
    }
    for (const [i, s] of fossilSpecies.entries()) {
      const input = fossilSpeciesToInput(s)
      if (s.id) await updateFossilSpecies(s.id, input)
      else await addFossilSpecies(productId, input, i)
    }
  }

  /** Mesma reconciliação, pros minerais da amostra (0015). */
  const saveMinerals = async (productId: string) => {
    if (kind !== 'mineral' && kind !== 'gem') return
    const currentIds = new Set(minerals.filter((m) => m.id).map((m) => m.id))
    for (const original of originalMinerals) {
      if (!currentIds.has(original.id)) await removeProductMineral(original.id)
    }
    for (const [i, m] of minerals.entries()) {
      const input = mineralRowToInput(m)
      if (m.id) await updateProductMineral(m.id, input)
      else await addProductMineral(productId, input, i)
    }
  }

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      const input = toInput(draft)
      if (isNew) {
        // Id gerado no cliente para que fotos/vídeos escolhidos antes de
        // salvar tenham um destino conhecido — o upload acontece logo após o insert.
        const newId = crypto.randomUUID()
        const created = await createProduct({ ...input, id: newId })
        for (const file of pendingFiles) await uploadProductMedia(newId, file)
        for (const [i, youtubeId] of pendingYoutube.entries()) {
          await addYoutubeVideo(newId, youtubeId, null, i)
        }
        await saveFossilSpecies(newId)
        await saveMinerals(newId)
        setSavedProduct(created)
        navigate(`/produtos/${newId}`, { replace: true })
      } else if (id) {
        setSavedProduct(await updateProduct(id, input))
        await saveFossilSpecies(id)
        await saveMinerals(id)
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
        <div className="flex items-center gap-2">
          {savedProduct && (
            <ExportMenu products={[savedProduct]} filename={savedProduct.ecommerce_slug || savedProduct.sku || savedProduct.id} />
          )}
          <button type="button" onClick={() => void handleSave()} disabled={busy} className="btn-primary">
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {/* Fotos e vídeos primeiro (pedido do dono, 18/08/2026) — é a primeira
          coisa que aparece na ficha, antes até dos dados comerciais. */}
      <div className="mb-4">
        {isNew ? (
          <PendingMedia files={pendingFiles} onChange={setPendingFiles} youtube={pendingYoutube} onYoutubeChange={setPendingYoutube} />
        ) : (
          id && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ProductMediaGallery productId={id} />
              <ProductYoutubeGallery productId={id} />
            </div>
          )
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <CommercialSection draft={draft} set={set} pricing={pricing} />

          {kind !== 'other' && (
            <SpecimenDataSection draft={draft} set={set} setMany={setMany} kind={kind} />
          )}

          {kind === 'fossil' && <FossilTaxonomySection species={fossilSpecies} onChange={setFossilSpecies} />}

          {!isNew && savedProduct && <QrLinkSection product={savedProduct} onChanged={refreshProduct} />}
        </div>

        <div className="space-y-4">
          {!isNew && id && <LinkedDocuments productId={id} />}

          <EcommerceSection draft={draft} set={set} />

          {(kind === 'mineral' || kind === 'gem') && (
            <MineralsInSampleSection minerals={minerals} onChange={setMinerals} />
          )}

          <Section title="Notas" icon={<NotesIcon />}>
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

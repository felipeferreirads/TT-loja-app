import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { StoreItemKind, StoreProduct, StoreProductFossilSpecies, StoreProductMineral, StoreSkuPrefix } from '../../types/db'
import {
  fetchProduct,
  fetchProductChildren,
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
import { fetchSkuPrefixes, suggestSku } from './skuPrefixes'
import { LotItemsSection } from './LotItemsSection'
import { nextLotSuffix } from './lots'
import { ProductStockHistorySection } from './ProductStockHistorySection'
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
import { CertificatesSection } from './form/CertificatesSection'
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
  const [searchParams] = useSearchParams()
  const lotId = searchParams.get('lot')

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
  const [skuPrefixes, setSkuPrefixes] = useState<StoreSkuPrefix[]>([])
  // SKU nasce "automático" (sugerido sozinho, sem botão — igual o catálogo
  // pessoal): true enquanto o dono não editar o campo à mão. Editar uma vez
  // desliga a sugestão pro resto da criação, pra não sobrescrever o que ele
  // digitou quando a espécie mudar de novo.
  const [skuAuto, setSkuAuto] = useState(true)
  // Sub-prefixo escolhido à mão (id de uma linha "por espécie" cadastrada em
  // Empresa) — sobrepõe a detecção automática pelo nome digitado no mineral/
  // fóssil. null = automático (comportamento de sempre).
  const [manualSubPrefixId, setManualSubPrefixId] = useState<string | null>(null)

  const refreshProduct = () => {
    if (!id || isNew) return
    fetchProduct(id).then(setSavedProduct).catch(() => {})
  }

  // Depois de registrar uma entrada de estoque, o `stock_quantity` real já
  // mudou no banco (a RPC soma direto) — sincroniza o número exibido no
  // campo "Qtd. em estoque" sem o dono precisar recarregar a página.
  const refreshStock = () => {
    if (!id || isNew) return
    fetchProduct(id)
      .then((p) => {
        setSavedProduct(p)
        setDraft((d) => (d ? { ...d, stock_quantity: String(p.stock_quantity) } : d))
      })
      .catch(() => {})
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

  useEffect(() => {
    fetchSkuPrefixes().then(setSkuPrefixes).catch(() => {})
  }, [])

  // "Adicionar peça" a partir de um lote (LotItemsSection) chega aqui como
  // /produtos/novo?lot=<id> — prefill de parent_id + próximo sufixo livre e
  // o mesmo tipo do lote, pra não obrigar o dono a escolher tipo de novo.
  useEffect(() => {
    if (!isNew || !lotId) return
    Promise.all([fetchProduct(lotId), fetchProductChildren(lotId)])
      .then(([lot, children]) => {
        setDraft((d) => (d ? { ...d, parent_id: lotId, lot_suffix: String(nextLotSuffix(children)), kind: lot.kind } : d))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, lotId])

  // O sub-prefixo escolhido à mão depende do tipo (as opções mudam) — trocar
  // o tipo de item invalida a escolha anterior.
  useEffect(() => {
    setManualSubPrefixId(null)
  }, [draft?.kind])

  // ----- sugestão automática de SKU (só na criação, e só enquanto o dono não
  //       mexeu no campo à mão) — mesmo espírito do "Preencher código
  //       automaticamente" do catálogo pessoal (suggestNextCodes em
  //       specimens/api.ts), sem toggle de preferência nem botão: aqui é
  //       sempre ligado. Debounce curto porque a espécie muda a cada tecla
  //       digitada no autocomplete de mineral/fóssil. -----
  useEffect(() => {
    if (!isNew || !skuAuto || !draft) return
    const kind = draft.kind as StoreItemKind
    // Sub-prefixo manual vence o nome digitado — o `match_key` da linha já é
    // exatamente o valor que `resolvePrefix` compara (normalizado), então dá
    // pra passar direto no lugar da espécie detectada.
    const manualRow = manualSubPrefixId ? skuPrefixes.find((p) => p.id === manualSubPrefixId) : undefined
    const species = manualRow
      ? manualRow.match_key
      : kind === 'mineral'
        ? minerals[0]?.name?.trim() || null
        : kind === 'fossil'
          ? fossilSpecies[0]?.name?.trim() || null
          : null
    const isGem = kind === 'mineral' && draft.is_gem === 'true'
    const timer = setTimeout(() => {
      suggestSku(kind, species, isGem, skuPrefixes)
        .then((sku) => setDraft((d) => (d ? { ...d, sku } : d)))
        .catch(() => {})
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, skuAuto, draft?.kind, draft?.is_gem, minerals[0]?.name, fossilSpecies[0]?.name, skuPrefixes, manualSubPrefixId])

  if (error && !draft) return <p className="text-sm text-red-400">{error}</p>
  if (!draft) return <p className="text-sm text-stone-400">Carregando…</p>

  const set = (key: string) => (v: string) => setDraft((d) => ({ ...(d as Draft), [key]: v }))
  const setMany = (values: Draft) => setDraft((d) => ({ ...(d as Draft), ...values }))
  const kind = draft.kind as StoreItemKind
  // Editar o SKU à mão desliga a sugestão automática pro resto da criação.
  const setSku = (v: string) => {
    setSkuAuto(false)
    set('sku')(v)
  }
  // Sub-prefixos por espécie cadastrados pro tipo atual — mesma lista vale
  // pra gema (a espécie continua sendo do mineral, `is_gem` não filtra aqui).
  const subPrefixOptions = skuPrefixes.filter((p) => p.kind === kind && p.match_key !== '')

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
    if (kind !== 'mineral') return
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
    <div className="mx-auto max-w-6xl">
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
          <CommercialSection
            draft={draft}
            set={set}
            onSkuChange={setSku}
            pricing={pricing}
            subPrefixOptions={isNew ? subPrefixOptions : []}
            manualSubPrefixId={manualSubPrefixId}
            onManualSubPrefixChange={setManualSubPrefixId}
          />

          {kind !== 'other' && (
            <SpecimenDataSection draft={draft} set={set} setMany={setMany} kind={kind} />
          )}

          {kind === 'fossil' && <FossilTaxonomySection species={fossilSpecies} onChange={setFossilSpecies} />}

          {!isNew && savedProduct?.is_lot && <LotItemsSection lot={savedProduct} />}

          {!isNew && savedProduct && <QrLinkSection product={savedProduct} onChanged={refreshProduct} />}

          {!isNew && id && <CertificatesSection productId={id} />}
        </div>

        <div className="space-y-4">
          {!isNew && id && <ProductStockHistorySection productId={id} onStockChanged={refreshStock} />}

          {!isNew && id && <LinkedDocuments productId={id} />}

          <EcommerceSection draft={draft} set={set} />

          <Section title="Notas" icon={<NotesIcon />}>
            <textarea
              value={draft.notes}
              onChange={(e) => set('notes')(e.target.value)}
              placeholder="Observações internas sobre o item."
              className="input min-h-20"
            />
          </Section>

          {kind === 'mineral' && (
            <MineralsInSampleSection minerals={minerals} onChange={setMinerals} />
          )}
        </div>
      </div>
    </div>
  )
}

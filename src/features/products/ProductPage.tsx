import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { StoreItemKind, StoreProduct, StoreProductFossilSpecies, StoreProductMineral, StoreProductRock, StoreSkuPrefix } from '../../types/db'
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
  addProductRock,
  updateProductRock,
  removeProductRock,
  fetchProvenance,
  saveProvenance,
} from './api'
import { AcquisitionSection } from './form/AcquisitionSection'
import { draftsFromRows, provenanceRows, type ProvenanceDraft } from './provenance'
import { OtherDetailsSection } from './form/OtherDetailsSection'
import { ProductCategoriesSection } from '../categories/ProductCategoriesSection'
import { setProductCategories } from '../categories/api'
import { mineralsSectionApplies } from './form/mineralRoles'
import { fetchSuppliersWithStorefronts, SUPPLIERS_WITH_STOREFRONTS_KEY } from '../suppliers/api'
import { useQuery } from '@tanstack/react-query'
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
import { JewelryDataSection } from './form/JewelryDataSection'
import { MineralsInSampleSection, mineralRowToDraft, mineralRowToInput, type MineralRowDraft } from './form/MineralsInSampleSection'
import { RocksInSampleSection } from './form/RocksInSampleSection'
import { isBlankRockRow, rockRowToDraft, rockRowToInput, rocksSectionApplies, type RockRowDraft } from './form/rockFields'
import { FossilTaxonomySection, fossilSpeciesToDraft, fossilSpeciesToInput, type FossilSpeciesDraft } from './form/FossilTaxonomySection'
import { EcommerceSection } from './form/EcommerceSection'
import { FiscalSection } from './form/FiscalSection'
import { validateFiscalDraft } from './fiscal'
import { PendingMedia } from './form/PendingMedia'
import { LinkedDocuments } from './form/LinkedDocuments'
import { CertificatesSection } from './form/CertificatesSection'
import { QrLinkSection } from './form/QrLinkSection'
import { Section } from './form/Field'
import { toDraft, toInput, type Draft } from './form/draft'
import { resolveCostFx } from './costFx'
import { ArrowLeftIcon, CardIcon, CopyIcon, LabelIcon, NotesIcon } from '../../components/icons'
import { ActionMenu } from '../../components/ActionMenu'
import { CopyFromProductDialog } from './form/CopyFromProductDialog'
import { LabelsDialog } from './labels/LabelsDialog'
import { SocialCardDialog } from './social/SocialCardDialog'
import { useCoverUrls } from './queries'
import { ExportMenu } from './export/ExportMenu'
import { addYoutubeVideo } from './youtubeVideos'
import { isUuidLike } from './qr'
import { useToast } from '../../components/ToastProvider'
import { queryClient } from '../../lib/queryClient'
import {
  getBrowseNeighbors,
  getBrowseSeqKey,
  getBrowseSequencesVersion,
  GRID_SEQ,
  setBrowseReturnTarget,
  subscribeBrowseSequences,
} from '../../lib/browseSequence'
import { useSwipeNavigation } from '../../lib/useSwipeNavigation'
import { PRODUCTS_KEY } from './productsCache'
import { ProductPeek } from './ProductPeek'

/**
 * Remonta a ficha a cada produto (`key`): ao deslizar para o vizinho, o
 * formulário inteiro (rascunho, minerais, rochas, fotos...) recomeça limpo, sem
 * mostrar dados do produto anterior enquanto o novo carrega.
 */
export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  return <ProductPageContent key={id} />
}

function ProductPageContent() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'novo'
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const lotId = searchParams.get('lot')
  // Criação a partir de uma etiqueta QR "reservada" (`/produtos/novo?reservedId=<uuid>`,
  // ver `LotItemsSection.tsx` "Nova peça com etiqueta reservada"): o produto
  // nasce com ESSE uuid em vez de um sorteado — mesmo mecanismo do catálogo
  // pessoal (`SpecimenFormPage.tsx`).
  const reservedIdParam = isNew ? searchParams.get('reservedId') : null
  const reservedId = reservedIdParam && isUuidLike(reservedIdParam) ? reservedIdParam : null

  // Produto já na lista em cache (veio da lista ou do deslizar): o rascunho nasce
  // pronto, sem "Carregando…"; a leitura completa logo abaixo o substitui.
  const cachedProduct = !isNew && id ? queryClient.getQueryData<StoreProduct[]>(PRODUCTS_KEY)?.find((x) => x.id === id) : undefined
  const [draft, setDraft] = useState<Draft | null>(isNew ? toDraft(null) : cachedProduct ? toDraft(cachedProduct) : null)
  // Rascunho como foi carregado/salvo pela última vez: base para saber se há edição não salva.
  const baselineRef = useRef<string | null>(cachedProduct ? JSON.stringify(toDraft(cachedProduct)) : null)
  const [pricing, setPricing] = useState<PricingParams | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingYoutube, setPendingYoutube] = useState<string[]>([])
  const [fossilSpecies, setFossilSpecies] = useState<FossilSpeciesDraft[]>([])
  const [originalFossilSpecies, setOriginalFossilSpecies] = useState<StoreProductFossilSpecies[]>([])
  const [minerals, setMinerals] = useState<MineralRowDraft[]>([])
  const [originalMinerals, setOriginalMinerals] = useState<StoreProductMineral[]>([])
  const [rocks, setRocks] = useState<RockRowDraft[]>([])
  const [originalRocks, setOriginalRocks] = useState<StoreProductRock[]>([])
  const [copyOpen, setCopyOpen] = useState(false)
  const [labelsOpen, setLabelsOpen] = useState(false)
  const [socialOpen, setSocialOpen] = useState(false)
  const coverUrls = useCoverUrls().data ?? {}
  const [provenance, setProvenance] = useState<ProvenanceDraft[]>([])
  // Categorias (0042): lista atual e a gravada (diff no "Salvar").
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [savedCategoryIds, setSavedCategoryIds] = useState<string[]>([])
  const { data: suppliersFull = [] } = useQuery({ queryKey: SUPPLIERS_WITH_STOREFRONTS_KEY, queryFn: fetchSuppliersWithStorefronts })
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
        baselineRef.current = JSON.stringify(toDraft(p))
        setSavedProduct(p)
        setCategoryIds(p.category_ids ?? [])
        setSavedCategoryIds(p.category_ids ?? [])
        setOriginalMinerals(p.minerals ?? [])
        setMinerals((p.minerals ?? []).map(mineralRowToDraft))
        setOriginalRocks(p.rocks ?? [])
        setRocks((p.rocks ?? []).map(rockRowToDraft))
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
    fetchFossilSpecies(id)
      .then((rows) => {
        setOriginalFossilSpecies(rows)
        setFossilSpecies(rows.map(fossilSpeciesToDraft))
      })
      .catch(() => {})
    loadProvenance(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew])

  function loadProvenance(productId: string) {
    fetchProvenance(productId)
      .then((rows) => {
        setProvenance(draftsFromRows(rows))
      })
      .catch(() => {})
  }

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

  // Anterior/próximo na ordem da lista de onde a ficha foi aberta (deslizar no
  // toque e setas ← → do teclado) — lib/useSwipeNavigation.ts. Desligado com
  // alteração não salva, para o gesto não descartar a edição em silêncio.
  const location = useLocation()
  const seqKey = getBrowseSeqKey(location.state)
  useSyncExternalStore(subscribeBrowseSequences, getBrowseSequencesVersion)
  const neighbors = !isNew && seqKey && id ? getBrowseNeighbors(seqKey, id) : null
  const swipeRef = useRef<HTMLDivElement>(null)
  const dirty =
    busy ||
    (draft != null && baselineRef.current != null && JSON.stringify(draft) !== baselineRef.current) ||
    [...categoryIds].sort().join() !== [...savedCategoryIds].sort().join()
  useSwipeNavigation({
    id,
    swipeRef,
    ready: !!draft,
    neighbors,
    disabled: dirty,
    goTo: (target) => {
      if (seqKey === GRID_SEQ) setBrowseReturnTarget(target)
      navigate(`/produtos/${target}`, { replace: true, state: { browseSeq: seqKey } })
    },
  })

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
    if (!mineralsSectionApplies(kind)) return
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

  /** Mesma reconciliação, pras rochas da amostra (0032). Fora das condições da seção (ex.: meteorito que
   *  deixou de ser Impactito), a lista vale vazia e remove o que existia. */
  const saveRocks = async (productId: string) => {
    const current = rocksSectionApplies(kind, draft.met_category) ? rocks.filter((r) => !isBlankRockRow(r)) : []
    const currentIds = new Set(current.filter((r) => r.id).map((r) => r.id))
    for (const original of originalRocks) {
      if (!currentIds.has(original.id)) await removeProductRock(original.id)
    }
    for (const [i, r] of current.entries()) {
      const input = rockRowToInput(r)
      if (r.id) await updateProductRock(r.id, input, i)
      else await addProductRock(productId, input, i)
    }
  }

  /** Ex-donos (0036): linhas sem nome são descartadas; a ordem da lista vira `sort_order`. */
  const saveProvenanceRows = async (productId: string) => {
    const parties = suppliersFull.map((s) => ({ id: s.id, name: s.name, aliases: s.aliases ?? [] }))
    await saveProvenance(productId, provenanceRows(provenance, parties), isNew)
  }

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      const fiscalError = validateFiscalDraft(draft)
      if (fiscalError) throw new Error(fiscalError)
      const input = { ...toInput(draft), ...(await resolveCostFx(draft)) }
      if (isNew) {
        // Id gerado no cliente para que fotos/vídeos escolhidos antes de
        // salvar tenham um destino conhecido — o upload acontece logo após o insert.
        // Com etiqueta reservada, o uuid é o já escaneado, não um sorteado.
        const newId = reservedId ?? crypto.randomUUID()
        const created = await createProduct({ ...input, id: newId })
        for (const file of pendingFiles) await uploadProductMedia(newId, file)
        for (const [i, youtubeId] of pendingYoutube.entries()) {
          await addYoutubeVideo(newId, youtubeId, null, i)
        }
        await saveFossilSpecies(newId)
        await saveMinerals(newId)
        await saveRocks(newId)
        await saveProvenanceRows(newId)
        await setProductCategories(newId, categoryIds, [])
        setSavedProduct(created)
        navigate(`/produtos/${newId}`, { replace: true })
      } else if (id) {
        setSavedProduct(await updateProduct(id, input))
        baselineRef.current = JSON.stringify(draft)
        await saveFossilSpecies(id)
        await saveMinerals(id)
        await saveRocks(id)
        await saveProvenanceRows(id)
        await setProductCategories(id, categoryIds, savedCategoryIds)
        setSavedCategoryIds(categoryIds)
        loadProvenance(id)
        // Recarrega as rochas salvas: linhas novas ganham id e não podem ser reinseridas no próximo salvar.
        fetchProduct(id)
          .then((p) => {
            setOriginalRocks(p.rocks ?? [])
            setRocks((p.rocks ?? []).map(rockRowToDraft))
          })
          .catch(() => {})
      }
      toast.success('Produto salvo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    // `overflow-x-clip`: a ficha sai de lado ao deslizar sem abrir rolagem horizontal;
    // `-mx px`: o recorte inclui o padding da página. `pan-y`: o navegador cuida da
    // rolagem vertical e o gesto horizontal fica com useSwipeNavigation.
    <div className="-mx-3 overflow-x-clip px-3 sm:-mx-4 sm:px-4">
    <div ref={swipeRef} className="relative mx-auto max-w-6xl" style={neighbors ? { touchAction: 'pan-y pinch-zoom' } : undefined}>
      {neighbors?.next && <ProductPeek key={neighbors.next} id={neighbors.next} side={1} />}
      {neighbors?.prev && <ProductPeek key={neighbors.prev} id={neighbors.prev} side={-1} />}
      <header className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to="/produtos" className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200">
            <ArrowLeftIcon />
            Produtos
          </Link>
          <h1 className="text-xl font-bold break-words text-stone-100">{isNew ? 'Novo produto' : draft.name || 'Produto'}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setCopyOpen(true)}
            className="btn-secondary h-9 min-h-9 w-9 px-0 py-0"
            title="Copiar de outro produto"
            aria-label="Copiar de outro produto"
          >
            <CopyIcon />
          </button>
          {savedProduct && (
            <ActionMenu
              label="Etiqueta e cartão"
              buttonClassName="btn-secondary inline-flex h-9 min-h-9 w-9 items-center justify-center px-0 py-0"
              items={[
                { label: 'Etiqueta de preço', icon: <LabelIcon />, onClick: () => setLabelsOpen(true) },
                { label: 'Cartão para redes sociais', icon: <CardIcon />, onClick: () => setSocialOpen(true) },
              ]}
            >
              <LabelIcon />
            </ActionMenu>
          )}
          {savedProduct && (
            <ExportMenu products={[savedProduct]} filename={savedProduct.ecommerce_slug || savedProduct.sku || savedProduct.id} />
          )}
          <button type="button" onClick={() => void handleSave()} disabled={busy} className="btn-primary h-9 min-h-9 py-0">
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {reservedId && (
        <p className="mb-4 rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
          Este produto vai nascer com o código já escaneado na etiqueta (
          <span className="font-mono">{reservedId.slice(0, 8)}…</span>), sem precisar de outra etiqueta depois.
        </p>
      )}

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

          <ProductCategoriesSection value={categoryIds} onChange={setCategoryIds} onError={setError} />

          {kind === 'jewelry' && <JewelryDataSection draft={draft} set={set} />}

          {kind === 'other' && <OtherDetailsSection draft={draft} set={set} />}

          {kind !== 'other' && kind !== 'jewelry' && (
            <SpecimenDataSection draft={draft} set={set} setMany={setMany} kind={kind} />
          )}

          {kind === 'fossil' && <FossilTaxonomySection species={fossilSpecies} onChange={setFossilSpecies} />}

          {!isNew && savedProduct?.is_lot && <LotItemsSection lot={savedProduct} />}

          {!isNew && savedProduct && <QrLinkSection product={savedProduct} onChanged={refreshProduct} />}

          {!isNew && id && <CertificatesSection productId={id} />}
        </div>

        <div className="space-y-4">
          {!isNew && id && <ProductStockHistorySection productId={id} onStockChanged={refreshStock} />}

          <AcquisitionSection draft={draft} setMany={setMany} provenance={provenance} onProvenanceChange={setProvenance} />

          {!isNew && id && <LinkedDocuments productId={id} />}

          <EcommerceSection draft={draft} set={set} />

          <FiscalSection draft={draft} set={set} />

          <Section title="Notas" icon={<NotesIcon />}>
            <textarea
              value={draft.notes}
              onChange={(e) => set('notes')(e.target.value)}
              placeholder="Observações internas sobre o item."
              className="input min-h-20"
            />
          </Section>

          {mineralsSectionApplies(kind) && (
            <MineralsInSampleSection minerals={minerals} onChange={setMinerals} kind={kind} />
          )}

          {rocksSectionApplies(kind, draft.met_category) && <RocksInSampleSection rocks={rocks} onChange={setRocks} />}
        </div>
      </div>

      {copyOpen && (
        <CopyFromProductDialog
          currentId={isNew ? null : (id ?? null)}
          onClose={() => setCopyOpen(false)}
          onApply={(result) => {
            setMany(result.values)
            if (result.minerals) setMinerals(result.minerals)
            if (result.rocks) setRocks(result.rocks)
            if (result.fossilSpecies) setFossilSpecies(result.fossilSpecies)
            setCopyOpen(false)
            toast.success('Campos copiados. Revise e salve o produto.')
          }}
        />
      )}
      {labelsOpen && savedProduct && <LabelsDialog products={[savedProduct]} onClose={() => setLabelsOpen(false)} />}
      {socialOpen && savedProduct && (
        <SocialCardDialog product={savedProduct} coverUrl={coverUrls[savedProduct.id]} onClose={() => setSocialOpen(false)} />
      )}
    </div>
    </div>
  )
}

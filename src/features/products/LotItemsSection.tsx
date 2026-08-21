import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { StoreProduct } from '../../types/db'
import { fetchProductChildren, fetchProducts, updateProduct } from './api'
import { formatMoney } from '../../lib/format'
import { sortLotItems, summarizeLot } from './lots'
import { useConfirm } from '../../components/DialogProvider'
import { PickProductsDialog } from '../documents/PickProductsDialog'
import { SplitLotDialog } from './SplitLotDialog'
import { CloseIcon, LinkIcon, PlusIcon, QrCodeIcon, SplitIcon, StackIcon, UnlinkIcon } from '../../components/icons'
import { Section } from './form/Field'
import { isUuidLike, normalizeScannedValue, resolveScannedValue } from './qr'
import { barcodeDetectorCtor, openCameraStream, SCAN_INTERVAL_MS, setPreferredCameraId } from '../../lib/qrCamera'

/**
 * Peças de um lote — versão enxuta de `LotItemsSection.tsx` do catálogo
 * pessoal (só lista, sem grid/seleção em massa/categorias — a loja não tem
 * esse volume nem esse recurso). Cada peça é um `store_products` completo
 * (`parent_id` aponta pra este lote), com SKU/foto/preço/venda próprios.
 */
export function LotItemsSection({ lot }: { lot: StoreProduct }) {
  const [items, setItems] = useState<StoreProduct[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'split' | 'link' | 'reserved' | null>(null)
  const [excludeIds, setExcludeIds] = useState<string[]>([])
  const confirm = useConfirm()

  const load = () =>
    fetchProductChildren(lot.id)
      .then((rows) => setItems(sortLotItems(rows)))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lot.id])

  const openLinkDialog = async () => {
    // Só produtos que ainda não pertencem a NENHUM lote podem ser vinculados
    // — mover uma peça de um lote pra outro é decisão que merece abrir a
    // ficha dela, não um clique aqui.
    const all = await fetchProducts().catch(() => [])
    setExcludeIds([lot.id, ...all.filter((p) => p.parent_id).map((p) => p.id)])
    setDialog('link')
  }

  const handleLink = async (ids: string[]) => {
    setDialog(null)
    const existing = items ?? []
    const used = existing.map((i) => Number((i.lot_suffix ?? '').trim())).filter((n) => Number.isFinite(n))
    let next = Math.max(0, ...used) + 1
    for (const id of ids) {
      await updateProduct(id, { parent_id: lot.id, lot_suffix: String(next) })
      next++
    }
    load()
  }

  const handleUnlink = async (item: StoreProduct) => {
    if (!(await confirm(`Desvincular "${item.name}" deste lote?`))) return
    await updateProduct(item.id, { parent_id: null, lot_suffix: null })
    load()
  }

  if (!items) return null

  const summary = summarizeLot(items)

  return (
    <Section
      title={`Peças do lote (${summary.count})`}
      icon={<StackIcon />}
    >
      {summary.count > 0 && (
        <p className="-mt-1 text-xs text-stone-500">
          {summary.weightG != null && `${summary.weightG} g total`}
          {summary.weightG != null && summary.withoutWeight > 0 && ` (${summary.withoutWeight} sem peso)`}
          {summary.weightG != null && summary.sold > 0 && ' · '}
          {summary.sold > 0 && `${summary.sold} sem estoque`}
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhuma peça ainda.</p>
      ) : (
        <ul className="divide-y divide-stone-800 overflow-hidden rounded-lg border border-stone-800">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <Link to={`/produtos/${item.id}`} className="flex min-w-0 flex-1 items-center gap-2 hover:underline">
                {item.lot_suffix && <span className="shrink-0 font-mono text-xs text-amber-500">#{item.lot_suffix}</span>}
                <span className="min-w-0 flex-1 truncate text-stone-100">{item.name}</span>
                {item.sku && <span className="shrink-0 text-xs text-stone-500">{item.sku}</span>}
              </Link>
              <span className="shrink-0 text-xs text-stone-400">{formatMoney(item.sale_price)}</span>
              <button
                type="button"
                onClick={() => void handleUnlink(item)}
                className="shrink-0 text-stone-500 hover:text-red-400"
                aria-label="Desvincular peça"
                title="Desvincular"
              >
                <UnlinkIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to={`/produtos/novo?lot=${lot.id}`} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <PlusIcon className="h-4 w-4" />
          Adicionar peça
        </Link>
        <button type="button" onClick={() => setDialog('split')} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <SplitIcon className="h-4 w-4" />
          Dividir em N peças
        </button>
        <button type="button" onClick={() => void openLinkDialog()} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <LinkIcon className="h-4 w-4" />
          Vincular existente
        </button>
        <button type="button" onClick={() => setDialog('reserved')} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <QrCodeIcon className="h-4 w-4" />
          Nova peça com etiqueta reservada
        </button>
      </div>

      {dialog === 'link' && (
        <PickProductsDialog excludeIds={excludeIds} onCancel={() => setDialog(null)} onConfirm={(ids) => void handleLink(ids)} />
      )}
      {dialog === 'split' && <SplitLotDialog lot={lot} items={items} onClose={() => setDialog(null)} onDone={load} />}
      {dialog === 'reserved' && <ReservedLabelDialog lot={lot} onClose={() => setDialog(null)} />}
    </Section>
  )
}

type CameraState = 'idle' | 'starting' | 'running' | 'denied' | 'unsupported' | 'error'

/**
 * "Nova peça com etiqueta reservada" (adaptado do catálogo pessoal, claude.md
 * §2): lê uma etiqueta QR já impressa (em branco/reservada, ou de outro
 * produto ainda sem uso) e navega pra `/produtos/novo?lot=<id>&reservedId=<uuid>`
 * — a peça nasce já vinculada a este lote E com o uuid da etiqueta física.
 * `ProductPage.tsx` já lê `lot` e `reservedId` de forma independente, nada
 * muda lá. Mesmo mecanismo de câmera do `ScanPage.tsx`/`QrLinkSection`
 * (`lib/qrCamera.ts`), simplificado pra 1 leitura só.
 */
function ReservedLabelDialog({ lot, onClose }: { lot: StoreProduct; onClose: () => void }) {
  const navigate = useNavigate()
  const [allProducts, setAllProducts] = useState<StoreProduct[]>([])
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camera, setCamera] = useState<CameraState>('idle')
  const [manual, setManual] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)
  const detectorSupported = barcodeDetectorCtor() !== null

  const productsRef = useRef<StoreProduct[]>([])
  productsRef.current = allProducts

  useEffect(() => {
    fetchProducts()
      .then(setAllProducts)
      .catch(() => setAllProducts([]))
  }, [])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const startCamera = async (deviceId?: string) => {
    const Detector = barcodeDetectorCtor()
    if (!Detector) {
      setCamera('unsupported')
      return
    }
    setCamera('starting')
    try {
      const stream = await openCameraStream(deviceId)
      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((tr) => tr.stop())
        return
      }
      video.srcObject = stream
      await video.play()
      setActiveDeviceId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? null)
      setCamera('running')
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'))
      } catch {
        // Sem enumerateDevices (navegador antigo): só perde o botão de trocar câmera.
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      setCamera(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error')
    }
  }

  /** Troca pra próxima câmera da lista (cíclico) e lembra a escolha pras próximas vezes. */
  const switchCamera = () => {
    if (videoDevices.length < 2) return
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === activeDeviceId)
    const next = videoDevices[(currentIndex + 1) % videoDevices.length]
    setPreferredCameraId(next.deviceId)
    stopCamera()
    startCamera(next.deviceId)
  }

  useEffect(() => {
    startCamera()
    return stopCamera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Valida e navega; devolve sem fechar se a etiqueta já estiver em uso. */
  const handleValue = (raw: string) => {
    const needle = normalizeScannedValue(raw)
    if (!isUuidLike(needle)) {
      setError('Isso não parece um identificador de etiqueta válido.')
      return
    }
    const matched = resolveScannedValue(productsRef.current, raw)
    if (matched) {
      setError('Essa etiqueta já está em uso por outro produto.')
      return
    }
    setError(null)
    stopCamera()
    navigate(`/produtos/novo?lot=${lot.id}&reservedId=${needle}`)
  }

  useEffect(() => {
    if (camera !== 'running') return
    const Detector = barcodeDetectorCtor()
    if (!Detector) return
    const detector = new Detector({ formats: ['qr_code'] })
    let active = true
    let busy = false

    const timer = setInterval(async () => {
      const video = videoRef.current
      if (!active || busy || !video || video.readyState < 2) return
      busy = true
      try {
        const codes = await detector.detect(video)
        const raw = codes[0]?.rawValue
        if (raw && active) handleValue(raw)
      } catch {
        // Quadro ilegível/câmera trocando de foco: silencioso.
      } finally {
        busy = false
      }
    }, SCAN_INTERVAL_MS)

    return () => {
      active = false
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera])

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault()
    const value = manual.trim()
    if (!value) return
    handleValue(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-3">
        <span className="flex items-center gap-2 text-sm font-medium text-white">
          <QrCodeIcon /> Nova peça com etiqueta reservada
        </span>
        <div className="flex items-center gap-3">
          {camera === 'running' && videoDevices.length > 1 && (
            <button onClick={switchCamera} className="text-xs text-stone-300 hover:underline">
              Trocar câmera
            </button>
          )}
          <button onClick={onClose} title="Cancelar" aria-label="Cancelar" className="tap-icon bg-white/10 text-white">
            <CloseIcon />
          </button>
        </div>
      </div>

      <p className="px-3 pb-2 text-xs text-stone-400">
        Aponte a câmera para uma etiqueta QR reservada (em branco, ou de outro produto ainda não usado) — a peça nasce já
        vinculada a este lote e com esse código.
      </p>

      <div className="relative flex-1 overflow-hidden">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${camera === 'running' ? '' : 'hidden'}`} />
        {camera !== 'running' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-stone-300">
            {camera === 'starting' && 'Abrindo a câmera…'}
            {camera === 'unsupported' && 'Este navegador não suporta leitura de QR pela câmera. Digite o código manualmente.'}
            {camera === 'denied' && (
              <>
                Permissão de câmera negada.
                <button onClick={() => startCamera()} className="btn-secondary">
                  Tentar de novo
                </button>
              </>
            )}
            {camera === 'error' && (
              <>
                Não foi possível abrir a câmera.
                <button onClick={() => startCamera()} className="btn-secondary">
                  Tentar de novo
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mx-3 mb-2 rounded-lg bg-red-950/50 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={submitManual} className="flex gap-2 p-3">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Código da etiqueta"
          className="input flex-1"
          autoFocus={!detectorSupported}
        />
        <button type="submit" className="btn-primary shrink-0">
          Usar etiqueta
        </button>
      </form>
    </div>
  )
}

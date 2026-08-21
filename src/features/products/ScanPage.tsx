import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { StoreProduct } from '../../types/db'
import {
  ArrowLeftIcon,
  CheckIcon,
  CloseIcon,
  PackageIcon,
  QrCodeIcon,
  SpecimenIcon,
  StackIcon,
} from '../../components/icons'
import { fetchCoverUrls, fetchProducts } from './api'
import { isUuidLike, normalizeScannedValue, resolveScannedValue } from './qr'
import { barcodeDetectorCtor, openCameraStream, SCAN_INTERVAL_MS, setPreferredCameraId } from '../../lib/qrCamera'

/**
 * Escanear QR (adaptado de `ScanPage.tsx` do catálogo pessoal, claude.md §2).
 * Dois modos:
 *   - 'open'    (padrão): lê um código, abre a ficha do produto.
 *   - 'collect' (lote): acumula vários produtos lidos numa lista de sessão,
 *     para criar uma venda com todos de uma vez (botão "Criar venda" leva os
 *     ids pra `/vendas`, que pré-carrega o carrinho e abre o diálogo — ver
 *     `SalesPage.tsx`).
 *
 * Resolução 100% LOCAL contra o cache `['products']` já carregado — nenhuma
 * consulta nova por leitura.
 */
type CameraState = 'idle' | 'starting' | 'running' | 'denied' | 'unsupported' | 'error'
type ScanMode = 'open' | 'collect'

const MODE_STORAGE_KEY = 'tt_loja_scan_mode'
/** Lista coletada é de SESSÃO de propósito — rascunho de trabalho, some ao fechar a aba. */
const COLLECTED_STORAGE_KEY = 'tt_loja_scan_collected'

function readStoredMode(): ScanMode {
  return localStorage.getItem(MODE_STORAGE_KEY) === 'collect' ? 'collect' : 'open'
}

function readStoredCollected(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(COLLECTED_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

export function ScanPage() {
  const navigate = useNavigate()
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
  const { data: coverUrls } = useQuery({ queryKey: ['product-cover-urls'], queryFn: fetchCoverUrls })
  const productsRef = useRef<StoreProduct[]>([])
  productsRef.current = products ?? []

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camera, setCamera] = useState<CameraState>('idle')
  const [manual, setManual] = useState('')
  const [notFound, setNotFound] = useState<string | null>(null)
  const [history, setHistory] = useState<StoreProduct[]>([])
  const [mode, setMode] = useState<ScanMode>(readStoredMode)
  const [collectedIds, setCollectedIds] = useState<string[]>(readStoredCollected)
  // Câmeras traseiras disponíveis (só têm RÓTULO depois da permissão
  // concedida) e qual está ativa — alimenta o botão "Trocar câmera": o zoom
  // mínimo (openCameraStream) acerta a lente certa na maioria dos aparelhos,
  // mas nem sempre, daí o contorno manual.
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)

  const detectorSupported = barcodeDetectorCtor() !== null

  const collected = useMemo(() => {
    const byId = new Map((products ?? []).map((p) => [p.id, p]))
    return collectedIds.map((id) => byId.get(id)).filter((p): p is StoreProduct => p != null)
  }, [collectedIds, products])

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode)
  }, [mode])

  useEffect(() => {
    sessionStorage.setItem(COLLECTED_STORAGE_KEY, JSON.stringify(collectedIds))
  }, [collectedIds])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const openValue = useCallback(
    (raw: string) => {
      const found = resolveScannedValue(productsRef.current, raw)
      if (!found) {
        setNotFound(normalizeScannedValue(raw) || raw)
        return
      }
      setNotFound(null)
      setHistory((prev) => [found, ...prev.filter((p) => p.id !== found.id)].slice(0, 8))
      stopCamera()
      navigate(`/produtos/${found.id}`)
    },
    [navigate, stopCamera],
  )

  /** Modo lote: acrescenta à lista sem navegar nem desligar a câmera. */
  const collectValue = useCallback((raw: string) => {
    const found = resolveScannedValue(productsRef.current, raw)
    if (!found) {
      setNotFound(normalizeScannedValue(raw) || raw)
      return
    }
    setNotFound(null)
    setCollectedIds((prev) => (prev.includes(found.id) ? prev : [found.id, ...prev]))
  }, [])

  /** `deviceId` explícito = troca manual (botão "Trocar câmera"); ausente = pedido normal (facingMode + zoom mínimo, ou a câmera lembrada da última troca). */
  const startCamera = useCallback(async (deviceId?: string) => {
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
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      video.srcObject = stream
      await video.play()
      setActiveDeviceId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? null)
      setCamera('running')

      // Rótulo do dispositivo só existe DEPOIS da permissão concedida.
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
  }, [])

  /** Troca pra próxima câmera da lista (cíclico) e lembra a escolha pras próximas vezes. */
  const switchCamera = useCallback(() => {
    if (videoDevices.length < 2) return
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === activeDeviceId)
    const next = videoDevices[(currentIndex + 1) % videoDevices.length]
    setPreferredCameraId(next.deviceId)
    stopCamera()
    void startCamera(next.deviceId)
  }, [videoDevices, activeDeviceId, stopCamera, startCamera])

  useEffect(() => {
    void startCamera()
    return stopCamera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // O modo decide o que a leitura faz — mora num ref pra o laço de leitura
  // abaixo não precisar recriar o detector a cada troca de modo.
  const modeRef = useRef(mode)
  modeRef.current = mode

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
        if (!active) return
        if (modeRef.current === 'open') {
          const raw = codes[0]?.rawValue
          if (raw && isUuidLike(normalizeScannedValue(raw))) openValue(raw)
        } else {
          for (const code of codes) {
            if (code.rawValue) collectValue(code.rawValue)
          }
        }
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
  }, [camera, openValue, collectValue])

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault()
    const value = manual.trim()
    if (!value) return
    if (mode === 'open') openValue(value)
    else collectValue(value)
    setManual('')
  }

  const clearCollected = () => setCollectedIds([])

  const createSale = () => {
    if (collected.length === 0) return
    navigate('/vendas', { state: { prefillProductIds: collected.map((p) => p.id) } })
  }

  return (
    <div className="mx-auto max-w-md">
      <header className="mb-4 flex items-center gap-2">
        <Link to="/produtos" aria-label="Voltar" className="tap-icon bg-stone-800 text-stone-300">
          <ArrowLeftIcon />
        </Link>
        <h1 className="flex items-center gap-2 text-xl font-bold text-stone-100">
          <QrCodeIcon /> Escanear
        </h1>
      </header>

      {/* Alternador de modo — decide o que cada leitura faz, por isso fica ACIMA da câmera. */}
      <div role="radiogroup" aria-label="Modo de leitura" className="mb-3 flex gap-1 rounded-lg border border-stone-800 bg-stone-950/40 p-1">
        {(['open', 'collect'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
              mode === m ? 'bg-amber-600/20 font-medium text-amber-300' : 'text-stone-400 hover:bg-stone-900'
            }`}
          >
            {m === 'open' ? <QrCodeIcon /> : <StackIcon />}
            {m === 'open' ? 'Abrir' : 'Coletar'}
          </button>
        ))}
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-stone-800 bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${camera === 'running' ? '' : 'hidden'}`} />
        {camera !== 'running' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-stone-300">
            {camera === 'starting' && 'Abrindo a câmera…'}
            {camera === 'idle' && 'Aguardando câmera…'}
            {camera === 'unsupported' && 'Este navegador não suporta leitura de QR pela câmera. Digite o código manualmente.'}
            {camera === 'denied' && (
              <>
                Permissão de câmera negada.
                <button onClick={() => void startCamera()} className="btn-secondary">
                  Tentar de novo
                </button>
              </>
            )}
            {camera === 'error' && (
              <>
                Não foi possível abrir a câmera.
                <button onClick={() => void startCamera()} className="btn-secondary">
                  Tentar de novo
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {camera === 'running' && videoDevices.length > 1 && (
        <div className="mt-2 flex justify-end">
          <button type="button" onClick={switchCamera} className="text-xs text-stone-400 hover:underline">
            Trocar câmera
          </button>
        </div>
      )}

      <form onSubmit={submitManual} className="mt-3 flex gap-2">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Código do produto ou da etiqueta"
          className="input flex-1"
          autoFocus={!detectorSupported}
        />
        <button type="submit" className="btn-primary shrink-0">
          {mode === 'open' ? 'Abrir' : 'Adicionar'}
        </button>
      </form>

      {notFound && <p className="mt-2 text-sm text-red-400">Nenhum produto encontrado para “{notFound}”.</p>}

      {mode === 'collect' && (
        <div className="mt-6 rounded-xl border border-stone-800 bg-stone-950/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-stone-300">Coletados ({collected.length})</p>
            {collected.length > 0 && (
              <button type="button" onClick={clearCollected} className="text-xs text-stone-400 hover:underline">
                Limpar
              </button>
            )}
          </div>

          {collected.length === 0 && <p className="py-4 text-center text-sm text-stone-500">Nada lido ainda nesta sessão.</p>}

          {collected.length > 0 && (
            <>
              <div className="space-y-0.5">
                {collected.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-900">
                    <span className="text-emerald-500">
                      <CheckIcon />
                    </span>
                    <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-md bg-stone-800">
                      {coverUrls?.[p.id] ? (
                        <img src={coverUrls[p.id]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-stone-600">
                          <SpecimenIcon />
                        </span>
                      )}
                    </span>
                    <Link to={`/produtos/${p.id}`} className="min-w-0 flex-1 truncate text-sm text-stone-100">
                      {p.name}
                    </Link>
                    <button
                      onClick={() => setCollectedIds((prev) => prev.filter((id) => id !== p.id))}
                      title="Remover"
                      aria-label="Remover"
                      className="shrink-0 text-stone-500 transition hover:text-stone-300"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={createSale} className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-1.5">
                <PackageIcon /> Criar venda com os itens coletados
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'open' && history.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-stone-300">Lidos nesta sessão</h2>
          <ul className="space-y-1">
            {history.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/produtos/${p.id}`)}
                  className="flex w-full items-center gap-2 rounded-lg border border-stone-800 px-3 py-2 text-left text-sm text-stone-300 hover:bg-stone-900"
                >
                  <SpecimenIcon />
                  <span className="truncate">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

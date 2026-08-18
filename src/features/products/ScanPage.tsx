import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { StoreProduct } from '../../types/db'
import { ArrowLeftIcon, QrCodeIcon, SpecimenIcon } from '../../components/icons'
import { fetchProducts } from './api'
import { isUuidLike, normalizeScannedValue, resolveScannedValue } from './qr'
import { barcodeDetectorCtor, openCameraStream, SCAN_INTERVAL_MS } from '../../lib/qrCamera'

/**
 * Escanear QR (adaptado de `ScanPage.tsx` do catálogo pessoal, claude.md §2)
 * — versão simplificada: só modo "abrir" (lê um código, abre a ficha do
 * produto). O modo "lote"/coleta do app pessoal (acumular vários pra ação em
 * massa depois) ficou de fora — a loja não tem um fluxo de categorização em
 * massa que justifique o esforço extra hoje; se aparecer essa necessidade
 * (ex.: dar entrada em vários produtos de uma vez), portar o modo 'collect'
 * de lá é o caminho.
 *
 * Resolução 100% LOCAL contra o cache `['products']` já carregado — nenhuma
 * consulta nova por leitura.
 */
type CameraState = 'idle' | 'starting' | 'running' | 'denied' | 'unsupported' | 'error'

export function ScanPage() {
  const navigate = useNavigate()
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
  const productsRef = useRef<StoreProduct[]>([])
  productsRef.current = products ?? []

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camera, setCamera] = useState<CameraState>('idle')
  const [manual, setManual] = useState('')
  const [notFound, setNotFound] = useState<string | null>(null)
  const [history, setHistory] = useState<StoreProduct[]>([])

  const detectorSupported = barcodeDetectorCtor() !== null

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

  const startCamera = useCallback(async () => {
    const Detector = barcodeDetectorCtor()
    if (!Detector) {
      setCamera('unsupported')
      return
    }
    setCamera('starting')
    try {
      const stream = await openCameraStream()
      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      video.srcObject = stream
      await video.play()
      setCamera('running')
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      setCamera(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error')
    }
  }, [])

  useEffect(() => {
    void startCamera()
    return stopCamera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        if (raw && active && isUuidLike(normalizeScannedValue(raw))) {
          openValue(raw)
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
  }, [camera, openValue])

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault()
    const value = manual.trim()
    if (!value) return
    openValue(value)
    setManual('')
  }

  return (
    <div className="mx-auto max-w-md">
      <header className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="tap-icon bg-stone-800 text-stone-300">
          <ArrowLeftIcon />
        </button>
        <h1 className="flex items-center gap-2 text-xl font-bold text-stone-100">
          <QrCodeIcon /> Escanear
        </h1>
      </header>

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

      <form onSubmit={submitManual} className="mt-3 flex gap-2">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Código do produto ou da etiqueta"
          className="input flex-1"
          autoFocus={!detectorSupported}
        />
        <button type="submit" className="btn-primary shrink-0">
          Abrir
        </button>
      </form>

      {notFound && <p className="mt-2 text-sm text-red-400">Nenhum produto encontrado para “{notFound}”.</p>}

      {history.length > 0 && (
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

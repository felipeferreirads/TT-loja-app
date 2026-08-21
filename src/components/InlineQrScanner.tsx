import { useCallback, useEffect, useRef, useState } from 'react'
import { barcodeDetectorCtor, openCameraStream, SCAN_INTERVAL_MS, setPreferredCameraId } from '../lib/qrCamera'

/**
 * Câmera + leitura de QR embutida inline (sem rota própria) — extraído do
 * laço de `ScanPage.tsx` pra ser reaproveitado dentro do carrinho do PDV
 * (`SalesPage.tsx`), sem precisar navegar pra `/escanear` e voltar.
 *
 * Cada leitura bem-sucedida chama `onDetect(rawValue)` — com um cooldown por
 * valor (não por leitura) pra segurar o código em quadro não disparar várias
 * vezes por segundo; quem consome decide o que fazer (achar o produto,
 * adicionar ao carrinho). Sem estado de "já lido" aqui: rescanear o mesmo
 * código depois do cooldown é uma ação válida (ex.: mais uma unidade).
 */
type CameraState = 'idle' | 'starting' | 'running' | 'denied' | 'unsupported' | 'error'

const DETECT_COOLDOWN_MS = 1500

export function InlineQrScanner({ onDetect }: { onDetect: (rawValue: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camera, setCamera] = useState<CameraState>('idle')
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)

  const lastValueRef = useRef<string | null>(null)
  const lastTimeRef = useRef(0)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

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
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'))
      } catch {
        // Sem enumerateDevices: só perde o botão de trocar câmera.
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      setCamera(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error')
    }
  }, [])

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
        const raw = codes[0]?.rawValue
        if (!raw) return
        const now = Date.now()
        if (raw === lastValueRef.current && now - lastTimeRef.current < DETECT_COOLDOWN_MS) return
        lastValueRef.current = raw
        lastTimeRef.current = now
        onDetect(raw)
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
  }, [camera, onDetect])

  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-stone-800 bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${camera === 'running' ? '' : 'hidden'}`} />
        {camera !== 'running' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-xs text-stone-300">
            {camera === 'starting' && 'Abrindo a câmera…'}
            {camera === 'idle' && 'Aguardando câmera…'}
            {camera === 'unsupported' && 'Este navegador não suporta leitura de QR pela câmera.'}
            {camera === 'denied' && (
              <>
                Permissão de câmera negada.
                <button type="button" onClick={() => void startCamera()} className="btn-secondary">
                  Tentar de novo
                </button>
              </>
            )}
            {camera === 'error' && (
              <>
                Não foi possível abrir a câmera.
                <button type="button" onClick={() => void startCamera()} className="btn-secondary">
                  Tentar de novo
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {camera === 'running' && videoDevices.length > 1 && (
        <div className="mt-1 flex justify-end">
          <button type="button" onClick={switchCamera} className="text-xs text-stone-400 hover:underline">
            Trocar câmera
          </button>
        </div>
      )}
    </div>
  )
}

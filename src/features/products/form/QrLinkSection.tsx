import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useConfirm } from '../../../components/DialogProvider'
import { CloseIcon, LinkIcon, QrCodeIcon, TrashIcon } from '../../../components/icons'
import type { StoreProduct } from '../../../types/db'
import { deleteQrAlias, fetchProducts, linkQrAlias, repointQrAlias } from '../api'
import { isUuidLike, normalizeScannedValue, resolveScannedValue } from '../qr'
import { barcodeDetectorCtor, openCameraStream, SCAN_INTERVAL_MS } from '../../../lib/qrCamera'
import { Section } from './Field'

/**
 * "Vincular etiqueta QR" — adaptado de `QrLinkSection.tsx` do catálogo
 * pessoal (claude.md §2). O dono já tem uma etiqueta física impressa (de
 * outro produto, ou uma etiqueta em branco) e quer que ela passe a abrir
 * ESTE produto. Só aparece para produto já salvo (precisa de um id real pra
 * vincular). Três casos ao ler um valor:
 *   1. Não existe em nenhum produto ainda → cria o alias com o id EXATO lido.
 *   2. Já é alias de OUTRO produto → reatribui esse alias pra cá.
 *   3. Já é o id PRINCIPAL de outro produto → recusa (risco de FK em cascata).
 */
type CameraState = 'idle' | 'starting' | 'running' | 'denied' | 'unsupported' | 'error'
type Feedback = { kind: 'info' | 'success' | 'error'; text: string }

export function QrLinkSection({ product, onChanged }: { product: StoreProduct; onChanged: () => void }) {
  const confirm = useConfirm()
  const { data: allProducts } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const handleDetected = async (raw: string) => {
    setScanning(false)
    const needle = normalizeScannedValue(raw)
    if (!isUuidLike(needle)) {
      setFeedback({ kind: 'error', text: 'Esse código não é uma etiqueta válida deste app.' })
      return
    }
    setBusy(true)
    setFeedback(null)
    try {
      if (needle === product.id.toUpperCase()) {
        setFeedback({ kind: 'info', text: 'Essa etiqueta já abre este produto.' })
        return
      }
      const matched = resolveScannedValue(allProducts ?? [], raw)
      if (matched && matched.id === product.id) {
        setFeedback({ kind: 'info', text: 'Essa etiqueta já abre este produto.' })
        return
      }
      if (matched) {
        if (matched.id.toUpperCase() === needle) {
          setFeedback({ kind: 'error', text: 'Essa etiqueta é o identificador principal de outro produto — não é possível vincular.' })
          return
        }
        const alias = matched.qr_aliases?.find((a) => a.id.toUpperCase() === needle)
        if (!alias) throw new Error('Código inválido.')
        await repointQrAlias(alias.id, product.id)
        setFeedback({ kind: 'success', text: 'Etiqueta reatribuída para este produto.' })
      } else {
        await linkQrAlias(product.id, needle)
        setFeedback({ kind: 'success', text: 'Etiqueta vinculada a este produto.' })
      }
      onChanged()
    } catch (err) {
      setFeedback({ kind: 'error', text: err instanceof Error ? err.message : 'Falha ao vincular etiqueta.' })
    } finally {
      setBusy(false)
    }
  }

  const handleUnlink = async (aliasId: string) => {
    if (!(await confirm('Desvincular esta etiqueta do produto?'))) return
    setBusy(true)
    setFeedback(null)
    try {
      await deleteQrAlias(aliasId)
      onChanged()
    } catch (err) {
      setFeedback({ kind: 'error', text: err instanceof Error ? err.message : 'Falha ao desvincular.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Etiqueta QR" icon={<QrCodeIcon />}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-stone-500">Vincula uma etiqueta QR já impressa (deste ou de outro produto) a este item.</p>
        <button type="button" onClick={() => setScanning(true)} disabled={busy} className="btn-secondary shrink-0 gap-1.5">
          <LinkIcon /> Vincular etiqueta QR
        </button>
      </div>

      {feedback && (
        <p
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-lg px-3 py-2 text-xs ${
            feedback.kind === 'error'
              ? 'bg-red-950/50 text-red-300'
              : feedback.kind === 'success'
                ? 'bg-emerald-950/40 text-emerald-300'
                : 'bg-stone-800/60 text-stone-300'
          }`}
        >
          {feedback.text}
        </p>
      )}

      {(product.qr_aliases?.length ?? 0) > 0 && (
        <ul className="space-y-1">
          {product.qr_aliases!.map((alias) => (
            <li
              key={alias.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-stone-800 bg-stone-950/40 px-3 py-1.5"
            >
              <span className="truncate font-mono text-xs text-stone-300">{alias.id.slice(0, 8).toUpperCase()}</span>
              <button
                type="button"
                onClick={() => void handleUnlink(alias.id)}
                disabled={busy}
                title="Desvincular"
                aria-label="Desvincular"
                className="tap-icon shrink-0 bg-stone-800 text-red-400 transition hover:bg-red-950/60"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {scanning && <QrLinkScanner onDetect={(v) => void handleDetected(v)} onClose={() => setScanning(false)} />}
    </Section>
  )
}

/** Leitor de QR de um valor só — abre a câmera, decodifica o primeiro símbolo e devolve. */
function QrLinkScanner({ onDetect, onClose }: { onDetect: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camera, setCamera] = useState<CameraState>('idle')
  const [manual, setManual] = useState('')
  const detectorSupported = barcodeDetectorCtor() !== null

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const startCamera = async () => {
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
  }

  useEffect(() => {
    startCamera()
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
        if (raw && active) {
          active = false
          onDetect(raw)
        }
      } catch {
        // Quadro ilegível/câmera trocando de foco: silencioso, próxima tentativa em SCAN_INTERVAL_MS.
      } finally {
        busy = false
      }
    }, SCAN_INTERVAL_MS)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [camera, onDetect])

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault()
    const value = manual.trim()
    if (!value) return
    onDetect(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-3">
        <span className="flex items-center gap-2 text-sm font-medium text-white">
          <QrCodeIcon /> Escanear etiqueta
        </span>
        <button onClick={onClose} title="Cancelar" aria-label="Cancelar" className="tap-icon bg-white/10 text-white">
          <CloseIcon />
        </button>
      </div>

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
                <button onClick={startCamera} className="btn-secondary">
                  Tentar de novo
                </button>
              </>
            )}
            {camera === 'error' && (
              <>
                Não foi possível abrir a câmera.
                <button onClick={startCamera} className="btn-secondary">
                  Tentar de novo
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <form onSubmit={submitManual} className="flex gap-2 p-3">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Código da etiqueta"
          className="input flex-1"
          autoFocus={!detectorSupported}
        />
        <button type="submit" className="btn-primary shrink-0">
          Vincular
        </button>
      </form>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchImportableSpecimens,
  importSpecimenToStore,
  resolveScannedSpecimen,
  normalizeScannedValue,
  type ImportableSpecimen,
} from './importFromCollection'
import { barcodeDetectorCtor, openCameraStream, SCAN_INTERVAL_MS, setPreferredCameraId } from '../../lib/qrCamera'
import { CloseIcon, QrCodeIcon, SearchIcon } from '../../components/icons'

const TYPE_LABELS: Record<ImportableSpecimen['type'], string> = {
  mineral: 'Mineral',
  fossil: 'Fóssil',
  meteorite: 'Meteorito',
}

type Mode = 'search' | 'scan'
type CameraState = 'idle' | 'starting' | 'running' | 'denied' | 'unsupported' | 'error'

/**
 * Seleciona espécimes "vivos" e ainda na coleção (não vendidos/importados) e
 * dispara `importSpecimenToStore` pra cada um, sequencialmente — cada
 * importação baixa e sobe fotos, então rodar em paralelo só multiplicaria
 * chamadas de rede sem ganho real numa ação que já não é instantânea.
 *
 * Dois jeitos de escolher os itens: busca por texto (padrão) ou câmera —
 * cada etiqueta lida ADICIONA o item à seleção (sem fechar o diálogo), pra
 * dar pra escanear vários em sequência e importar todos de uma vez. Câmera
 * adaptada de `ScanPage.tsx` (mesmo `qrCamera.ts`), mas resolvendo contra a
 * coleção pessoal (`resolveScannedSpecimen`) em vez dos produtos da loja.
 */
export function ImportFromCollectionDialog({
  onCancel,
  onDone,
}: {
  onCancel: () => void
  onDone: () => void
}) {
  const [specimens, setSpecimens] = useState<ImportableSpecimen[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('search')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const specimensRef = useRef<ImportableSpecimen[]>([])
  specimensRef.current = specimens

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camera, setCamera] = useState<CameraState>('idle')
  const [manualCode, setManualCode] = useState('')
  const [scanFeedback, setScanFeedback] = useState<{ text: string; ok: boolean } | null>(null)
  // Mesmo contorno do ScanPage/QrLinkSection: em aparelhos com várias lentes
  // traseiras separadas, o pedido automático às vezes pega a grande-angular.
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)

  useEffect(() => {
    fetchImportableSpecimens()
      .then(setSpecimens)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return specimens
    return specimens.filter((s) => [s.displayName, s.origin, s.code_global ? `#${s.code_global}` : null].some((v) => v?.toLowerCase().includes(q)))
  }, [specimens, query])

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  // ─── Câmera ──────────────────────────────────────────────────
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
    if (mode !== 'scan') {
      stopCamera()
      return
    }
    void startCamera()
    return stopCamera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handleScannedValue = useCallback(
    async (raw: string) => {
      const found = await resolveScannedSpecimen(specimensRef.current, raw)
      if (!found) {
        setScanFeedback({ text: `Nenhum item encontrado para "${normalizeScannedValue(raw) || raw}".`, ok: false })
        return
      }
      setSelected((prev) => (prev.includes(found.id) ? prev : [...prev, found.id]))
      setScanFeedback({ text: `✓ ${found.displayName} adicionado à seleção.`, ok: true })
    },
    [],
  )

  useEffect(() => {
    if (mode !== 'scan' || camera !== 'running') return
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
        // Detecta TODOS os códigos do quadro (não só o primeiro) — permite
        // escanear uma folha inteira de etiquetas de uma vez, igual o modo
        // "Coletar" do ScanPage.tsx.
        const codes = await detector.detect(video)
        if (active) {
          for (const code of codes) {
            if (code.rawValue) await handleScannedValue(code.rawValue)
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
  }, [mode, camera, handleScannedValue])

  const submitManualCode = (e: React.FormEvent) => {
    e.preventDefault()
    const value = manualCode.trim()
    if (!value) return
    void handleScannedValue(value)
    setManualCode('')
  }

  const handleImport = async () => {
    setError(null)
    setProgress({ done: 0, total: selected.length })
    for (let i = 0; i < selected.length; i++) {
      try {
        await importSpecimenToStore(selected[i])
      } catch (err) {
        setError(
          `Falha ao importar "${specimens.find((s) => s.id === selected[i])?.displayName ?? selected[i]}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
        setProgress(null)
        return
      }
      setProgress({ done: i + 1, total: selected.length })
    }
    onDone()
  }

  const busy = progress !== null

  const chooseMode = (next: Mode) => {
    setMode(next)
    setScanFeedback(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-xl border border-stone-800 bg-stone-900">
        <header className="flex items-center justify-between border-b border-stone-800 p-4">
          <h2 className="font-medium text-stone-100">Importar da coleção</h2>
          <button type="button" onClick={onCancel} aria-label="Fechar" className="tap-icon" disabled={busy}>
            <CloseIcon />
          </button>
        </header>

        <div className="flex border-b border-stone-800">
          <button
            type="button"
            onClick={() => chooseMode('search')}
            disabled={busy}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-sm transition ${
              mode === 'search' ? 'border-b-2 border-amber-500 text-amber-400' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <SearchIcon className="h-4 w-4" />
            Buscar
          </button>
          <button
            type="button"
            onClick={() => chooseMode('scan')}
            disabled={busy}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-sm transition ${
              mode === 'scan' ? 'border-b-2 border-amber-500 text-amber-400' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <QrCodeIcon className="h-4 w-4" />
            Escanear
          </button>
        </div>

        {mode === 'search' && (
          <div className="border-b border-stone-800 p-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, código ou localidade…"
                className="input pl-10"
                disabled={busy}
              />
            </div>
          </div>
        )}

        {mode === 'scan' && (
          <div className="space-y-2 border-b border-stone-800 p-3">
            <div className="relative h-44 w-full overflow-hidden rounded-lg border border-stone-800 bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                muted
                playsInline
                className={`h-full w-full object-cover ${camera === 'running' ? '' : 'hidden'}`}
              />
              {camera !== 'running' && (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-xs text-stone-300">
                  {camera === 'starting' && 'Abrindo a câmera…'}
                  {camera === 'idle' && 'Aguardando câmera…'}
                  {camera === 'unsupported' && 'Este navegador não suporta leitura de QR pela câmera. Digite o código abaixo.'}
                  {camera === 'denied' && (
                    <>
                      Permissão de câmera negada.
                      <button type="button" onClick={() => void startCamera()} className="btn-secondary px-3 py-1 text-xs">
                        Tentar de novo
                      </button>
                    </>
                  )}
                  {camera === 'error' && (
                    <>
                      Não foi possível abrir a câmera.
                      <button type="button" onClick={() => void startCamera()} className="btn-secondary px-3 py-1 text-xs">
                        Tentar de novo
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {camera === 'running' && videoDevices.length > 1 && (
              <div className="flex justify-end">
                <button type="button" onClick={switchCamera} className="text-xs text-stone-400 hover:underline">
                  Trocar câmera
                </button>
              </div>
            )}
            <form onSubmit={submitManualCode} className="flex gap-2">
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ou digite o código da etiqueta"
                className="input flex-1"
                disabled={busy}
              />
              <button type="submit" disabled={busy} className="btn-secondary shrink-0">
                Adicionar
              </button>
            </form>
            {scanFeedback && (
              <p className={`text-sm ${scanFeedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>{scanFeedback.text}</p>
            )}
          </div>
        )}

        {mode === 'search' && (
          <div className="flex-1 overflow-y-auto p-2">
            {loading && <p className="p-2 text-sm text-stone-400">Carregando…</p>}
            {!loading && !error && visible.length === 0 && (
              <p className="p-2 text-sm text-stone-400">
                {specimens.length === 0
                  ? 'Nenhum item disponível pra importar (tudo já está na loja ou marcado como vendido).'
                  : 'Nenhum item encontrado.'}
              </p>
            )}
            {!loading &&
              visible.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-stone-800"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={() => toggle(s.id)}
                    disabled={busy}
                    className="accent-amber-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-stone-100">{s.displayName}</span>
                    <span className="block truncate text-xs text-stone-500">
                      {TYPE_LABELS[s.type]}
                      {s.code_global ? ` · #${s.code_global}` : ''}
                      {s.origin ? ` · ${s.origin}` : ''}
                    </span>
                  </span>
                </label>
              ))}
          </div>
        )}

        {mode === 'scan' && selected.length > 0 && (
          <div className="flex-1 overflow-y-auto p-2">
            <p className="px-2 pb-1 text-xs font-medium text-stone-500">Selecionados nesta sessão ({selected.length})</p>
            {selected.map((id) => {
              const s = specimens.find((x) => x.id === id)
              if (!s) return null
              return (
                <div key={id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-stone-800">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-stone-100">{s.displayName}</span>
                    <span className="block truncate text-xs text-stone-500">
                      {TYPE_LABELS[s.type]}
                      {s.code_global ? ` · #${s.code_global}` : ''}
                      {s.origin ? ` · ${s.origin}` : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    disabled={busy}
                    aria-label="Remover"
                    className="shrink-0 text-stone-500 transition hover:text-stone-300"
                  >
                    <CloseIcon />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {error && <p className="border-t border-stone-800 p-3 text-sm text-red-400">{error}</p>}
        {progress && (
          <p className="border-t border-stone-800 p-3 text-sm text-stone-300">
            Importando {progress.done} de {progress.total}…
          </p>
        )}

        <footer className="flex justify-end gap-2 border-t border-stone-800 p-3">
          <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={selected.length === 0 || busy}
            className="btn-primary"
          >
            {busy ? 'Importando…' : `Importar${selected.length > 0 ? ` (${selected.length})` : ''}`}
          </button>
        </footer>
      </div>
    </div>
  )
}

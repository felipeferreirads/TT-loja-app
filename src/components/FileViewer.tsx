import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, RenderingCancelledException, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { signedDownloadUrl, signedUrl, type StorageBucket } from '../lib/storage'
import { useAlert } from './DialogProvider'
import { DownloadIcon } from './icons'

GlobalWorkerOptions.workerSrc = workerUrl

/** Módulos wasm do pdfjs (JPEG2000/JBIG2), copiados para public/ no postinstall. */
const PDFJS_WASM_URL = `${import.meta.env.BASE_URL}pdfjs-wasm/`

export interface ViewerFile {
  /** Caminho no bucket (padrão "store"). */
  path: string
  /** "documents" para arquivos de Documentos (tabela compartilhada). */
  bucket?: StorageBucket
  /** Título exibido na barra superior. */
  title?: string | null
  /** Nome sugerido ao baixar (a extensão do caminho é usada se faltar). */
  filename?: string | null
}

function isPdf(path: string): boolean {
  return path.toLowerCase().split('?')[0].endsWith('.pdf')
}

function downloadName(file: ViewerFile): string {
  const ext = file.path.includes('.') ? file.path.slice(file.path.lastIndexOf('.')) : ''
  const base = (file.filename ?? file.title ?? '').trim()
  if (!base) return file.path.split('/').pop() ?? 'arquivo'
  return ext && !base.toLowerCase().endsWith(ext.toLowerCase()) ? `${base}${ext}` : base
}

/**
 * Visualizador interno dos arquivos anexados (PDF com todas as páginas
 * empilhadas, ou imagem), com botão para baixar o original. Substitui o
 * `window.open` em nova aba.
 */
export function FileViewer({ file, onClose }: { file: ViewerFile; onClose: () => void }) {
  const alert = useAlert()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const pdf = isPdf(file.path)

  useEffect(() => {
    let cancelled = false
    signedUrl(file.path, 3600, file.bucket).then(
      (u) => !cancelled && setUrl(u),
      () => !cancelled && setError(true),
    )
    return () => {
      cancelled = true
    }
  }, [file.path])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const download = async () => {
    try {
      const name = downloadName(file)
      const href = await signedDownloadUrl(file.path, name, 3600, file.bucket)
      const a = document.createElement('a')
      a.href = href
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      await alert('Não foi possível baixar o arquivo.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-stone-200">
        <span className="truncate">{file.title || (pdf ? 'PDF' : 'Imagem')}</span>
        <span className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => void download()} aria-label="Baixar" title="Baixar" className="tap-icon">
            <DownloadIcon />
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar" className="tap-icon text-xl">
            ✕
          </button>
        </span>
      </div>
      {error ? (
        <p className="p-6 text-center text-sm text-red-400">Não foi possível abrir o arquivo.</p>
      ) : !url ? (
        <p className="p-6 text-center text-sm text-stone-400">Carregando…</p>
      ) : pdf ? (
        <PdfPages url={url} />
      ) : (
        <div className="flex flex-1 items-center justify-center overflow-auto p-2">
          <img src={url} alt={file.title ?? ''} className="max-h-full max-w-full object-contain" onError={() => setError(true)} />
        </div>
      )}
    </div>
  )
}

function PdfPages({ url }: { url: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState(false)
  const [width, setWidth] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const task = getDocument({ url, wasmUrl: PDFJS_WASM_URL })
    task.promise.then(
      (d) => !cancelled && setDoc(d),
      () => !cancelled && setError(true),
    )
    return () => {
      cancelled = true
      task.destroy()
    }
  }, [url])

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => setWidth(Math.max(0, el.clientWidth - 16))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={boxRef} className="flex-1 space-y-3 overflow-y-auto px-2 pb-6">
      {error && <p className="p-6 text-center text-sm text-red-400">Não foi possível abrir o PDF.</p>}
      {!doc && !error && <p className="p-6 text-center text-sm text-stone-400">Carregando…</p>}
      {doc &&
        width > 0 &&
        Array.from({ length: doc.numPages }, (_, i) => (
          <div key={i} className="flex justify-center">
            <PdfPage pdf={doc} page={i + 1} cssWidth={Math.min(width, 1000)} />
          </div>
        ))}
    </div>
  )
}

/** Renderiza uma página no canvas, nítida pelo devicePixelRatio; cancela ao trocar de tamanho ou sair. */
function PdfPage({ pdf, page, cssWidth }: { pdf: PDFDocumentProxy; page: number; cssWidth: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let task: { cancel: () => void } | null = null
    const canvas = canvasRef.current
    setFailed(false)
    if (!canvas || cssWidth <= 0) return
    ;(async () => {
      try {
        const p = await pdf.getPage(page)
        if (cancelled) return
        const base = p.getViewport({ scale: 1 })
        const cssScale = cssWidth / base.width
        const viewport = p.getViewport({ scale: cssScale * (window.devicePixelRatio || 1) })
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${cssWidth}px`
        canvas.style.height = `${base.height * cssScale}px`
        const r = p.render({ canvas, canvasContext: ctx, viewport })
        task = r
        await r.promise
      } catch (err) {
        if (!cancelled && !(err instanceof RenderingCancelledException)) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [pdf, page, cssWidth])

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="bg-white shadow-lg" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900/95 p-4 text-center text-sm text-stone-300">
          Não foi possível exibir esta página.
        </div>
      )}
    </div>
  )
}

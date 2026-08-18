// Copiado do catálogo pessoal (src/lib/qrCamera.ts) sem alteração — zero
// dependências de i18n/domínio, nada a simplificar (claude.md §2).
//
// Câmera + decodificação de QR compartilhadas entre o leitor do dono
// (products/ScanPage.tsx) e a seção "Vincular etiqueta QR" (QrLinkSection.tsx).
// Extraído do ScanPage original — mesmo comportamento, só sem estado de React.
//
// A decodificação usa a API `BarcodeDetector` do NAVEGADOR (nativa no Chrome/
// WebView do Android, o alvo real deste fluxo), não uma biblioteca em JS.

/** O `BarcodeDetector` ainda não está no lib.dom padrão do TypeScript. */
export interface DetectedBarcode {
  rawValue: string
  /** Caixa do símbolo em pixels do QUADRO do vídeo (usada só pelo overlay do ScanPage). */
  boundingBox?: { x: number; y: number; width: number; height: number }
}
export interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike
  getSupportedFormats?: () => Promise<string[]>
}

export function barcodeDetectorCtor(): BarcodeDetectorCtor | null {
  const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  return typeof ctor === 'function' ? ctor : null
}

/**
 * `zoom` como restrição de `getUserMedia` — extensão não-padrão (rascunho da
 * Media Capture spec), sem tipos no lib.dom. Suportada no Chrome/WebView do
 * Android para câmeras "lógicas" multi-lente.
 *
 * Por quê: em celulares com lente ultra-angular + normal, pedir a câmera
 * traseira SEM especificar zoom deixa o Android escolher livremente — em
 * muitos aparelhos ele entrega a ultra-angular. Pedir `zoom: { ideal: 1 }`
 * empurra a câmera lógica pra lente NORMAL sem forçar mais que isso —
 * importante porque estes QRs são MINÚSCULOS (1-2 cm) e lidos de perto.
 */
interface ZoomConstraintSet extends MediaTrackConstraintSet {
  zoom?: ConstrainDouble
}

/** Tenta abrir a câmera com um zoom mínimo (foge da ultra-angular); cai pro pedido simples se o navegador rejeitar a restrição. */
export async function openCameraStream(deviceId?: string): Promise<MediaStream> {
  const base: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId } }
    : { facingMode: { ideal: 'environment' } }
  const withZoom: MediaTrackConstraints & ZoomConstraintSet = { ...base, zoom: { ideal: 1 } }
  try {
    return await navigator.mediaDevices.getUserMedia({ video: withZoom, audio: false })
  } catch (err) {
    // OverconstrainedError = o navegador não entende `zoom` (ou a lente
    // escolhida não tem essa faixa) — tenta de novo sem a restrição.
    if (err instanceof Error && err.name === 'OverconstrainedError') {
      return await navigator.mediaDevices.getUserMedia({ video: base, audio: false })
    }
    throw err
  }
}

/** Intervalo entre tentativas de leitura (ms) — ~10/s é suficiente e não fritura a CPU do celular. */
export const SCAN_INTERVAL_MS = 100

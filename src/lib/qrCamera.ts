// Copiado do catálogo pessoal (src/lib/qrCamera.ts) — zero dependências de
// i18n/domínio, nada a simplificar (claude.md §2). Reaplicado 21/08/2026: o
// pedido automático (zoom mínimo) nem sempre pega a lente certa em aparelhos
// com lentes traseiras separadas — a preferência lembrada abaixo é o que faz
// os leitores abrirem direto na lente escolhida manualmente da vez anterior.
//
// Câmera + decodificação de QR compartilhadas entre o leitor do dono
// (products/ScanPage.tsx), a seção "Vincular etiqueta QR" (QrLinkSection.tsx)
// e a aba "Escanear" de Importar da Coleção (ImportFromCollectionDialog.tsx).
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

/**
 * Em aparelhos onde cada lente aparece como um DISPOSITIVO separado (não uma
 * câmera lógica única com zoom controlável), a restrição `zoom` acima não
 * ajuda: `enumerateDevices` devolve várias entradas "facing back" e o
 * navegador abre a primeira, que costuma ser a grande-angular. Guardamos aqui
 * o `deviceId` escolhido manualmente em "Trocar câmera" (compartilhado pelos
 * três leitores desta app) para abrir direto nela da próxima vez, em vez de
 * cair na grande-angular de novo.
 */
const PREFERRED_DEVICE_KEY = 'tt_loja_qr_camera_device'

export function getPreferredCameraId(): string | null {
  return localStorage.getItem(PREFERRED_DEVICE_KEY)
}

export function setPreferredCameraId(deviceId: string | null): void {
  if (deviceId) localStorage.setItem(PREFERRED_DEVICE_KEY, deviceId)
  else localStorage.removeItem(PREFERRED_DEVICE_KEY)
}

/** Tenta abrir a câmera com um zoom mínimo (foge da ultra-angular); cai pro pedido simples se o navegador rejeitar a restrição. */
export async function openCameraStream(deviceId?: string): Promise<MediaStream> {
  // Sem pedido explícito (troca manual): usa a câmera lembrada da última vez,
  // se houver — é o que faz o leitor abrir direto na lente certa por padrão.
  const usingStoredPreference = deviceId === undefined
  const targetId = deviceId ?? getPreferredCameraId() ?? undefined
  const base: MediaTrackConstraints = targetId
    ? { deviceId: { exact: targetId } }
    : { facingMode: { ideal: 'environment' } }
  const withZoom: MediaTrackConstraints & ZoomConstraintSet = { ...base, zoom: { ideal: 1 } }
  try {
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
  } catch (err) {
    // A câmera lembrada de uma sessão anterior pode não existir mais neste
    // aparelho/navegador (troca de celular, permissões resetadas) — esquece a
    // preferência e cai no pedido padrão, em vez de travar o leitor.
    if (usingStoredPreference && targetId) {
      setPreferredCameraId(null)
      return openCameraStream()
    }
    throw err
  }
}

/** Intervalo entre tentativas de leitura (ms) — ~10/s é suficiente e não fritura a CPU do celular. */
export const SCAN_INTERVAL_MS = 100

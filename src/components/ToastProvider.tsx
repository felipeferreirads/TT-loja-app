import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon, CloseIcon, WarningIcon } from './icons'

/**
 * Feedback de sucesso/erro padronizado — antes cada ação (salvar, apagar,
 * registrar venda...) só recarregava a lista em silêncio, sem confirmar pro
 * dono que funcionou. Empilha até alguns toasts (`id` incremental, mesmo
 * motivo do `DialogProvider.tsx`: permitir várias notificações em sequência
 * sem uma pisar na outra), cada um se auto-remove depois de um tempo.
 */

/** Botão do aviso (ex.: "Reverter"). Clicar fecha o aviso e executa `onClick`. */
interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
}

interface ToastOptions {
  action?: ToastAction
  /** Quanto o aviso fica na tela. Avisos com ação ficam mais tempo por padrão. */
  durationMs?: number
}

interface Toast {
  id: number
  kind: 'success' | 'error'
  message: string
  action?: ToastAction
}

type ToastFn = (message: string, options?: ToastOptions) => void
interface ToastApi {
  success: ToastFn
  error: ToastFn
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast() precisa estar dentro de <ToastProvider>.')
  return api
}

const AUTO_DISMISS_MS = 3500
// Com botão de ação (ex.: "Reverter") o dono precisa de tempo pra ler e decidir.
const AUTO_DISMISS_WITH_ACTION_MS = 8000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: Toast['kind'], message: string, options?: ToastOptions) => {
      const id = ++nextId.current
      setToasts((prev) => [...prev, { id, kind, message, action: options?.action }])
      const duration = options?.durationMs ?? (options?.action ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS)
      setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  const api: ToastApi = {
    success: useCallback((message: string, options?: ToastOptions) => push('success', message, options), [push]),
    error: useCallback((message: string, options?: ToastOptions) => push('error', message, options), [push]),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div className="fixed inset-x-3 bottom-3 z-[70] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4">
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className={`flex w-full max-w-sm items-start gap-2 rounded-lg border px-3 py-2.5 shadow-lg backdrop-blur sm:w-auto ${
                  t.kind === 'success'
                    ? 'border-emerald-800 bg-emerald-950/95 text-emerald-200'
                    : 'border-red-800 bg-red-950/95 text-red-200'
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {t.kind === 'success' ? <CheckIcon className="h-4 w-4" /> : <WarningIcon className="h-4 w-4" />}
                </span>
                <p className="flex-1 text-sm">{t.message}</p>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      dismiss(t.id)
                      void t.action?.onClick()
                    }}
                    className="shrink-0 rounded px-2 py-0.5 text-sm font-semibold underline-offset-2 transition hover:bg-white/10 hover:underline"
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Fechar"
                  className="shrink-0 opacity-70 transition hover:opacity-100"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

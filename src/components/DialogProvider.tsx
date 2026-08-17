import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Substituto para `window.confirm` / `window.alert` / `window.prompt` — os
 * três abrem um popup NATIVO do navegador, fora do visual do app. Aqui os
 * três viram diálogos flutuantes no mesmo padrão visual, com API por Promise
 * que imita a assinatura nativa de propósito.
 */

interface ConfirmOptions {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  /** true = botão de confirmar em vermelho (ações destrutivas). */
  danger?: boolean
}

interface AlertOptions {
  title?: string
  okLabel?: string
}

interface PromptOptions {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  placeholder?: string
}

type DialogState =
  | { kind: 'confirm'; message: string; options?: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'alert'; message: string; options?: AlertOptions; resolve: () => void }
  | { kind: 'prompt'; message: string; defaultValue?: string; options?: PromptOptions; resolve: (v: string | null) => void }

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>
type AlertFn = (message: string, options?: AlertOptions) => Promise<void>
type PromptFn = (message: string, defaultValue?: string, options?: PromptOptions) => Promise<string | null>

const ConfirmContext = createContext<ConfirmFn | null>(null)
const AlertContext = createContext<AlertFn | null>(null)
const PromptContext = createContext<PromptFn | null>(null)

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn) throw new Error('useConfirm() precisa estar dentro de <DialogProvider>.')
  return fn
}

export function useAlert(): AlertFn {
  const fn = useContext(AlertContext)
  if (!fn) throw new Error('useAlert() precisa estar dentro de <DialogProvider>.')
  return fn
}

export function usePrompt(): PromptFn {
  const fn = useContext(PromptContext)
  if (!fn) throw new Error('usePrompt() precisa estar dentro de <DialogProvider>.')
  return fn
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (message, options) => new Promise((resolve) => setDialog({ kind: 'confirm', message, options, resolve })),
    [],
  )
  const alert = useCallback<AlertFn>(
    (message, options) => new Promise((resolve) => setDialog({ kind: 'alert', message, options, resolve })),
    [],
  )
  const prompt = useCallback<PromptFn>(
    (message, defaultValue, options) => new Promise((resolve) => setDialog({ kind: 'prompt', message, defaultValue, options, resolve })),
    [],
  )

  return (
    <ConfirmContext.Provider value={confirm}>
      <AlertContext.Provider value={alert}>
        <PromptContext.Provider value={prompt}>
          {children}
          {dialog?.kind === 'confirm' && (
            <ConfirmDialogView
              message={dialog.message}
              options={dialog.options}
              onResolve={(v) => {
                dialog.resolve(v)
                setDialog(null)
              }}
            />
          )}
          {dialog?.kind === 'alert' && (
            <AlertDialogView
              message={dialog.message}
              options={dialog.options}
              onResolve={() => {
                dialog.resolve()
                setDialog(null)
              }}
            />
          )}
          {dialog?.kind === 'prompt' && (
            <PromptDialogView
              message={dialog.message}
              defaultValue={dialog.defaultValue}
              options={dialog.options}
              onResolve={(v) => {
                dialog.resolve(v)
                setDialog(null)
              }}
            />
          )}
        </PromptContext.Provider>
      </AlertContext.Provider>
    </ConfirmContext.Provider>
  )
}

/** Escape == cancelar/fechar (mesmo atalho que os diálogos nativos já tinham). */
function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onEscape])
}

function DialogOverlay({ onDismiss, children }: { onDismiss: () => void; children: ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onDismiss}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-xl bg-stone-900 p-5">
        {children}
      </div>
    </div>,
    document.body,
  )
}

function ConfirmDialogView({
  message,
  options,
  onResolve,
}: {
  message: string
  options?: ConfirmOptions
  onResolve: (v: boolean) => void
}) {
  useEscapeKey(() => onResolve(false))
  return (
    <DialogOverlay onDismiss={() => onResolve(false)}>
      {options?.title && <h2 className="text-lg font-bold text-stone-100">{options.title}</h2>}
      <p className="text-sm whitespace-pre-line text-stone-300">{message}</p>
      <div className="flex gap-2">
        <button type="button" autoFocus onClick={() => onResolve(false)} className="btn-secondary flex-1">
          {options?.cancelLabel ?? 'Cancelar'}
        </button>
        <button
          type="button"
          onClick={() => onResolve(true)}
          className={`${options?.danger ? 'btn-danger' : 'btn-primary'} flex-1`}
        >
          {options?.confirmLabel ?? 'Confirmar'}
        </button>
      </div>
    </DialogOverlay>
  )
}

function AlertDialogView({ message, options, onResolve }: { message: string; options?: AlertOptions; onResolve: () => void }) {
  useEscapeKey(onResolve)
  return (
    <DialogOverlay onDismiss={onResolve}>
      {options?.title && <h2 className="text-lg font-bold text-stone-100">{options.title}</h2>}
      <p className="text-sm whitespace-pre-line text-stone-300">{message}</p>
      <div className="flex justify-end">
        <button type="button" autoFocus onClick={onResolve} className="btn-primary min-w-24">
          {options?.okLabel ?? 'OK'}
        </button>
      </div>
    </DialogOverlay>
  )
}

function PromptDialogView({
  message,
  defaultValue,
  options,
  onResolve,
}: {
  message: string
  defaultValue?: string
  options?: PromptOptions
  onResolve: (v: string | null) => void
}) {
  const [value, setValue] = useState(defaultValue ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  useEscapeKey(() => onResolve(null))

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onResolve(value)
  }

  return (
    <DialogOverlay onDismiss={() => onResolve(null)}>
      <form onSubmit={submit} className="space-y-4">
        {options?.title && <h2 className="text-lg font-bold text-stone-100">{options.title}</h2>}
        <p className="text-sm whitespace-pre-line text-stone-300">{message}</p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={options?.placeholder}
          className="input"
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => onResolve(null)} className="btn-secondary flex-1">
            {options?.cancelLabel ?? 'Cancelar'}
          </button>
          <button type="submit" className="btn-primary flex-1">
            {options?.confirmLabel ?? 'OK'}
          </button>
        </div>
      </form>
    </DialogOverlay>
  )
}

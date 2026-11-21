// Tela de PIN da trava de abertura do app + o portão que a exibe —
// COMPARTILHADO entre o catálogo e a loja (ver scripts/shared-ui.mjs; editar
// no catálogo e rodar `npm run ui:sync`). Textos por props; o estado da trava
// vem de `lib/appLock.ts` (instância criada por cada app com chave própria).
//
// `AppLockGate` envolve as rotas autenticadas. Com a trava ligada, cobre o app
// com a tela de PIN ao abrir e ao voltar do segundo plano depois do tempo
// escolhido. O conteúdo por baixo continua MONTADO (fica `inert`): voltar do
// segundo plano não perde formulário em edição nem posição de rolagem.

import { useEffect, useState, type ReactNode } from 'react'
import { PinPrompt, type PinPadLabels } from './PinPad'
import {
  APP_LOCK_PIN_MAX_LENGTH,
  APP_LOCK_PIN_MIN_LENGTH,
  useAppLock,
  type AppLock,
} from '../lib/appLock'

export interface PinLockScreenLabels extends PinPadLabels {
  title: string
  description?: string
  wrongPin: string
  forgot: string
  forgotTitle: string
  forgotDescription: string
  forgotConfirm: string
  cancel: string
}

interface PinLockScreenProps {
  labels: PinLockScreenLabels
  /** Logo do app, exibida acima do título. */
  logo?: ReactNode
  onUnlock: (pin: string) => Promise<boolean>
  /** "Esqueci o PIN": desliga a trava neste dispositivo e encerra a sessão. */
  onForgot: () => Promise<void> | void
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function PinLockScreen({ labels, logo, onUnlock, onForgot }: PinLockScreenProps) {
  const [forgotOpen, setForgotOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      className="fixed inset-0 z-[20000] flex flex-col items-center overflow-y-auto bg-stone-950 px-4"
      style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="my-auto flex w-full max-w-sm flex-col items-center gap-6">
        {logo ?? <span className="text-4xl text-amber-400"><LockGlyph /></span>}

        {forgotOpen ? (
          <div className="w-full space-y-4 rounded-2xl border border-stone-700/70 bg-stone-900 p-6 text-center">
            <h2 className="text-lg font-semibold text-stone-100">{labels.forgotTitle}</h2>
            <p className="text-sm leading-relaxed text-stone-400">{labels.forgotDescription}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForgotOpen(false)} disabled={leaving} className="btn-secondary flex-1">
                {labels.cancel}
              </button>
              <button
                type="button"
                disabled={leaving}
                onClick={async () => {
                  setLeaving(true)
                  try {
                    await onForgot()
                  } finally {
                    setLeaving(false)
                  }
                }}
                className="btn-primary flex-1"
              >
                {labels.forgotConfirm}
              </button>
            </div>
          </div>
        ) : (
          <>
            <PinPrompt
              title={labels.title}
              description={labels.description}
              minLength={APP_LOCK_PIN_MIN_LENGTH}
              maxLength={APP_LOCK_PIN_MAX_LENGTH}
              labels={labels}
              onSubmit={async (pin) => ((await onUnlock(pin)) ? null : labels.wrongPin)}
            />
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-sm text-stone-400 underline-offset-4 transition hover:text-stone-200 hover:underline"
            >
              {labels.forgot}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

interface AppLockGateProps {
  lock: AppLock
  labels: PinLockScreenLabels
  logo?: ReactNode
  /** Encerra a sessão. A trava deste dispositivo é desligada antes. */
  signOut: () => Promise<void> | void
  children: ReactNode
}

export function AppLockGate({ lock, labels, logo, signOut, children }: AppLockGateProps) {
  const { config, locked } = useAppLock(lock)

  // Segundo plano: guarda quando a aba/app foi escondido e, ao voltar, trava
  // se passou do tempo escolhido. Com "sempre" (0), trava já ao esconder,
  // para a miniatura do alternador de apps não mostrar o conteúdo.
  useEffect(() => {
    if (!config) return
    let hiddenAt: number | null = null
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        if (config.graceSeconds <= 0) lock.lock()
      } else if (hiddenAt !== null) {
        if (Date.now() - hiddenAt >= config.graceSeconds * 1000) lock.lock()
        hiddenAt = null
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [config, lock])

  return (
    <>
      <div style={{ display: 'contents' }} inert={locked} aria-hidden={locked || undefined}>
        {children}
      </div>
      {locked && (
        <PinLockScreen
          labels={labels}
          logo={logo}
          onUnlock={lock.unlock}
          onForgot={async () => {
            lock.disable()
            await signOut()
          }}
        />
      )}
    </>
  )
}

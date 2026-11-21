import { useState } from 'react'
import { PinSetupDialog, type PinSetupMode } from '../../components/PinSetupDialog'
import { ToggleSwitch } from '../../components/ToggleSwitch'
import {
  APP_LOCK_GRACE_OPTIONS,
  APP_LOCK_PIN_MAX_LENGTH,
  APP_LOCK_PIN_MIN_LENGTH,
  useAppLock,
} from '../../lib/appLock'
import { APP_LOCK_SETUP_LABELS, appLock } from './appLock'

const graceLabel = (seconds: number) => (seconds === 0 ? 'Sempre' : `Após ${seconds / 60} min`)

/**
 * Configurações da loja. Hoje só a trava de abertura por PIN, que é
 * preferência deste dispositivo (fica no `localStorage`, não no Supabase).
 * O tema continua no menu do cabeçalho (`ThemeMenu`).
 */
export function SettingsPage() {
  const { config } = useAppLock(appLock)
  const [mode, setMode] = useState<PinSetupMode | null>(null)

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-stone-100">Configurações</h1>
        <p className="mt-1 text-sm text-stone-500">Preferências deste dispositivo.</p>
      </header>

      <section className="space-y-4 rounded-xl border border-stone-800 bg-stone-900/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-100">Bloquear o app com PIN</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              Pede um PIN ao abrir o app e ao voltar depois de um tempo em segundo plano. Vale só para este
              dispositivo.
            </p>
          </div>
          <ToggleSwitch checked={config !== null} onChange={(on) => setMode(on ? 'enable' : 'disable')} />
        </div>

        {config && (
          <div className="space-y-3 border-t border-stone-800 pt-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-100">Pedir o PIN novamente</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Tempo em segundo plano após o qual o app volta a pedir o PIN.
                </p>
              </div>
              <button type="button" onClick={() => setMode('change')} className="btn-secondary text-sm">
                Alterar PIN
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {APP_LOCK_GRACE_OPTIONS.map((seconds) => {
                const active = config.graceSeconds === seconds
                return (
                  <button
                    key={seconds}
                    type="button"
                    aria-pressed={active}
                    onClick={() => appLock.setGraceSeconds(seconds)}
                    className={`rounded-lg px-3 py-2 text-sm transition ${
                      active ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {graceLabel(seconds)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {mode && (
        <PinSetupDialog
          mode={mode}
          minLength={APP_LOCK_PIN_MIN_LENGTH}
          maxLength={APP_LOCK_PIN_MAX_LENGTH}
          labels={APP_LOCK_SETUP_LABELS}
          verifyCurrent={appLock.verify}
          onComplete={async (pin) => {
            if (pin) await appLock.setPin(pin)
            else appLock.disable()
          }}
          onClose={() => setMode(null)}
        />
      )}
    </div>
  )
}

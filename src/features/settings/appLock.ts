import { createAppLock } from '../../lib/appLock'
import type { PinLockScreenLabels } from '../../components/PinLockScreen'
import type { PinSetupLabels } from '../../components/PinSetupDialog'
import { APP_LOCK_PIN_MAX_LENGTH, APP_LOCK_PIN_MIN_LENGTH } from '../../lib/appLock'

/**
 * Trava de abertura da loja (opcional, por dispositivo). Mecanismo e
 * componentes copiados do catálogo pelo `scripts/shared-ui.mjs` do repo pai
 * (`lib/appLock.ts`, `lib/pinHash.ts`, `components/PinPad.tsx`,
 * `PinLockScreen.tsx`, `PinSetupDialog.tsx`). Chave própria no
 * `localStorage`: independente da trava do catálogo no mesmo navegador.
 */
export const appLock = createAppLock('tt_loja_app_lock')

export const APP_LOCK_SCREEN_LABELS: PinLockScreenLabels = {
  title: 'Digite o PIN',
  wrongPin: 'PIN incorreto.',
  forgot: 'Esqueci o PIN',
  forgotTitle: 'Redefinir o acesso',
  forgotDescription:
    'A sessão é encerrada e o bloqueio por PIN é desativado neste dispositivo. Para voltar ao app, entre novamente com e-mail e senha. Os dados da conta são preservados.',
  forgotConfirm: 'Sair e desativar',
  cancel: 'Cancelar',
  delete: 'Apagar dígito',
  submit: 'Confirmar',
}

export const APP_LOCK_SETUP_LABELS: PinSetupLabels = {
  titleEnable: 'Ativar o bloqueio do app',
  titleChange: 'Alterar o PIN do app',
  titleDisable: 'Desativar o bloqueio do app',
  stepCurrent: 'Digite o PIN atual',
  stepNew: 'Crie um PIN',
  stepNewDescription: `Use de ${APP_LOCK_PIN_MIN_LENGTH} a ${APP_LOCK_PIN_MAX_LENGTH} dígitos.`,
  stepConfirm: 'Digite o PIN novamente',
  wrongPin: 'PIN incorreto.',
  minLength: `O PIN deve ter pelo menos ${APP_LOCK_PIN_MIN_LENGTH} dígitos.`,
  mismatch: 'Os PINs não coincidem. Crie o PIN novamente.',
  cancel: 'Cancelar',
  delete: 'Apagar dígito',
  submit: 'Confirmar',
}

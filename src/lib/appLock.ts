// Trava de abertura do app por PIN — COMPARTILHADO entre o catálogo e a loja
// (ver scripts/shared-ui.mjs; editar no catálogo e rodar `npm run ui:sync`).
//
// Opcional e POR DISPOSITIVO: a configuração fica só no `localStorage` deste
// navegador/aparelho (nada no Supabase). Guarda apenas o hash PBKDF2 com salt
// (`lib/pinHash.ts`), nunca o PIN. Cada app cria a sua instância com uma
// chave própria (`createAppLock('tt_app_lock')` no catálogo,
// `createAppLock('tt_loja_app_lock')` na loja), então as travas dos dois apps
// são independentes mesmo no mesmo navegador.
//
// NÃO é o PIN do modo privado do catálogo (`features/private/PrivacyProvider`,
// gravado em `user_settings`): são dois PINs separados, que só compartilham a
// função de hash.
//
// Alcance: é uma trava de UX contra uso casual do aparelho desbloqueado.
// Quem tem acesso ao `localStorage` do navegador já tem também a sessão do
// Supabase, então o mínimo de 4 dígitos (menor que os 6 do modo privado) não
// enfraquece nada que a trava de fato proteja. A segurança dos dados continua
// sendo login + RLS.

import { useSyncExternalStore } from 'react'
import { generateSalt, hashPin } from './pinHash'

export const APP_LOCK_PIN_MIN_LENGTH = 4
export const APP_LOCK_PIN_MAX_LENGTH = 8

/** Tempo em segundo plano antes de pedir o PIN de novo (0 = sempre). */
export const APP_LOCK_GRACE_OPTIONS = [0, 60, 300, 900] as const
export const APP_LOCK_DEFAULT_GRACE_SECONDS = 60

export interface AppLockConfig {
  hash: string
  salt: string
  graceSeconds: number
}

export interface AppLockState {
  /** null = trava desligada neste dispositivo. */
  config: AppLockConfig | null
  /** true = a tela de PIN está sendo exibida. */
  locked: boolean
}

export interface AppLock {
  getState: () => AppLockState
  subscribe: (listener: () => void) => () => void
  /** Liga a trava (ou troca o PIN, mantendo o tempo escolhido). */
  setPin: (pin: string) => Promise<void>
  verify: (pin: string) => Promise<boolean>
  /** Desliga a trava neste dispositivo e apaga o hash. */
  disable: () => void
  setGraceSeconds: (seconds: number) => void
  lock: () => void
  /** Confere o PIN e, se correto, libera o app. */
  unlock: (pin: string) => Promise<boolean>
}

function parseConfig(raw: string | null): AppLockConfig | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<AppLockConfig>
    if (typeof value.hash !== 'string' || typeof value.salt !== 'string') return null
    return {
      hash: value.hash,
      salt: value.salt,
      graceSeconds: typeof value.graceSeconds === 'number' ? value.graceSeconds : APP_LOCK_DEFAULT_GRACE_SECONDS,
    }
  } catch {
    return null
  }
}

export function createAppLock(storageKey: string): AppLock {
  const read = (): AppLockConfig | null => {
    try {
      return parseConfig(localStorage.getItem(storageKey))
    } catch {
      return null
    }
  }

  // Ao carregar a página com a trava ligada, o app já nasce travado.
  const initial = read()
  let state: AppLockState = { config: initial, locked: initial !== null }
  const listeners = new Set<() => void>()

  const set = (next: Partial<AppLockState>) => {
    state = { ...state, ...next }
    if (!state.config) state.locked = false
    listeners.forEach((l) => l())
  }

  const write = (config: AppLockConfig | null) => {
    try {
      if (config) localStorage.setItem(storageKey, JSON.stringify(config))
      else localStorage.removeItem(storageKey)
    } catch {
      // Armazenamento indisponível (modo privado do navegador): vale só nesta sessão.
    }
    set({ config })
  }

  // Outra aba do mesmo app ligou, desligou ou trocou o PIN.
  const onStorage = (e: StorageEvent) => {
    if (e.key === storageKey) set({ config: parseConfig(e.newValue) })
  }

  const verify = async (pin: string) => {
    const config = state.config
    if (!config) return true
    return (await hashPin(pin, config.salt)) === config.hash
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      if (listeners.size === 0) window.addEventListener('storage', onStorage)
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) window.removeEventListener('storage', onStorage)
      }
    },
    setPin: async (pin) => {
      const salt = generateSalt()
      const hash = await hashPin(pin, salt)
      write({ hash, salt, graceSeconds: state.config?.graceSeconds ?? APP_LOCK_DEFAULT_GRACE_SECONDS })
    },
    verify,
    disable: () => write(null),
    setGraceSeconds: (graceSeconds) => {
      if (state.config) write({ ...state.config, graceSeconds })
    },
    lock: () => {
      if (state.config) set({ locked: true })
    },
    unlock: async (pin) => {
      const ok = await verify(pin)
      if (ok) set({ locked: false })
      return ok
    },
  }
}

export function useAppLock(lock: AppLock): AppLockState {
  return useSyncExternalStore(lock.subscribe, lock.getState, lock.getState)
}

import { useEffect, useRef, useState } from 'react'
import {
  applyTheme,
  getStoredAccentOnly,
  getStoredTheme,
  getStoredWarmBackground,
  parseTheme,
  setAccentOnly,
  setWarmBackground,
  THEME_FAMILIES,
  themeValue,
  type ThemeMode,
} from '../lib/theme'
import { CheckIcon, MoonIcon, SunIcon } from './icons'

/** As 3 opções do fundo — ver bloco "Fundo quente" em themes.css. */
type BackgroundMode = 'full' | 'neutral' | 'warm'

/**
 * Seletor de tema: modo claro/escuro cruzado com a família de cor. Mesmo
 * mecanismo do catálogo (troca `data-theme` no <html>), só que sem persistir
 * no banco — a loja guarda a escolha só no localStorage deste dispositivo.
 */
export function ThemeMenu() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(getStoredTheme)
  const [accentOnly, setAccentOnlyState] = useState(getStoredAccentOnly)
  const [warmBackground, setWarmBackgroundState] = useState(getStoredWarmBackground)
  const ref = useRef<HTMLDivElement>(null)

  const { family, mode } = parseTheme(theme)
  // "Quente" não implica sozinho: em tema escuro cai pro binário de sempre
  // (não existe "quente" no escuro, ver themes.css).
  const backgroundMode: BackgroundMode = mode === 'light' && warmBackground ? 'warm' : accentOnly ? 'neutral' : 'full'
  const pickBackgroundMode = (next: BackgroundMode) => {
    const nextAccentOnly = next !== 'full'
    const nextWarm = next === 'warm'
    setAccentOnly(nextAccentOnly)
    setWarmBackground(nextWarm)
    setAccentOnlyState(nextAccentOnly)
    setWarmBackgroundState(nextWarm)
  }

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (nextFamily: string, nextMode: ThemeMode) => {
    const value = themeValue(nextFamily, nextMode)
    applyTheme(value)
    setTheme(value)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Aparência"
        aria-label="Aparência"
        className="tap-icon"
      >
        {mode === 'dark' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-stone-800 bg-stone-900 p-3 shadow-xl">
          <p className="section-title mb-2">Modo</p>
          <div className="mb-3 flex gap-2">
            {(['light', 'dark'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pick(family, m)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  mode === m ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {m === 'dark' ? <MoonIcon /> : <SunIcon />}
                {m === 'dark' ? 'Escuro' : 'Claro'}
              </button>
            ))}
          </div>

          <p className="section-title mb-2">Cor</p>
          <div className="grid grid-cols-6 gap-2">
            {THEME_FAMILIES.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => pick(f.key, mode)}
                title={f.label}
                aria-label={f.label}
                className={`relative flex aspect-square items-center justify-center rounded-lg border transition ${
                  family === f.key ? 'border-amber-500' : 'border-stone-700 hover:border-stone-500'
                }`}
                style={{ background: mode === 'dark' ? f.dark : f.light }}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: f.accent }} />
                {family === f.key && (
                  <CheckIcon className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-white" />
                )}
              </button>
            ))}
          </div>

          <p className="section-title mt-3 mb-2">Fundo</p>
          <div className="flex flex-col gap-1.5">
            {(
              [
                ['full', 'Tema completo'],
                ['neutral', 'Fundo neutro'],
                // Sem "quente" no Escuro — o creme/areia não tem equivalente lá.
                ...(mode === 'light' ? ([['warm', 'Fundo quente']] as const) : []),
              ] as [BackgroundMode, string][]
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-stone-300">
                <input
                  type="radio"
                  name="background-mode"
                  checked={backgroundMode === value}
                  onChange={() => pickBackgroundMode(value)}
                  className="accent-amber-600"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

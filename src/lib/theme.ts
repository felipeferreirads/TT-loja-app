/**
 * Temas da loja — mesmo mecanismo do catálogo pessoal (`data-theme` no <html>
 * + override das escalas `stone`/`amber` do Tailwind em themes.css), sem o
 * i18n nem a persistência em `user_settings`: aqui o tema vive só no
 * localStorage deste dispositivo.
 *
 * Chaves com prefixo `tt_loja_` de propósito: os dois apps podem acabar
 * servidos na mesma origem `localhost:<porta>` em dev, e o localStorage é por
 * origem — sem o prefixo, trocar o tema num app mexeria no outro.
 */

const STORAGE_KEY = 'tt_loja_theme'
const ACCENT_ONLY_STORAGE_KEY = 'tt_loja_accent_only'

export type ThemeMode = 'light' | 'dark'

export interface ThemeFamily {
  /** Prefixo do valor de `data-theme`; 'base' usa os valores nus 'dark'/'light'. */
  key: string
  label: string
  accent: string
  light: string
  dark: string
}

export const THEME_FAMILIES: ThemeFamily[] = [
  { key: 'base', label: 'Topázio Imperial', accent: '#d97706', light: '#fafaf9', dark: '#1c1917' },
  { key: 'amethyst', label: 'Ametista', accent: '#9d5fd6', light: '#f6f1fb', dark: '#1b1720' },
  { key: 'aquamarine', label: 'Água-marinha', accent: '#2a9bea', light: '#f0f6fc', dark: '#080b0d' },
  { key: 'paraiba', label: 'Turmalina Paraíba', accent: '#3fdde0', light: '#eef9fa', dark: '#0e1a1c' },
  { key: 'rose', label: 'Morganita', accent: '#e2688a', light: '#fdf1f2', dark: '#1f1418' },
  { key: 'topaz', label: 'Rutilo Dourado', accent: '#be8b00', light: '#f7f5ee', dark: '#0b0a08' },
  { key: 'malachite', label: 'Malaquita', accent: '#3ead5f', light: '#f0f8f1', dark: '#080b09' },
  { key: 'emerald', label: 'Esmeralda', accent: '#007627', light: '#f0f8f1', dark: '#080b09' },
  { key: 'ruby', label: 'Rubi', accent: '#f5564d', light: '#fdf2f1', dark: '#0e0909' },
  { key: 'sapphire', label: 'Safira', accent: '#325bc7', light: '#f2f5fc', dark: '#090b0e' },
  { key: 'heliodor', label: 'Heliodoro', accent: '#a79700', light: '#f6f6ef', dark: '#0b0b08' },
  { key: 'scifi', label: 'Apatita', accent: '#12c8d8', light: '#eef6fa', dark: '#0d1119' },
]

/** 'dark' | 'light' | 'ruby_dark' | … — o valor que vai pro atributo do <html>. */
export function themeValue(familyKey: string, mode: ThemeMode): string {
  return familyKey === 'base' ? mode : `${familyKey}_${mode}`
}

export function parseTheme(value: string): { family: string; mode: ThemeMode } {
  if (value === 'dark' || value === 'light') return { family: 'base', mode: value }
  const mode: ThemeMode = value.endsWith('_light') ? 'light' : 'dark'
  return { family: value.replace(/_(light|dark)$/, ''), mode }
}

const VALID = new Set(
  THEME_FAMILIES.flatMap((f) => [themeValue(f.key, 'light'), themeValue(f.key, 'dark')]),
)

export function applyTheme(theme: string): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage indisponível — só perde o cache do próximo boot.
  }
}

export function getStoredTheme(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && VALID.has(stored)) return stored
  } catch {
    // ignora
  }
  return 'dark'
}

/** "Fundo neutro": mantém os neutros achromáticos e deixa só o acento colorido. */
export function setAccentOnly(on: boolean): void {
  if (on) document.documentElement.setAttribute('data-accent-only', 'true')
  else document.documentElement.removeAttribute('data-accent-only')
  try {
    localStorage.setItem(ACCENT_ONLY_STORAGE_KEY, String(on))
  } catch {
    // ignora
  }
}

export function getStoredAccentOnly(): boolean {
  try {
    const stored = localStorage.getItem(ACCENT_ONLY_STORAGE_KEY)
    if (stored !== null) return stored === 'true'
  } catch {
    // ignora
  }
  return true
}

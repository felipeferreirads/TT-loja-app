import { createClient } from '@supabase/supabase-js'

// Chaves SEMPRE via .env — nunca hardcode. Veja .env.example.
// Mesmo projeto Supabase do Tesouros da Terra (catálogo pessoal) — ver
// ../docs/PROJETO-APP-LOJA.md no repo do catálogo para o raciocínio.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

// Preferência "manter-me conectado", decidida no login. Fica solta no
// localStorage (fora do token de sessão) pra sobreviver ao fechar o
// navegador e o adapter abaixo saber onde gravar o próximo token.
const KEEP_SIGNED_IN_KEY = 'keepSignedIn'

export function setKeepSignedIn(keep: boolean) {
  if (keep) localStorage.setItem(KEEP_SIGNED_IN_KEY, 'true')
  else localStorage.removeItem(KEEP_SIGNED_IN_KEY)
}

function keepSignedIn(): boolean {
  return localStorage.getItem(KEEP_SIGNED_IN_KEY) === 'true'
}

// Adapter de storage do auth: token vai pro localStorage (sobrevive ao
// fechar o navegador) ou sessionStorage (só dura a aba), conforme a
// preferência gravada no login. getItem olha os dois lugares pra achar a
// sessão não importa onde ela esteja.
const authStorage = {
  getItem: (key: string) => sessionStorage.getItem(key) ?? localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    if (keepSignedIn()) {
      localStorage.setItem(key, value)
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, value)
      localStorage.removeItem(key)
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'anon-key-nao-configurada',
  { auth: { storage: authStorage } },
)

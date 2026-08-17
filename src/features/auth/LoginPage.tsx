import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, supabaseConfigured, setKeepSignedIn } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

// Cadastro fechado: o usuário é criado no painel do Supabase (Auth > Users) —
// mesma conta do dono usada no Tesouros da Terra (ver docs/PROJETO-APP-LOJA.md).
export function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepConnected, setKeepConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setKeepSignedIn(keepConnected)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-950 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-stone-900 p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-stone-100">Loja</h1>
          <p className="mt-1 text-sm text-stone-400">Inventário e Gestão</p>
        </div>

        {!supabaseConfigured && (
          <p className="rounded-lg bg-amber-900/40 p-3 text-sm text-amber-200">
            Supabase não configurado — preencha <code>.env</code> (veja <code>.env.example</code>).
          </p>
        )}

        <label className="block">
          <span className="text-sm text-stone-300">E-mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone-300">Senha</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            checked={keepConnected}
            onChange={(e) => setKeepConnected(e.target.checked)}
            className="size-4 rounded border-stone-600 bg-stone-800 text-emerald-600 focus:ring-emerald-600"
          />
          Manter-me conectado
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

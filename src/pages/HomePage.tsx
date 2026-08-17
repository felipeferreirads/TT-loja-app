import { useAuth } from '../features/auth/AuthProvider'

// Placeholder — primeira tela real é o MVP da seção 6.1 do plano
// (cadastro de produto, PDV, clientes, fluxo de caixa).
export function HomePage() {
  const { session, signOut } = useAuth()

  return (
    <div className="min-h-dvh p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Loja — Inventário e Gestão</h1>
          <p className="text-sm text-stone-400">{session?.user.email}</p>
        </div>
        <button type="button" onClick={() => void signOut()} className="btn-secondary">
          Sair
        </button>
      </header>
      <p className="text-sm text-stone-400">Nada aqui ainda — scaffold inicial.</p>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { AppLogo } from './AppLogo'
import { AppSidebar } from './AppSidebar'
import { RouteErrorBoundary } from './ErrorBoundary'
import { ThemeMenu } from './ThemeMenu'
import { LogOutIcon, SidebarIcon } from './icons'
import { useLocalToggle } from '../lib/useLocalToggle'

/**
 * Shell persistente de todas as rotas autenticadas — mesma estrutura do
 * `Layout` do catálogo pessoal: botão da barra lateral colado na borda
 * esquerda, cabeçalho centralizado em `max-w-7xl`, navegação na `AppSidebar`
 * e as páginas dentro do `<Outlet/>` protegidas por `RouteErrorBoundary`.
 */
export function Layout() {
  const { session, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  // Colapsar a sidebar fixa (desktop) é preferência do dispositivo, como no catálogo.
  const [desktopOpen, setDesktopOpen] = useLocalToggle('tt_loja_sidebar_open', true)
  const location = useLocation()

  useEffect(() => setMobileOpen(false), [location.pathname])

  const toggleSidebar = () => {
    setMobileOpen((v) => !v)
    setDesktopOpen((v) => !v)
  }

  return (
    <div className="flex h-dvh flex-col bg-stone-950 text-stone-200">
      <header className="safe-top sticky top-0 z-40 flex items-center border-b border-stone-800 bg-stone-950/95 backdrop-blur">
        {/* Fora do `max-w-7xl` para ficar colado na borda em telas largas. */}
        <div className="flex shrink-0 items-center gap-1 py-3 pl-2 sm:pl-4">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Mostrar ou ocultar a navegação"
            title="Mostrar ou ocultar a navegação"
            className="tap-icon text-stone-400 transition hover:bg-stone-800 hover:text-stone-100"
          >
            <SidebarIcon />
          </button>
        </div>
        <div className="mx-auto flex w-full max-w-7xl items-center gap-x-1 px-2 py-3 sm:justify-between sm:gap-x-2 sm:px-4">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <AppLogo />
            <span className="hidden rounded-full border border-stone-700 px-2.5 py-0.5 text-xs font-medium tracking-wide text-stone-400 sm:inline">
              Loja
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-0.5 sm:ml-0 sm:gap-1">
            <span className="mr-1 hidden text-xs text-stone-500 lg:inline">{session?.user.email}</span>
            <ThemeMenu />
            <button type="button" onClick={() => void signOut()} title="Sair" aria-label="Sair" className="tap-icon">
              <LogOutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AppSidebar mobileOpen={mobileOpen} desktopOpen={desktopOpen} onClose={() => setMobileOpen(false)} />
        {/* id lido pelo modo planilha (tabela com cabeçalho fixo dentro da área rolável). */}
        <main id="app-scroll-container" className="safe-bottom min-w-0 flex-1 overflow-auto bg-stone-950">
          <div className="w-full p-3 sm:p-4">
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { AppLogo } from './AppLogo'
import { AppSidebar } from './AppSidebar'
import { ThemeMenu } from './ThemeMenu'
import { LogOutIcon, SidebarIcon } from './icons'

/**
 * Shell persistente de todas as rotas autenticadas — mesmo papel do `Layout`
 * do catálogo pessoal: cabeçalho fixo com logo/tema/sair e navegação na
 * `AppSidebar`, com as páginas renderizando dentro do `<Outlet/>`. Antes cada
 * página da loja reimplementava seu próprio cabeçalho e um link "← Início".
 */
export function Layout() {
  const { session, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)
  const location = useLocation()

  useEffect(() => setMobileOpen(false), [location.pathname])

  const toggleSidebar = () => {
    setMobileOpen((v) => !v)
    setDesktopOpen((v) => !v)
  }

  return (
    <div className="flex h-dvh flex-col bg-stone-950 text-stone-200">
      <header className="safe-top sticky top-0 z-40 flex items-center gap-2 border-b border-stone-800 bg-stone-950/95 px-2 py-2 backdrop-blur sm:px-4">
        <button type="button" onClick={toggleSidebar} aria-label="Mostrar/ocultar navegação" className="tap-icon">
          <SidebarIcon className="h-5 w-5" />
        </button>
        <Link to="/produtos" className="flex shrink-0 items-center gap-3">
          <AppLogo />
          <span className="hidden text-sm font-medium text-stone-200 sm:inline">Loja · Inventário e Gestão</span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span className="hidden text-xs text-stone-500 lg:inline">{session?.user.email}</span>
          <ThemeMenu />
          <button type="button" onClick={() => void signOut()} title="Sair" aria-label="Sair" className="tap-icon">
            <LogOutIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AppSidebar mobileOpen={mobileOpen} desktopOpen={desktopOpen} onClose={() => setMobileOpen(false)} />
        <main className="safe-bottom flex-1 overflow-auto">
          <div className="w-full p-3 sm:p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

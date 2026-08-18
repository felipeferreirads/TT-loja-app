import { NavLink } from 'react-router-dom'
import {
  CardIcon,
  ChartIcon,
  DocumentIcon,
  PackageIcon,
  SpecimenIcon,
  TagIcon,
} from './icons'
import type { ComponentType, SVGProps } from 'react'

export interface NavItem {
  to: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Rota raiz precisa de `end` pra não ficar ativa em toda subrota. */
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/produtos', label: 'Produtos', Icon: SpecimenIcon },
  { to: '/vendas', label: 'Vendas', Icon: PackageIcon },
  { to: '/clientes', label: 'Clientes', Icon: CardIcon },
  { to: '/documentos', label: 'Documentos', Icon: DocumentIcon },
  { to: '/precificacao', label: 'Precificação', Icon: TagIcon },
  { to: '/empresa', label: 'Empresa', Icon: ChartIcon },
]

function itemClass(isActive: boolean, compact: boolean): string {
  return [
    'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition',
    compact ? 'justify-center px-0' : '',
    isActive ? 'bg-stone-800 text-amber-400' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-100',
  ].join(' ')
}

/**
 * Navegação lateral: fixa no desktop (colapsável para só ícones) e drawer
 * sobreposto no celular. Mesmo papel do `AppSidebar` do catálogo pessoal, sem
 * a árvore de categorias (a loja não tem categorias hierárquicas).
 */
export function AppSidebar({
  mobileOpen,
  desktopOpen,
  onClose,
}: {
  mobileOpen: boolean
  desktopOpen: boolean
  onClose: () => void
}) {
  const nav = (compact: boolean) => (
    <nav className="flex flex-col gap-1 p-2">
      {NAV_ITEMS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onClose}
          title={compact ? label : undefined}
          className={({ isActive }) => itemClass(isActive, compact)}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {!compact && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <>
      {/* Desktop: coluna fixa, colapsa para uma faixa só de ícones. */}
      <aside
        className={`hidden shrink-0 overflow-y-auto border-r border-stone-800 bg-stone-950 transition-[width] md:block ${
          desktopOpen ? 'w-52' : 'w-16'
        }`}
      >
        {nav(!desktopOpen)}
      </aside>

      {/* Celular: drawer sobreposto. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar navegação"
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />
          <aside className="safe-top relative h-full w-60 overflow-y-auto border-r border-stone-800 bg-stone-950">
            {nav(false)}
          </aside>
        </div>
      )}
    </>
  )
}

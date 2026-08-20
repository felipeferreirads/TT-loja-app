import { NavLink } from 'react-router-dom'
import {
  BuildingIcon,
  CalculatorIcon,
  CardIcon,
  CashIcon,
  ChartIcon,
  DocumentIcon,
  PackageIcon,
  SpecimenIcon,
  TruckIcon,
} from './icons'
import type { ComponentType, SVGProps } from 'react'

export interface NavItem {
  to: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Rota raiz precisa de `end` pra não ficar ativa em toda subrota. */
  end?: boolean
}

// "Escanear" não é mais uma aba própria — o botão vive no cabeçalho da aba
// Produtos (`ProductsPage.tsx`), mesmo padrão do catálogo pessoal (o link
// para `/scan` fica junto da Coleção, não numa aba própria da navegação).
export const NAV_ITEMS: NavItem[] = [
  { to: '/produtos', label: 'Produtos', Icon: SpecimenIcon },
  { to: '/vendas', label: 'Vendas', Icon: PackageIcon },
  { to: '/clientes', label: 'Clientes', Icon: CardIcon },
  { to: '/fornecedores', label: 'Fornecedores', Icon: TruckIcon },
  { to: '/documentos', label: 'Documentos', Icon: DocumentIcon },
  { to: '/caixa', label: 'Fluxo de caixa', Icon: CashIcon },
  { to: '/estatisticas', label: 'Estatísticas', Icon: ChartIcon },
  { to: '/precificacao', label: 'Precificação', Icon: CalculatorIcon },
  { to: '/empresa', label: 'Empresa', Icon: BuildingIcon },
]

function itemClass(isActive: boolean): string {
  return [
    'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition',
    isActive ? 'bg-stone-800 text-amber-400' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-100',
  ].join(' ')
}

// Mesmo tamanho de ícone/botão/espaçamento da faixa colapsada do catálogo
// pessoal (`src/components/AppSidebar.tsx`) — as duas barras precisam ficar
// visualmente idênticas quando recolhidas.
const RAIL_ICON_CLASS = 'h-[18px] w-[18px] shrink-0'
function railItemClass(isActive: boolean): string {
  return `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
    isActive ? 'bg-stone-800 text-amber-400' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
  }`
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
  const nav = () => (
    <nav className="flex flex-col gap-1 p-2">
      {NAV_ITEMS.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onClose} className={({ isActive }) => itemClass(isActive)}>
          <Icon className="h-5 w-5 shrink-0" />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  )

  return (
    <>
      {/* Desktop: coluna fixa, colapsa para uma faixa só de ícones — mesma
          largura/espaçamento do catálogo pessoal (w-14, gap-1, py-3). Um
          único elemento cuja LARGURA anima (transition-[width]) entre os
          dois modos — o conteúdo de dentro já nasce na largura final (52 ou
          14) e o `overflow-hidden` do container recorta o que ainda não
          coube, revelando/escondendo progressivamente conforme anima. */}
      <aside
        className={`hidden shrink-0 overflow-hidden border-r border-stone-800 bg-stone-950 transition-[width] duration-200 ease-out md:block ${
          desktopOpen ? 'w-52' : 'w-14'
        }`}
      >
        {desktopOpen ? (
          <div className="h-full w-52 overflow-y-auto">{nav()}</div>
        ) : (
          <div className="flex h-full w-14 flex-col items-center gap-1 overflow-y-auto py-3">
            {NAV_ITEMS.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end} title={label} aria-label={label} className={({ isActive }) => railItemClass(isActive)}>
                <Icon className={RAIL_ICON_CLASS} />
              </NavLink>
            ))}
          </div>
        )}
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
            {nav()}
          </aside>
        </div>
      )}
    </>
  )
}

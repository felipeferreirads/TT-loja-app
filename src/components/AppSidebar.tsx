import { useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  BuildingIcon,
  CalculatorIcon,
  CardIcon,
  CashIcon,
  ChartIcon,
  CloseIcon,
  DocumentIcon,
  HomeIcon,
  PackageIcon,
  SpecimenIcon,
  TrashIcon,
  TruckIcon,
} from './icons'
import { AppLogo } from './AppLogo'
import { useLocalNumber } from '../lib/useLocalNumber'
import type { ComponentType, SVGProps } from 'react'

export interface NavItem {
  to: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Rota raiz precisa de `end` pra não ficar ativa em toda subrota. */
  end?: boolean
}

interface NavGroup {
  /** Título da seção na barra expandida; ausente no primeiro grupo. */
  title?: string
  items: NavItem[]
}

// "Escanear" não é uma aba própria — o botão vive no cabeçalho da aba
// Produtos (`ProductsPage.tsx`), mesmo padrão do catálogo pessoal.
const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'Início', Icon: HomeIcon, end: true },
      { to: '/produtos', label: 'Produtos', Icon: SpecimenIcon },
    ],
  },
  {
    title: 'Comercial',
    items: [
      { to: '/vendas', label: 'Vendas', Icon: PackageIcon },
      { to: '/clientes', label: 'Clientes', Icon: CardIcon },
      { to: '/fornecedores', label: 'Fornecedores', Icon: TruckIcon },
      { to: '/documentos', label: 'Documentos', Icon: DocumentIcon },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { to: '/caixa', label: 'Fluxo de caixa', Icon: CashIcon },
      { to: '/estatisticas', label: 'Estatísticas', Icon: ChartIcon },
      { to: '/precificacao', label: 'Precificação', Icon: CalculatorIcon },
      { to: '/empresa', label: 'Empresa', Icon: BuildingIcon },
    ],
  },
]
const TRASH_ITEM: NavItem = { to: '/lixeira', label: 'Lixeira', Icon: TrashIcon }

export const NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), TRASH_ITEM]

// Mesmas classes do `AppSidebar` do catálogo pessoal (item h-10, ícone 18px,
// acento `--color-nav-active`) — as duas barras precisam ficar idênticas.
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition ${
    isActive ? 'bg-stone-800 text-[var(--color-nav-active)]' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
  }`
const ICON_CLASS = 'h-[18px] w-[18px] shrink-0'
const railItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
    isActive ? 'bg-stone-800 text-[var(--color-nav-active)]' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
  }`

// Largura arrastável da sidebar fixa (desktop) — preferência do dispositivo,
// mesmos limites do catálogo pessoal.
const WIDTH_KEY = 'tt_loja_sidebar_width'
const MIN_WIDTH = 200
const MAX_WIDTH = 360
const DEFAULT_WIDTH = 224

/**
 * Navegação lateral: fixa no desktop (redimensionável e colapsável para só
 * ícones) e drawer sobreposto no celular. Mesmo papel e visual do `AppSidebar`
 * do catálogo pessoal, sem a árvore de categorias (a loja não tem categorias).
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
  const [width, setWidth] = useLocalNumber(WIDTH_KEY, DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const onResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startWidth: width }
  }
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    setWidth(dragRef.current.startWidth + (e.clientX - dragRef.current.startX))
  }
  const onResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const link = ({ to, label, Icon, end }: NavItem) => (
    <NavLink key={to} to={to} end={end} onClick={onClose} className={navLinkClass}>
      <Icon className={ICON_CLASS} />
      <span className="truncate">{label}</span>
    </NavLink>
  )

  const content = (
    <>
      <nav className="flex shrink-0 flex-col gap-0.5 px-3">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.title ?? i} className={i > 0 ? 'mt-3' : ''}>
            {group.title && (
              <span className="mb-1 block px-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{group.title}</span>
            )}
            <div className="flex flex-col gap-0.5">{group.items.map(link)}</div>
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t border-stone-800 px-3 pt-3">{link(TRASH_ITEM)}</div>
    </>
  )

  return (
    <>
      {/* Desktop: um único elemento cuja LARGURA anima entre os dois modos —
          mesmo mecanismo do catálogo pessoal. */}
      <aside
        className="relative hidden shrink-0 overflow-hidden border-r border-stone-800 bg-stone-950 transition-[width] duration-200 ease-out md:block"
        style={{ width: desktopOpen ? width : 56 }}
      >
        {desktopOpen ? (
          <>
            <div className="flex h-full flex-col overflow-y-auto py-3" style={{ width }}>
              {content}
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionar a barra lateral"
              onPointerDown={onResizeStart}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeEnd}
              className="absolute top-0 -right-1 h-full w-2 cursor-col-resize touch-none select-none"
            >
              <div className="mx-auto h-full w-px bg-transparent transition-colors hover:bg-amber-500/50 active:bg-amber-500" />
            </div>
          </>
        ) : (
          <div className="flex h-full w-14 flex-col items-center gap-1 overflow-y-auto py-3">
            {NAV_ITEMS.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end} title={label} aria-label={label} className={railItemClass}>
                <Icon className={ICON_CLASS} />
              </NavLink>
            ))}
          </div>
        )}
      </aside>

      {/* Celular: drawer sobreposto, com logo e botão de fechar no topo. */}
      {mobileOpen && (
        <div className="safe-top fixed inset-0 z-50 flex md:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-stone-800 bg-stone-950 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex shrink-0 items-center justify-between px-3">
              <Link to="/" onClick={onClose}>
                <AppLogo />
              </Link>
              <button type="button" onClick={onClose} aria-label="Fechar a navegação" className="tap-icon text-stone-400 hover:text-stone-200">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  )
}

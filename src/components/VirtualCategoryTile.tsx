import { Link } from 'react-router-dom'

// Cartão de uma categoria automática (Localização, Escala de Tempo Geológica,
// Espécie Mineral, Química) no topo da tela de Categorias. Arquivo
// COMPARTILHADO entre o catálogo e a loja (scripts/shared-ui.mjs): sem idioma e
// sem domínio — título, subtítulo, imagem e rota entram por props.

export function VirtualCategoryTile({ to, image, title, subtitle }: { to: string; image: string; title: string; subtitle: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl bg-stone-900 p-3 transition hover:bg-stone-800">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-800 p-1.5">
        <img src={image} alt="" className="h-full w-full object-contain" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-bold text-stone-100">{title}</span>
        <span className="text-xs text-stone-500">{subtitle}</span>
      </span>
    </Link>
  )
}

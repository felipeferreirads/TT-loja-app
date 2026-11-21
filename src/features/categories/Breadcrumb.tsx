import { Link } from 'react-router-dom'

/** Trilha "Categorias / … / atual" das páginas de categoria (mesmo visual do catálogo). */
export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <p className="text-sm text-stone-500">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && ' / '}
          {item.to ? (
            <Link to={item.to} className="link">
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </span>
      ))}
    </p>
  )
}

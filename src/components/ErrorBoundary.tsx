import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Proteção contra erro de renderização — cópia do `ErrorBoundary.tsx` do
 * catálogo pessoal, com textos fixos em PT. Sem ela, uma exceção em qualquer
 * componente desmontava o React inteiro e a tela ficava preta até recarregar.
 * `RouteErrorBoundary` (Layout.tsx, em volta do `<Outlet />`) mantém cabeçalho
 * e barra lateral de pé e se desfaz ao trocar de tela.
 */
interface Props {
  children: ReactNode
  /** Mudou → limpa o erro e tenta renderizar de novo. */
  resetKey?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    const error = this.state.error
    // Arquivo de código que sumiu depois de uma atualização do app — recarregar resolve.
    const outdated = /dynamically imported module|Failed to fetch dynamically|Importing a module script failed|ChunkLoadError/i.test(
      error.message,
    )
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <p className="text-base font-medium text-stone-100">Não foi possível exibir esta tela.</p>
        <p className="max-w-md text-sm text-stone-400">
          {outdated
            ? 'O aplicativo foi atualizado. Recarregue a página para continuar.'
            : 'Ocorreu um erro inesperado. Volte à tela anterior ou recarregue a página.'}
        </p>
        <p className="max-w-md font-mono text-xs break-words text-stone-600">{error.message}</p>
        <div className="mt-1 flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => window.history.back()}>
            Voltar
          </button>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      </div>
    )
  }
}

/** Versão para o conteúdo das páginas: se desfaz ao trocar de tela. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
}

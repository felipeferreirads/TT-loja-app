import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import './index.css'

// Catálogos de referência (minerais, subdivisões) e geocode são dados
// compartilhados e praticamente imutáveis dentro de uma sessão — cache longo.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

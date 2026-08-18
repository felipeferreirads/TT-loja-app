import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider'
import { RequireAuth } from './features/auth/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { DialogProvider } from './components/DialogProvider'
import { Layout } from './components/Layout'
import { ProductsPage } from './features/products/ProductsPage'
import { ProductPage } from './features/products/ProductPage'
import { CustomersPage } from './features/customers/CustomersPage'
import { SalesPage } from './features/sales/SalesPage'
import { PricingPage } from './features/pricing/PricingPage'
import { CompanyPage } from './features/company/CompanyPage'
import { DocumentsPage } from './features/documents/DocumentsPage'
import { DocumentPage } from './features/documents/DocumentPage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DialogProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/produtos" replace />} />
                <Route path="/produtos" element={<ProductsPage />} />
                <Route path="/produtos/:id" element={<ProductPage />} />
                <Route path="/clientes" element={<CustomersPage />} />
                <Route path="/vendas" element={<SalesPage />} />
                <Route path="/documentos" element={<DocumentsPage />} />
                <Route path="/documentos/:id" element={<DocumentPage />} />
                <Route path="/precificacao" element={<PricingPage />} />
                <Route path="/empresa" element={<CompanyPage />} />
              </Route>
            </Route>
          </Routes>
        </DialogProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

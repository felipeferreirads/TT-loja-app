import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider'
import { RequireAuth } from './features/auth/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { DialogProvider } from './components/DialogProvider'
import { ToastProvider } from './components/ToastProvider'
import { Layout } from './components/Layout'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProductsPage } from './features/products/ProductsPage'
import { ProductPage } from './features/products/ProductPage'
import { ScanPage } from './features/products/ScanPage'
import { CustomersPage } from './features/customers/CustomersPage'
import { CustomerPage } from './features/customers/CustomerPage'
import { SalesPage } from './features/sales/SalesPage'
import { PricingPage } from './features/pricing/PricingPage'
import { CompanyPage } from './features/company/CompanyPage'
import { DocumentsPage } from './features/documents/DocumentsPage'
import { DocumentPage } from './features/documents/DocumentPage'
import { SuppliersPage } from './features/suppliers/SuppliersPage'
import { CashPage } from './features/cash/CashPage'
import { StatsPage } from './features/stats/StatsPage'
import { TrashPage } from './features/trash/TrashPage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <DialogProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/produtos" element={<ProductsPage />} />
                  <Route path="/produtos/:id" element={<ProductPage />} />
                  <Route path="/escanear" element={<ScanPage />} />
                  <Route path="/clientes" element={<CustomersPage />} />
                  <Route path="/clientes/:id" element={<CustomerPage />} />
                  <Route path="/vendas" element={<SalesPage />} />
                  <Route path="/fornecedores" element={<SuppliersPage />} />
                  <Route path="/documentos" element={<DocumentsPage />} />
                  <Route path="/documentos/:id" element={<DocumentPage />} />
                  <Route path="/caixa" element={<CashPage />} />
                  <Route path="/estatisticas" element={<StatsPage />} />
                  <Route path="/precificacao" element={<PricingPage />} />
                  <Route path="/empresa" element={<CompanyPage />} />
                  <Route path="/lixeira" element={<TrashPage />} />
                </Route>
              </Route>
            </Routes>
          </DialogProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

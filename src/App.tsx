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
import { DocumentsListPage } from './features/documents/DocumentsListPage'
import { DocumentDetailPage } from './features/documents/DocumentDetailPage'
import { DocumentFormPage } from './features/documents/DocumentFormPage'
import { SuppliersPage } from './features/suppliers/SuppliersPage'
import { CashPage } from './features/cash/CashPage'
import { StatsPage } from './features/stats/StatsPage'
import { TrashPage } from './features/trash/TrashPage'
import { CategoriesPage } from './features/categories/CategoriesPage'
import { CategoryDetailPage } from './features/categories/CategoryDetailPage'
import { GeoCategoryPage } from './features/categories/GeoCategoryPage'
import { GeologicalTimeCategoryPage } from './features/categories/GeologicalTimeCategoryPage'
import { MineralSpeciesCategoryPage } from './features/categories/MineralSpeciesCategoryPage'
import { ChemistryCategoryPage } from './features/categories/ChemistryCategoryPage'
import { SettingsPage } from './features/settings/SettingsPage'

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
                  <Route path="/categorias" element={<CategoriesPage />} />
                  <Route path="/categorias/localizacao" element={<GeoCategoryPage />} />
                  <Route path="/categorias/localizacao/:continent" element={<GeoCategoryPage />} />
                  <Route path="/categorias/localizacao/:continent/:country" element={<GeoCategoryPage />} />
                  <Route path="/categorias/tempo-geologico" element={<GeologicalTimeCategoryPage />} />
                  <Route path="/categorias/tempo-geologico/:nodeId" element={<GeologicalTimeCategoryPage />} />
                  <Route path="/categorias/especie-mineral" element={<MineralSpeciesCategoryPage />} />
                  <Route path="/categorias/especie-mineral/:key" element={<MineralSpeciesCategoryPage />} />
                  <Route path="/categorias/quimica" element={<ChemistryCategoryPage />} />
                  <Route path="/categorias/quimica/:symbol" element={<ChemistryCategoryPage />} />
                  <Route path="/categorias/:id" element={<CategoryDetailPage />} />
                  <Route path="/clientes" element={<CustomersPage />} />
                  <Route path="/clientes/:id" element={<CustomerPage />} />
                  <Route path="/vendas" element={<SalesPage />} />
                  <Route path="/fornecedores" element={<SuppliersPage />} />
                  <Route path="/documentos" element={<DocumentsListPage />} />
                  <Route path="/documentos/novo" element={<DocumentFormPage />} />
                  <Route path="/documentos/:id" element={<DocumentDetailPage />} />
                  <Route path="/documentos/:id/editar" element={<DocumentFormPage />} />
                  <Route path="/caixa" element={<CashPage />} />
                  <Route path="/estatisticas" element={<StatsPage />} />
                  <Route path="/precificacao" element={<PricingPage />} />
                  <Route path="/empresa" element={<CompanyPage />} />
                  <Route path="/lixeira" element={<TrashPage />} />
                  <Route path="/configuracoes" element={<SettingsPage />} />
                </Route>
              </Route>
            </Routes>
          </DialogProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider'
import { RequireAuth } from './features/auth/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { DialogProvider } from './components/DialogProvider'
import { HomePage } from './pages/HomePage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DialogProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<HomePage />} />
            </Route>
          </Routes>
        </DialogProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

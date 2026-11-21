import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { AppLockGate } from '../../components/PinLockScreen'
import { AppLogo } from '../../components/AppLogo'
import { APP_LOCK_SCREEN_LABELS, appLock } from '../settings/appLock'

export function RequireAuth() {
  const { session, loading, signOut } = useAuth()

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-stone-400">Carregando…</div>
  }
  if (!session) return <Navigate to="/login" replace />
  // Trava de abertura por PIN (opcional, por dispositivo): cobre só as rotas autenticadas.
  return (
    <AppLockGate lock={appLock} labels={APP_LOCK_SCREEN_LABELS} logo={<AppLogo />} signOut={signOut}>
      <Outlet />
    </AppLockGate>
  )
}

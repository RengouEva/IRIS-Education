import { Navigate, useLocation } from 'react-router'
import { useStore } from '@/lib/store'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useStore()
  const location = useLocation()

  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

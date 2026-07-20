import { Navigate } from "react-router-dom"
import { useAuth } from "@/lib/AuthContext"
import ErrorBoundary from "./ErrorBoundary"

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth()

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-white dark:bg-base-900 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <ErrorBoundary>{children}</ErrorBoundary>
}

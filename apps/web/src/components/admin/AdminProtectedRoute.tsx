import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/TenantContext";
import { isDemoMode } from "@/lib/demo";
import { ReactNode } from "react";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { isLoading, isAuthenticated, isOwnerOrAdmin } = useAuth();

  // SECURITY: Demo mode bypasses ALL authentication AND admin role checks,
  // granting full admin access. Ensure isDemoMode() cannot return true in production.
  if (isDemoMode()) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!isOwnerOrAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

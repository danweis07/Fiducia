import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/TenantContext";
import { isDemoMode } from "@/lib/demo";
import { Spinner } from "@/components/common/Spinner";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useAuth();

  // SECURITY: Demo mode bypasses ALL authentication. Ensure isDemoMode() cannot
  // return true in production builds (controlled by VITE_DEMO_MODE / ?demo=true).
  if (isDemoMode()) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

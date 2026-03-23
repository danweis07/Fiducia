import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/TenantContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PageErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import { SkipLink } from "./components/common/SkipLink";
import { LanguageMismatchBanner } from "./components/common/LanguageMismatchBanner";
import { Spinner } from "./components/common/Spinner";

// Initialize i18n (side-effect import)
import "./lib/i18n";

// Route groups
import { publicRoutes } from "./routes/publicRoutes";
import { bankingRoutes } from "./routes/bankingRoutes";
import { adminRoutes } from "./routes/adminRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Spinner />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <BrowserRouter>
            <SkipLink />
            <LanguageMismatchBanner />
            <PageErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes — no auth required */}
                  {publicRoutes()}

                  {/* Protected banking routes — persistent AppShell layout */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppShell />
                      </ProtectedRoute>
                    }
                  >
                    {bankingRoutes()}
                  </Route>

                  {/* Admin routes — AdminShell layout */}
                  {adminRoutes()}
                </Routes>
              </Suspense>
            </PageErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

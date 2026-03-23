/**
 * Admin Routes
 *
 * All routes require admin/owner role and are wrapped in AdminShell layout.
 */

import { lazy } from "react";
import { Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";

const AdminShell = lazy(() => import("@/components/admin/AdminShell"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("@/pages/admin/UserManagement"));
const AccountOverview = lazy(() => import("@/pages/admin/AccountOverview"));
const IntegrationManager = lazy(() => import("@/pages/admin/IntegrationManager"));
const BrandingEditor = lazy(() => import("@/pages/admin/BrandingEditor"));
const ComplianceCenter = lazy(() => import("@/pages/admin/ComplianceCenter"));
const AnalyticsDashboard = lazy(() => import("@/pages/admin/AnalyticsDashboard"));
const AuditLog = lazy(() => import("@/pages/admin/AuditLog"));
const TenantSettings = lazy(() => import("@/pages/admin/TenantSettings"));
const ContentManager = lazy(() => import("@/pages/admin/ContentManager"));
const ApiTokens = lazy(() => import("@/pages/admin/ApiTokens"));
const Experiments = lazy(() => import("@/pages/admin/Experiments"));
const ScreenManifests = lazy(() => import("@/pages/admin/ScreenManifests"));
const SSOConfiguration = lazy(() => import("@/pages/admin/SSOConfiguration"));
const AIAssistant = lazy(() => import("@/pages/admin/AIAssistant"));
const KnowledgeBase = lazy(() => import("@/pages/admin/KnowledgeBase"));
const DataExport = lazy(() => import("@/pages/admin/DataExport"));
const TenantOnboarding = lazy(() => import("@/pages/admin/TenantOnboarding"));
const CDPManager = lazy(() => import("@/pages/admin/CDPManager"));
const AgentPolicies = lazy(() => import("@/pages/admin/AgentPolicies"));
const IncidentManager = lazy(() => import("@/pages/admin/IncidentManager"));
const ControlTower = lazy(() => import("@/pages/admin/ControlTower"));
const ChangeTracker = lazy(() => import("@/pages/admin/ChangeTracker"));

export function adminRoutes() {
  return (
    <Route
      path="/admin"
      element={
        <AdminProtectedRoute>
          <ErrorBoundary>
            <AdminShell />
          </ErrorBoundary>
        </AdminProtectedRoute>
      }
    >
      <Route
        index
        element={
          <ErrorBoundary>
            <AdminDashboard />
          </ErrorBoundary>
        }
      />
      <Route
        path="users"
        element={
          <ErrorBoundary>
            <UserManagement />
          </ErrorBoundary>
        }
      />
      <Route
        path="accounts"
        element={
          <ErrorBoundary>
            <AccountOverview />
          </ErrorBoundary>
        }
      />
      <Route
        path="integrations"
        element={
          <ErrorBoundary>
            <IntegrationManager />
          </ErrorBoundary>
        }
      />
      <Route
        path="branding"
        element={
          <ErrorBoundary>
            <BrandingEditor />
          </ErrorBoundary>
        }
      />
      <Route
        path="compliance"
        element={
          <ErrorBoundary>
            <ComplianceCenter />
          </ErrorBoundary>
        }
      />
      <Route
        path="analytics"
        element={
          <ErrorBoundary>
            <AnalyticsDashboard />
          </ErrorBoundary>
        }
      />
      <Route
        path="audit"
        element={
          <ErrorBoundary>
            <AuditLog />
          </ErrorBoundary>
        }
      />
      <Route
        path="settings"
        element={
          <ErrorBoundary>
            <TenantSettings />
          </ErrorBoundary>
        }
      />
      <Route
        path="content"
        element={
          <ErrorBoundary>
            <ContentManager />
          </ErrorBoundary>
        }
      />
      <Route
        path="api-tokens"
        element={
          <ErrorBoundary>
            <ApiTokens />
          </ErrorBoundary>
        }
      />
      <Route
        path="experiments"
        element={
          <ErrorBoundary>
            <Experiments />
          </ErrorBoundary>
        }
      />
      <Route
        path="sso"
        element={
          <ErrorBoundary>
            <SSOConfiguration />
          </ErrorBoundary>
        }
      />
      <Route
        path="ai-assistant"
        element={
          <ErrorBoundary>
            <AIAssistant />
          </ErrorBoundary>
        }
      />
      <Route
        path="knowledge-base"
        element={
          <ErrorBoundary>
            <KnowledgeBase />
          </ErrorBoundary>
        }
      />
      <Route
        path="data-export"
        element={
          <ErrorBoundary>
            <DataExport />
          </ErrorBoundary>
        }
      />
      <Route
        path="onboarding"
        element={
          <ErrorBoundary>
            <TenantOnboarding />
          </ErrorBoundary>
        }
      />
      <Route
        path="agent-policies"
        element={
          <ErrorBoundary>
            <AgentPolicies />
          </ErrorBoundary>
        }
      />
      <Route
        path="screen-manifests"
        element={
          <ErrorBoundary>
            <ScreenManifests />
          </ErrorBoundary>
        }
      />
      <Route
        path="cdp"
        element={
          <ErrorBoundary>
            <CDPManager />
          </ErrorBoundary>
        }
      />
      <Route
        path="incidents"
        element={
          <ErrorBoundary>
            <IncidentManager />
          </ErrorBoundary>
        }
      />
      <Route
        path="control-tower"
        element={
          <ErrorBoundary>
            <ControlTower />
          </ErrorBoundary>
        }
      />
      <Route
        path="changes"
        element={
          <ErrorBoundary>
            <ChangeTracker />
          </ErrorBoundary>
        }
      />
    </Route>
  );
}

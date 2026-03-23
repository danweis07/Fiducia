/**
 * FeatureGate — Conditionally renders children based on tenant features/region.
 *
 * Usage:
 *   <FeatureGate feature="wires">
 *     <WireTransferPage />
 *   </FeatureGate>
 *
 *   <FeatureGate region={['eu', 'uk']}>
 *     <SCAWidget />
 *   </FeatureGate>
 *
 *   <FeatureGate feature="p2p" fallback={<UpgradeBanner />}>
 *     <P2PTransfers />
 *   </FeatureGate>
 */

import { type ReactNode } from "react";
import { useAuth } from "@/contexts/TenantContext";
import type { TenantFeatures, TenantRegion } from "@/types/tenant";

interface FeatureGateProps {
  /** Single feature key or array — ALL must be enabled */
  feature?: keyof TenantFeatures | (keyof TenantFeatures)[];
  /** Single region or array — tenant region must be one of these */
  region?: TenantRegion | TenantRegion[];
  /** Rendered when gated out */
  fallback?: ReactNode;
  children: ReactNode;
}

export function FeatureGate({ feature, region, fallback = null, children }: FeatureGateProps) {
  const { tenant } = useAuth();

  // If no tenant context yet, don't render gated content
  if (!tenant) return <>{fallback}</>;

  // Check feature flags
  if (feature) {
    const features = Array.isArray(feature) ? feature : [feature];
    const allEnabled = features.every((f) => tenant.features[f]);
    if (!allEnabled) return <>{fallback}</>;
  }

  // Check region
  if (region) {
    const regions = Array.isArray(region) ? region : [region];
    if (!regions.includes(tenant.region)) return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook version for imperative checks.
 */
export function useFeatureEnabled(feature: keyof TenantFeatures): boolean {
  const { tenant } = useAuth();
  return !!tenant?.features[feature];
}

export function useRegion(): TenantRegion | undefined {
  const { tenant } = useAuth();
  return tenant?.region;
}

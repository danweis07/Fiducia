/**
 * useSiteConfig — Frontend hook for tenant configuration
 *
 * Merges static defaults from tenant.config.ts with any database overrides
 * fetched via the config.theme gateway action. Components should use this
 * hook instead of hardcoding institution-specific content.
 *
 * Usage:
 *   const { config } = useSiteConfig();
 *   <h1>{config.name}</h1>
 *   <a href={`tel:${config.phone}`}>{config.phoneFormatted}</a>
 */

import { useQuery } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { tenantConfig, type TenantConfig } from "@/lib/tenant.config";

interface ThemeResponse {
  theme?: {
    tenantName?: string;
    logoUrl?: string | null;
    primaryColor?: string;
    accentColor?: string;
    faviconUrl?: string | null;
    [key: string]: unknown;
  };
}

export function useSiteConfig(): { config: TenantConfig; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["site-config"],
    queryFn: () => gateway.request<ThemeResponse>("config.theme"),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  const config: TenantConfig = {
    ...tenantConfig,
    ...(data?.theme?.tenantName && { name: data.theme.tenantName }),
    ...(data?.theme?.logoUrl !== undefined && { logoUrl: data.theme.logoUrl }),
    ...(data?.theme?.primaryColor && { primaryColor: data.theme.primaryColor }),
    ...(data?.theme?.accentColor && { accentColor: data.theme.accentColor }),
    ...(data?.theme?.faviconUrl !== undefined && { faviconUrl: data.theme.faviconUrl }),
  };

  return { config, isLoading };
}

/**
 * Static access to tenant config (no database merge).
 * Use in non-React contexts like structured data, meta tags, etc.
 */
export function getSiteConfig(): TenantConfig {
  return tenantConfig;
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { WatchlistSource, MonitoringStatus } from "@/types";

export const amlKeys = {
  screening: (id: string | undefined) => ["aml-screening", id] as const,
  monitoring: (params?: Record<string, unknown>) => ["aml-monitoring", params] as const,
  alerts: (params?: Record<string, unknown>) => ["aml-alerts", params] as const,
};

// =============================================================================
// AML SCREENING
// =============================================================================

export function useAMLScreen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      subject: {
        customerId: string;
        firstName: string;
        middleName?: string;
        lastName: string;
        dateOfBirth?: string;
        nationality?: string;
        countryOfResidence?: string;
        entityType: "individual" | "organization";
        organizationName?: string;
        idNumber?: string;
        idType?: "passport" | "national_id" | "drivers_license" | "ssn" | "ein";
      };
      watchlists?: WatchlistSource[];
      matchThreshold?: number;
      enableMonitoring?: boolean;
      monitoringIntervalHours?: number;
    }) => gateway.aml.screen(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: amlKeys.monitoring() });
      qc.invalidateQueries({ queryKey: amlKeys.alerts() });
    },
  });
}

export function useAMLScreening(screeningId: string | undefined) {
  return useQuery({
    queryKey: amlKeys.screening(screeningId),
    queryFn: () => gateway.aml.getScreening(screeningId!),
    enabled: !!screeningId,
  });
}

// =============================================================================
// MONITORING
// =============================================================================

export function useAMLMonitoring(params: { customerId?: string; status?: MonitoringStatus } = {}) {
  return useQuery({
    queryKey: amlKeys.monitoring(params),
    queryFn: () => gateway.aml.monitoring.list(params),
  });
}

export function useUpdateAMLMonitoring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      subscriptionId: string;
      status?: MonitoringStatus;
      watchlists?: WatchlistSource[];
      refreshIntervalHours?: number;
    }) => gateway.aml.monitoring.update(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: amlKeys.monitoring() });
    },
  });
}

// =============================================================================
// ALERTS
// =============================================================================

export function useAMLAlerts(
  params: {
    customerId?: string;
    subscriptionId?: string;
    unreviewedOnly?: boolean;
  } = {},
) {
  return useQuery({
    queryKey: amlKeys.alerts(params),
    queryFn: () => gateway.aml.alerts.list(params),
  });
}

export function useReviewAMLAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { alertId: string; confirmedMatch: boolean; notes: string }) =>
      gateway.aml.alerts.review(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: amlKeys.alerts() });
    },
  });
}

// =============================================================================
// KYC REFRESH (Perpetual KYC)
// =============================================================================

export function useKYCRefresh() {
  return useMutation({
    mutationFn: (params: {
      token: string;
      intervalHours?: number;
      triggers?: Array<"scheduled" | "event_driven" | "risk_based" | "manual">;
      riskThreshold?: number;
      autoDenyOnHighRisk?: boolean;
    }) => gateway.kyc.refresh(params),
  });
}

export function useConfigureKYCRefresh() {
  return useMutation({
    mutationFn: (params: {
      token: string;
      intervalHours?: number;
      triggers?: Array<"scheduled" | "event_driven" | "risk_based" | "manual">;
      riskThreshold?: number;
      autoDenyOnHighRisk?: boolean;
    }) => gateway.kyc.configureRefresh(params),
  });
}

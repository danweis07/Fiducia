import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const adminCDPKeys = {
  all: ["admin-cdp"] as const,
  config: () => ["admin-cdp", "config"] as const,
  destinations: () => ["admin-cdp", "destinations"] as const,
  events: (params?: Record<string, unknown>) => ["admin-cdp", "events", params] as const,
  summary: (range?: string) => ["admin-cdp", "summary", range] as const,
};

export function useCDPConfig() {
  return useQuery({
    queryKey: adminCDPKeys.config(),
    queryFn: () => gateway.adminCDP.getConfig(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateCDPConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      enabled?: boolean;
      writeKey?: string;
      dataPlaneUrl?: string;
      consentCategories?: string[];
      eventSchemas?: Array<{ event: string; category: string; description: string }>;
    }) => gateway.adminCDP.updateConfig(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCDPKeys.config() });
    },
  });
}

export function useCDPDestinations() {
  return useQuery({
    queryKey: adminCDPKeys.destinations(),
    queryFn: () => gateway.adminCDP.listDestinations(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateCDPDestination() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      type: string;
      category: string;
      config?: Record<string, unknown>;
      eventFilter?: string[];
      consentRequired?: string[];
    }) => gateway.adminCDP.createDestination(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCDPKeys.destinations() });
    },
  });
}

export function useUpdateCDPDestination() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      name?: string;
      enabled?: boolean;
      config?: Record<string, unknown>;
      eventFilter?: string[];
      consentRequired?: string[];
    }) => gateway.adminCDP.updateDestination(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCDPKeys.destinations() });
    },
  });
}

export function useDeleteCDPDestination() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gateway.adminCDP.deleteDestination(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCDPKeys.destinations() });
    },
  });
}

export function useCDPRecentEvents(
  params: { limit?: number; eventName?: string; category?: string } = {},
) {
  return useQuery({
    queryKey: adminCDPKeys.events(params),
    queryFn: () => gateway.adminCDP.listRecentEvents(params),
    staleTime: 1000 * 30, // 30s — events update frequently
  });
}

export function useCDPEventSummary(range?: string) {
  return useQuery({
    queryKey: adminCDPKeys.summary(range),
    queryFn: () => gateway.adminCDP.getEventSummary(range),
    staleTime: 1000 * 60,
  });
}

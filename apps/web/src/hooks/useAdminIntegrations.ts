import { useQuery } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const adminIntegrationKeys = {
  all: ["admin-integrations"] as const,
  list: () => ["admin-integrations", "list"] as const,
};

export function useAdminIntegrations() {
  return useQuery({
    queryKey: adminIntegrationKeys.list(),
    queryFn: () => gateway.adminIntegrations.list(),
    staleTime: 1000 * 60 * 2,
  });
}

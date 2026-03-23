import { useQuery } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const chargeKeys = {
  all: ["charges"] as const,
  definitions: (params: { appliesTo?: string }) => ["charges", "definitions", params] as const,
  list: (params: { accountId?: string; status?: string }) => ["charges", "list", params] as const,
};

export function useChargeDefinitions(params: { appliesTo?: string } = {}) {
  return useQuery({
    queryKey: chargeKeys.definitions(params),
    queryFn: () => gateway.charges.definitions(params),
    staleTime: 1000 * 60 * 10,
  });
}

export function useCharges(
  params: { accountId?: string; status?: string; limit?: number; offset?: number } = {},
) {
  return useQuery({
    queryKey: chargeKeys.list(params),
    queryFn: () => gateway.charges.list(params),
    staleTime: 1000 * 60 * 2,
    enabled: !!params.accountId,
  });
}

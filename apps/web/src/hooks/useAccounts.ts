import { useQuery } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const accountKeys = {
  all: ["accounts"] as const,
  detail: (id: string) => ["accounts", id] as const,
  summary: () => ["accounts", "summary"] as const,
};

export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: () => gateway.accounts.list(),
    staleTime: 1000 * 60 * 2, // 2 min
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: () => gateway.accounts.get(id),
    enabled: !!id,
  });
}

export function useAccountSummary() {
  return useQuery({
    queryKey: accountKeys.summary(),
    queryFn: () => gateway.accounts.summary(),
    staleTime: 1000 * 60 * 2,
  });
}

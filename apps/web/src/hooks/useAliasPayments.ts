import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const aliasKeys = {
  all: ["alias"] as const,
  directories: () => ["alias", "directories"] as const,
  r2p: () => ["alias", "r2p"] as const,
  r2pInbound: (params?: Record<string, unknown>) => ["alias", "r2p", "inbound", params] as const,
  r2pOutbound: (params?: Record<string, unknown>) => ["alias", "r2p", "outbound", params] as const,
};

export function useAliasDirectories() {
  return useQuery({
    queryKey: aliasKeys.directories(),
    queryFn: () => gateway.alias.getDirectories(),
  });
}

export function useResolveAlias() {
  return useMutation({
    mutationFn: (params: { aliasType: string; aliasValue: string; region?: string }) =>
      gateway.alias.resolve(params),
  });
}

export function usePayByAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.alias.pay>[0]) => gateway.alias.pay(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aliasKeys.all });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useInboundR2P(params: { status?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: aliasKeys.r2pInbound(params),
    queryFn: () => gateway.alias.listInboundR2P(params),
  });
}

export function useRespondToR2P() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.alias.respondToR2P>[0]) =>
      gateway.alias.respondToR2P(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aliasKeys.r2p() });
    },
  });
}

export function useOutboundR2P(params: { status?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: aliasKeys.r2pOutbound(params),
    queryFn: () => gateway.alias.listOutboundR2P(params),
  });
}

export function useSendR2P() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.alias.sendR2P>[0]) =>
      gateway.alias.sendR2P(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aliasKeys.r2pOutbound() });
    },
  });
}

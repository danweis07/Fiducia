import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { MemberAddress } from "@/types";

export const memberKeys = {
  all: ["member"] as const,
  addresses: () => ["member", "addresses"] as const,
  documents: () => ["member", "documents"] as const,
  identifiers: () => ["member", "identifiers"] as const,
};

export function useMemberAddresses() {
  return useQuery({
    queryKey: memberKeys.addresses(),
    queryFn: () => gateway.member.addresses(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateMemberAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: { id: string } & Partial<
      Pick<
        MemberAddress,
        "type" | "isPrimary" | "line1" | "line2" | "city" | "state" | "zip" | "country"
      >
    >) => gateway.member.updateAddress(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.addresses() });
    },
  });
}

export function useMemberDocuments() {
  return useQuery({
    queryKey: memberKeys.documents(),
    queryFn: () => gateway.member.documents(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMemberIdentifiers() {
  return useQuery({
    queryKey: memberKeys.identifiers(),
    queryFn: () => gateway.member.identifiers(),
    staleTime: 1000 * 60 * 5,
  });
}

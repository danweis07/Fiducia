import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { BankingUser } from "@/types";

export const profileKeys = {
  all: ["profile"] as const,
  current: () => ["profile", "current"] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.current(),
    queryFn: () => gateway.auth.profile(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      updates: Partial<
        Pick<BankingUser, "firstName" | "lastName" | "phone" | "preferredLanguage" | "timezone">
      >,
    ) => gateway.auth.updateProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

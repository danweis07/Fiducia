import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const cardKeys = {
  all: ["cards"] as const,
};

export function useCards() {
  return useQuery({
    queryKey: cardKeys.all,
    queryFn: () => gateway.cards.list(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useLockCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => gateway.cards.lock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}

export function useUnlockCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => gateway.cards.unlock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}

export function useSetCardLimit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dailyLimitCents }: { id: string; dailyLimitCents: number }) =>
      gateway.cards.setLimit(id, dailyLimitCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}

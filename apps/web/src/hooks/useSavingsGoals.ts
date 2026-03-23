import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { accountKeys } from "@/hooks/useAccounts";

export const goalKeys = {
  all: ["goals"] as const,
  list: () => ["goals", "list"] as const,
  detail: (id: string) => ["goals", id] as const,
  summary: () => ["goals", "summary"] as const,
};

export function useSavingsGoals() {
  return useQuery({
    queryKey: goalKeys.list(),
    queryFn: () => gateway.goals.list(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useSavingsGoal(id: string) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: () => gateway.goals.get(id),
    enabled: !!id,
  });
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      name: string;
      targetAmountCents: number;
      accountId: string;
      targetDate?: string;
      iconEmoji?: string;
      autoContribute?: boolean;
      autoContributeAmountCents?: number;
      autoContributeFrequency?: "weekly" | "biweekly" | "monthly";
    }) => gateway.goals.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      targetAmountCents?: number;
      targetDate?: string;
      iconEmoji?: string;
      autoContribute?: boolean;
      autoContributeAmountCents?: number;
      autoContributeFrequency?: string;
      status?: string;
    }) => gateway.goals.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => gateway.goals.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useContributeToGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { goalId: string; amountCents: number; fromAccountId?: string }) =>
      gateway.goals.contribute(params.goalId, params.amountCents, params.fromAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useWithdrawFromGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { goalId: string; amountCents: number }) =>
      gateway.goals.withdraw(params.goalId, params.amountCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useGoalSummary() {
  return useQuery({
    queryKey: goalKeys.summary(),
    queryFn: () => gateway.goals.summary(),
    staleTime: 1000 * 60 * 2,
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { StandingInstructionTransferType, StandingInstructionFrequency } from "@/types";

export const standingInstructionKeys = {
  all: ["standingInstructions"] as const,
  list: (params: { status?: string }) => ["standingInstructions", "list", params] as const,
};

export function useStandingInstructions(params: { status?: string } = {}) {
  return useQuery({
    queryKey: standingInstructionKeys.list(params),
    queryFn: () => gateway.standingInstructions.list(params),
    staleTime: 1000 * 60 * 2,
  });
}

export interface CreateStandingInstructionInput {
  fromAccountId: string;
  toAccountId?: string;
  toBeneficiaryId?: string;
  toLoanId?: string;
  transferType: StandingInstructionTransferType;
  amountCents: number;
  name: string;
  frequency: StandingInstructionFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  startDate: string;
}

export function useCreateStandingInstruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateStandingInstructionInput) =>
      gateway.standingInstructions.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standingInstructionKeys.all });
    },
  });
}

export function useUpdateStandingInstruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: {
      id: string;
      amountCents?: number;
      name?: string;
      frequency?: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      endDate?: string;
      status?: string;
    }) => gateway.standingInstructions.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standingInstructionKeys.all });
    },
  });
}

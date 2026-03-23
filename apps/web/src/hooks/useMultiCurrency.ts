import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export function useCurrencyPots(status?: string) {
  return useQuery({
    queryKey: ["currencyPots", "list", status],
    queryFn: () => gateway.currencyPots.list({ status }),
  });
}

export function useCurrencyPot(potId: string) {
  return useQuery({
    queryKey: ["currencyPots", "get", potId],
    queryFn: () => gateway.currencyPots.get(potId),
    enabled: !!potId,
  });
}

export function useCreateCurrencyPot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.currencyPots.create>[0]) =>
      gateway.currencyPots.create(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currencyPots"] });
    },
  });
}

export function useCloseCurrencyPot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.currencyPots.close>[0]) =>
      gateway.currencyPots.close(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currencyPots"] });
    },
  });
}

export function useGenerateVIBAN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.currencyPots.generateVIBAN>[0]) =>
      gateway.currencyPots.generateVIBAN(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currencyPots"] });
    },
  });
}

export function useSwapQuote(fromPotId: string, toPotId: string, fromAmountCents: number) {
  return useQuery({
    queryKey: ["currencyPots", "swapQuote", fromPotId, toPotId, fromAmountCents],
    queryFn: () => gateway.currencyPots.getSwapQuote({ fromPotId, toPotId, fromAmountCents }),
    enabled: !!fromPotId && !!toPotId && fromAmountCents > 0,
    refetchInterval: 30000,
  });
}

export function useExecuteSwap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.currencyPots.executeSwap>[0]) =>
      gateway.currencyPots.executeSwap(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currencyPots"] });
    },
  });
}

export function useSwapHistory(potId?: string) {
  return useQuery({
    queryKey: ["currencyPots", "swaps", potId],
    queryFn: () => gateway.currencyPots.listSwaps({ potId }),
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import type { CardReplacementReason } from '@/types';

// =============================================================================
// TRAVEL NOTICES
// =============================================================================

export function useTravelNotices(filter?: 'active' | 'expired') {
  return useQuery({
    queryKey: ['travelNotices', filter],
    queryFn: () => gateway.travelNotices.list({ filter }),
  });
}

export function useCreateTravelNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      cardId: string;
      destinations: { country: string; region?: string }[];
      startDate: string;
      endDate: string;
      contactPhone?: string;
    }) => gateway.travelNotices.create(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['travelNotices'] });
    },
  });
}

export function useCancelTravelNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noticeId: string) => gateway.travelNotices.cancel(noticeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['travelNotices'] });
    },
  });
}

// =============================================================================
// CARD REPLACEMENT
// =============================================================================

export function useCardReplacements() {
  return useQuery({
    queryKey: ['cardReplacements'],
    queryFn: () => gateway.cardReplacements.list(),
  });
}

export function useRequestCardReplacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      cardId: string;
      reason: CardReplacementReason;
      shippingMethod: 'standard' | 'expedited';
      reportFraud?: boolean;
    }) => gateway.cardReplacements.request(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cardReplacements'] });
      qc.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}

export function useCardReplacementStatus(replacementId: string) {
  return useQuery({
    queryKey: ['cardReplacements', replacementId],
    queryFn: () => gateway.cardReplacements.status(replacementId),
    enabled: !!replacementId,
  });
}

export function useActivateReplacementCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ replacementId, lastFourDigits }: { replacementId: string; lastFourDigits: string }) =>
      gateway.cardReplacements.activate(replacementId, lastFourDigits),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cardReplacements'] });
      qc.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}

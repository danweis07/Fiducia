import { useQuery } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export function useSafeguarding(country?: string) {
  return useQuery({
    queryKey: ['regulatory', 'safeguarding', country],
    queryFn: () => gateway.regulatory.getSafeguarding({ country }),
  });
}

export function useInterestWithholding(params: { accountId?: string; year?: number; currency?: string } = {}) {
  return useQuery({
    queryKey: ['regulatory', 'withholding', params],
    queryFn: () => gateway.regulatory.listWithholding(params),
  });
}

export function useCarbonFootprint(transactionId: string) {
  return useQuery({
    queryKey: ['regulatory', 'carbon', 'transaction', transactionId],
    queryFn: () => gateway.regulatory.getCarbonFootprint(transactionId),
    enabled: !!transactionId,
  });
}

export function useCarbonSummary(periodStart: string, periodEnd: string) {
  return useQuery({
    queryKey: ['regulatory', 'carbon', 'summary', periodStart, periodEnd],
    queryFn: () => gateway.regulatory.getCarbonSummary({ periodStart, periodEnd }),
    enabled: !!periodStart && !!periodEnd,
  });
}

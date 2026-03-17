import { useQuery } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export const beneficiaryKeys = {
  all: ['beneficiaries'] as const,
  list: () => ['beneficiaries', 'list'] as const,
};

export function useBeneficiaries() {
  return useQuery({
    queryKey: beneficiaryKeys.list(),
    queryFn: () => gateway.beneficiaries.list(),
    staleTime: 1000 * 60 * 2,
  });
}

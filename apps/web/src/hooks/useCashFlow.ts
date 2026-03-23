import { useQuery } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export function useCashFlowForecast(accountId?: string, daysAhead?: number) {
  return useQuery({
    queryKey: ["cashflow", "forecast", accountId, daysAhead],
    queryFn: () => gateway.cashFlow.getForecast({ accountId, daysAhead }),
  });
}

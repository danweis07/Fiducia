import { useQuery } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const locationKeys = {
  all: ["locations"] as const,
  search: (params: { latitude: number; longitude: number; type?: string }) =>
    ["locations", "search", params] as const,
};

export function useLocationSearch(
  params: {
    latitude: number;
    longitude: number;
    radiusMiles?: number;
    type?: string;
  } | null,
) {
  return useQuery({
    queryKey: locationKeys.search(params ?? { latitude: 0, longitude: 0 }),
    queryFn: () => gateway.locations.search(params!),
    enabled: !!params,
    staleTime: 1000 * 60 * 5,
  });
}

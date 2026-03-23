/**
 * Check Ordering Hooks
 *
 * React Query hooks for check style browsing, order creation,
 * order history, and cancellation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { CheckOrderStatus } from "@/types";

// =============================================================================
// QUERY KEYS
// =============================================================================

export const checkOrderKeys = {
  all: ["check-orders"] as const,
  styles: (params?: Record<string, unknown>) => ["check-orders", "styles", params] as const,
  config: () => ["check-orders", "config"] as const,
  orders: (params?: Record<string, unknown>) => ["check-orders", "orders", params] as const,
  order: (id?: string) => ["check-orders", "order", id] as const,
};

// =============================================================================
// QUERIES
// =============================================================================

/** List available check styles/designs */
export function useCheckStyles(params: { category?: string } = {}) {
  return useQuery({
    queryKey: checkOrderKeys.styles(params as Record<string, unknown>),
    queryFn: () => gateway.checks.styles(params),
  });
}

/** Get check order configuration (quantities, shipping, pricing) */
export function useCheckOrderConfig() {
  return useQuery({
    queryKey: checkOrderKeys.config(),
    queryFn: () => gateway.checks.config(),
    staleTime: 1000 * 60 * 10, // Config rarely changes
  });
}

/** List past check orders with optional status filter */
export function useCheckOrders(
  params: { status?: CheckOrderStatus; limit?: number; offset?: number } = {},
) {
  return useQuery({
    queryKey: checkOrderKeys.orders(params as Record<string, unknown>),
    queryFn: () => gateway.checks.listOrders(params),
  });
}

/** Get a single check order by ID */
export function useCheckOrder(orderId?: string) {
  return useQuery({
    queryKey: checkOrderKeys.order(orderId),
    queryFn: () => gateway.checks.getOrder(orderId!),
    enabled: !!orderId,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/** Create a new check order */
export function useCreateCheckOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      accountId: string;
      styleId: string;
      quantity: number;
      startingCheckNumber?: string;
      shippingMethod: "standard" | "expedited" | "overnight";
      deliveryAddressId?: string;
    }) => gateway.checks.createOrder(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkOrderKeys.all });
    },
  });
}

/** Cancel a pending check order */
export function useCancelCheckOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => gateway.checks.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkOrderKeys.all });
    },
  });
}

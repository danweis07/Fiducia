/**
 * Gateway API Client — Barrel re-export
 *
 * This file re-exports from the modularized gateway/ directory
 * to maintain backward compatibility with existing imports:
 *   import { gateway } from '@/lib/gateway';
 */

export { gateway, GatewayApiError, graphql } from './gateway/index';
export type { Pagination, GraphQLResponse, CallGatewayFn, GatewayError } from './gateway/index';

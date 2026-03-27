/**
 * Demo Data Layer — Returns realistic mock data for all gateway actions.
 *
 * When demo mode is active, callGateway routes here instead of Supabase.
 * Every response shape matches the types the hooks/pages expect,
 * including _pagination metadata on list endpoints.
 *
 * Domain files are merged into a single handler map and exposed via
 * the getDemoResponse function.
 */

import { ActionHandler } from "./types";
import { accountHandlers } from "./accounts";
import { paymentHandlers } from "./payments";
import { cardHandlers } from "./cards";
import { loanHandlers } from "./loans";
import { depositHandlers } from "./deposits";
import { memberHandlers } from "./member";
import { adminHandlers } from "./admin";
import { financialHandlers } from "./financial";
import { complianceHandlers } from "./compliance";
import { contentHandlers } from "./content";
import { integrationHandlers } from "./integrations";
import { messagingHandlers } from "./messaging";
import { aiHandlers } from "./ai";
import { businessHandlers } from "./business";
import { internationalHandlers } from "./international";
import { incidentHandlers } from "./incidents";
import { migrationHandlers } from "./migration";
import { goliveHandlers } from "./golive";

// =============================================================================
// MERGED HANDLER MAP
// =============================================================================

const handlers: Record<string, ActionHandler> = {
  ...accountHandlers,
  ...paymentHandlers,
  ...cardHandlers,
  ...loanHandlers,
  ...depositHandlers,
  ...memberHandlers,
  ...adminHandlers,
  ...financialHandlers,
  ...complianceHandlers,
  ...contentHandlers,
  ...integrationHandlers,
  ...messagingHandlers,
  ...aiHandlers,
  ...businessHandlers,
  ...internationalHandlers,
  ...incidentHandlers,
  ...migrationHandlers,
  ...goliveHandlers,
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Resolve a gateway action to demo data.
 * Returns a response matching the shape the hooks expect.
 */
export function getDemoResponse(action: string, params: Record<string, unknown>): unknown {
  const handler = handlers[action];
  if (handler) {
    return handler(params);
  }
  // Fallback for any unmapped action — return empty success
  return {};
}

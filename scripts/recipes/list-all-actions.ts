#!/usr/bin/env npx tsx
/**
 * Recipe: List All Actions
 *
 * Prints every gateway action registered in the demo-data handler map.
 * Useful for discovering available actions when building new features.
 *
 * Run:  npx tsx scripts/recipes/list-all-actions.ts
 */

// Import each domain handler set to enumerate all registered actions
import { accountHandlers } from "../../apps/web/src/lib/demo-data/accounts";
import { paymentHandlers } from "../../apps/web/src/lib/demo-data/payments";
import { cardHandlers } from "../../apps/web/src/lib/demo-data/cards";
import { loanHandlers } from "../../apps/web/src/lib/demo-data/loans";
import { depositHandlers } from "../../apps/web/src/lib/demo-data/deposits";
import { memberHandlers } from "../../apps/web/src/lib/demo-data/member";
import { adminHandlers } from "../../apps/web/src/lib/demo-data/admin";
import { financialHandlers } from "../../apps/web/src/lib/demo-data/financial";
import { complianceHandlers } from "../../apps/web/src/lib/demo-data/compliance";
import { contentHandlers } from "../../apps/web/src/lib/demo-data/content";
import { integrationHandlers } from "../../apps/web/src/lib/demo-data/integrations";
import { messagingHandlers } from "../../apps/web/src/lib/demo-data/messaging";
import { aiHandlers } from "../../apps/web/src/lib/demo-data/ai";
import { businessHandlers } from "../../apps/web/src/lib/demo-data/business";
import { internationalHandlers } from "../../apps/web/src/lib/demo-data/international";
import { incidentHandlers } from "../../apps/web/src/lib/demo-data/incidents";

const domainMap: Record<string, Record<string, unknown>> = {
  accounts: accountHandlers,
  payments: paymentHandlers,
  cards: cardHandlers,
  loans: loanHandlers,
  deposits: depositHandlers,
  member: memberHandlers,
  admin: adminHandlers,
  financial: financialHandlers,
  compliance: complianceHandlers,
  content: contentHandlers,
  integrations: integrationHandlers,
  messaging: messagingHandlers,
  ai: aiHandlers,
  business: businessHandlers,
  international: internationalHandlers,
  incidents: incidentHandlers,
};

let total = 0;

for (const [domain, handlers] of Object.entries(domainMap)) {
  const actions = Object.keys(handlers);
  if (actions.length === 0) continue;

  console.log(`\n${domain} (${actions.length} actions)`);
  console.log("─".repeat(40));
  for (const action of actions.sort()) {
    console.log(`  ${action}`);
    total++;
  }
}

console.log(`\n${"═".repeat(40)}`);
console.log(`  Total: ${total} gateway actions available in demo mode`);
console.log("═".repeat(40));

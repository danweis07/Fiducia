#!/usr/bin/env npx tsx
/**
 * Recipe: Cards & Loans
 *
 * Shows card management (list, lock/unlock, limits) and loan data
 * (list, payment schedule, amortization).
 *
 * Run:  npx tsx scripts/recipes/cards-and-loans.ts
 */

import { call, show, heading } from "./helpers";

heading("Cards & Loans Recipe");

// ── Cards ──────────────────────────────────────────
const cards = call<{ cards: Array<{ id: string; type: string; status: string }> }>("cards.list");
show("cards.list — All cards", cards);

// Lock a card
const lockResult = call("cards.lock", { cardId: "card-demo-debit-001" });
show("cards.lock — Lock debit card", lockResult);

// Unlock it back
const unlockResult = call("cards.unlock", { cardId: "card-demo-debit-001" });
show("cards.unlock — Unlock debit card", unlockResult);

// ── Loans ──────────────────────────────────────────
const loans = call<{ loans: Array<{ id: string; type: string; outstandingBalanceCents: number }> }>(
  "loans.list",
);
show("loans.list — All loans", loans);

// Payment schedule
const schedule = call("loans.payment-schedule", { loanId: "loan-demo-auto-001" });
show("loans.payment-schedule — Upcoming payments", schedule);

// Loan products available
const products = call("loans.products");
show("loans.products — Available loan products", products);

console.log("\nDone! Card and loan data shapes are ready for your components.\n");

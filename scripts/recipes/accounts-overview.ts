#!/usr/bin/env npx tsx
/**
 * Recipe: Accounts Overview
 *
 * Demonstrates the core accounts domain — listing accounts, fetching a single
 * account, pulling transactions, and the account summary endpoint.
 *
 * Run:  npx tsx scripts/recipes/accounts-overview.ts
 */

import { call, show, heading } from "./helpers";

heading("Accounts Overview Recipe");

// 1. List all accounts for the demo user
const accounts = call<{
  accounts: Array<{ id: string; type: string; nickname: string; balanceCents: number }>;
}>("accounts.list");
show("accounts.list — All accounts", accounts);

// 2. Fetch a single account by ID
const firstId = accounts.accounts[0]?.id;
if (firstId) {
  const detail = call("accounts.get", { accountId: firstId });
  show(`accounts.get — Detail for ${firstId}`, detail);
}

// 3. Transactions for the checking account
const txns = call("accounts.transactions", { accountId: firstId, limit: 5 });
show("accounts.transactions — Recent transactions", txns);

// 4. Account summary (aggregated balances)
const summary = call("accounts.summary");
show("accounts.summary — Aggregated balances", summary);

console.log("\nDone! These are the exact shapes your hooks receive in demo mode.\n");

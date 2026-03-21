#!/usr/bin/env npx tsx
/**
 * Recipe: Payments & Transfers
 *
 * Exercises bill pay, wire transfers, P2P, and internal transfers.
 *
 * Run:  npx tsx scripts/recipes/payments-and-transfers.ts
 */

import { call, show, heading } from "./helpers";

heading("Payments & Transfers Recipe");

// 1. List upcoming bills
const bills = call("payments.bills");
show("payments.bills — Upcoming bills", bills);

// 2. Create a bill payment
const billPay = call("payments.billpay.create", {
  billId: "bill-demo-001",
  amount: 15000,
  fromAccountId: "acct-demo-checking-001",
});
show("payments.billpay.create — Pay a bill", billPay);

// 3. Internal transfer between accounts
const transfer = call("transfers.internal", {
  fromAccountId: "acct-demo-checking-001",
  toAccountId: "acct-demo-savings-002",
  amountCents: 50000,
  memo: "Savings contribution",
});
show("transfers.internal — Move money between accounts", transfer);

// 4. Wire transfer
const wire = call("payments.wire.send", {
  fromAccountId: "acct-demo-checking-001",
  recipientName: "Jane Doe",
  amountCents: 100000,
});
show("payments.wire.send — Wire transfer", wire);

// 5. Beneficiaries
const beneficiaries = call("accounts.beneficiaries");
show("accounts.beneficiaries — Saved recipients", beneficiaries);

console.log("\nDone! Use these response shapes to build payment UIs.\n");

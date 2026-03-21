#!/usr/bin/env npx tsx
/**
 * Recipe: Financial Insights & AI
 *
 * Exercises the financial analytics and AI intelligence endpoints —
 * spending breakdowns, merchant analysis, offers, and proactive insights.
 *
 * Run:  npx tsx scripts/recipes/financial-insights.ts
 */

import { call, show, heading } from "./helpers";

heading("Financial Insights & AI Recipe");

// 1. Spending breakdown by category
const spending = call("financial.spending");
show("financial.spending — Category breakdown", spending);

// 2. Top merchants
const merchants = call("financial.merchants");
show("financial.merchants — Top merchants", merchants);

// 3. Personalised offers
const offers = call("financial.offers");
show("financial.offers — Targeted offers", offers);

// 4. AI proactive insights (overdraft risk, anomaly detection)
const insights = call("ai.insights");
show("ai.insights — Proactive intelligence", insights);

// 5. AI chat (simulate a user question)
const chat = call("ai.chat", { message: "What is my checking balance?" });
show("ai.chat — Conversational response", chat);

// 6. Automation rules
const rules = call("ai.automation-rules");
show("ai.automation-rules — Smart automation", rules);

console.log("\nDone! Use these to build dashboards and AI-powered features.\n");

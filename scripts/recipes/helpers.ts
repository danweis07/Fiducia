/**
 * Shared helpers for demo recipe scripts.
 *
 * Provides a thin wrapper around getDemoResponse so recipes read like
 * real gateway calls:  await call('accounts.list')
 */

// Inline the handler registry — we import the merged map directly so
// there is no need for Vite, i18n, or a running dev server.
import { getDemoResponse } from "../../src/lib/demo-data/index";

/** Simulate a gateway call against demo data. */
export function call<T = unknown>(action: string, params: Record<string, unknown> = {}): T {
  return getDemoResponse(action, params) as T;
}

/** Pretty-print a labelled response. */
export function show(label: string, data: unknown): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("=".repeat(60));
  console.log(JSON.stringify(data, null, 2));
}

/** Print a section header without data. */
export function heading(text: string): void {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${text}`);
  console.log("─".repeat(60));
}

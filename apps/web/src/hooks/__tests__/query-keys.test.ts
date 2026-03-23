import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/gateway", () => ({
  gateway: new Proxy({}, { get: () => new Proxy({}, { get: () => vi.fn() }) }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn() },
    from: vi.fn(() => ({ select: vi.fn() })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  },
}));

import {
  regulatoryKeys,
  screenKeys,
  vaultKeys,
  sweepKeys,
  treasuryKeys,
  amlKeys,
  overdraftKeys,
  spendingAlertKeys,
  internationalPaymentKeys,
  sessionKeys,
  cashFlowKeys,
  currencyPotKeys,
  approvalKeys,
  deviceKeys,
  invoiceKeys,
  exportKeys,
  instantPaymentKeys,
} from "../query-keys";

describe("query-keys", () => {
  it("regulatoryKeys has correct structure", () => {
    expect(regulatoryKeys.all).toEqual(["regulatory"]);
    expect(regulatoryKeys.safeguarding("US")).toEqual(["regulatory", "safeguarding", "US"]);
    expect(regulatoryKeys.withholding({ year: 2024 })).toEqual([
      "regulatory",
      "withholding",
      { year: 2024 },
    ]);
  });

  it("screenKeys has correct structure", () => {
    expect(screenKeys.all).toEqual(["sdui"]);
    expect(screenKeys.manifests()).toEqual(["sdui", "manifests"]);
    expect(screenKeys.personas()).toEqual(["sdui", "personas"]);
  });

  it("vaultKeys has correct structure", () => {
    expect(vaultKeys.all).toEqual(["vault"]);
    expect(vaultKeys.document("doc-1")).toEqual(["vault", "document", "doc-1"]);
    expect(vaultKeys.summary()).toEqual(["vault", "summary"]);
  });

  it("sweepKeys has correct structure", () => {
    expect(sweepKeys.all).toEqual(["sweeps"]);
    expect(sweepKeys.rules("active")).toEqual(["sweeps", "rules", "active"]);
    expect(sweepKeys.summary()).toEqual(["sweeps", "summary"]);
  });

  it("treasuryKeys has correct structure", () => {
    expect(treasuryKeys.all).toEqual(["treasury"]);
    expect(treasuryKeys.vaults()).toEqual(["treasury", "vaults"]);
  });

  it("amlKeys has correct structure", () => {
    expect(amlKeys.all).toEqual(["aml"]);
    expect(amlKeys.screening("s1")).toEqual(["aml-screening", "s1"]);
  });

  it("overdraftKeys has correct structure", () => {
    expect(overdraftKeys.all).toEqual(["overdraft"]);
    expect(overdraftKeys.settings("acc-1")).toEqual(["overdraft", "settings", "acc-1"]);
    expect(overdraftKeys.feeSchedule()).toEqual(["overdraft", "feeSchedule"]);
  });

  it("spendingAlertKeys has correct structure", () => {
    expect(spendingAlertKeys.all).toEqual(["spending-alerts"]);
    expect(spendingAlertKeys.summary()).toEqual(["spending-alerts", "summary"]);
  });

  it("internationalPaymentKeys has correct structure", () => {
    expect(internationalPaymentKeys.all).toEqual(["internationalPayments"]);
    expect(internationalPaymentKeys.coverage("EU")).toEqual([
      "internationalPayments",
      "coverage",
      "EU",
    ]);
  });

  it("sessionKeys has correct structure", () => {
    expect(sessionKeys.all).toEqual(["sessions"]);
    expect(sessionKeys.activity()).toEqual(["sessions", "activity"]);
  });

  it("cashFlowKeys has correct structure", () => {
    expect(cashFlowKeys.all).toEqual(["cashflow"]);
    expect(cashFlowKeys.forecast("acc-1", 30)).toEqual(["cashflow", "forecast", "acc-1", 30]);
  });

  it("currencyPotKeys has correct structure", () => {
    expect(currencyPotKeys.all).toEqual(["currencyPots"]);
    expect(currencyPotKeys.get("pot-1")).toEqual(["currencyPots", "get", "pot-1"]);
  });

  it("approvalKeys has correct structure", () => {
    expect(approvalKeys.all).toEqual(["approvals"]);
    expect(approvalKeys.policies()).toEqual(["approvals", "policies"]);
  });

  it("deviceKeys has correct structure", () => {
    expect(deviceKeys.all).toEqual(["devices"]);
    expect(deviceKeys.detail("d1")).toEqual(["devices", "d1"]);
  });

  it("invoiceKeys has correct structure", () => {
    expect(invoiceKeys.all).toEqual(["invoices"]);
    expect(invoiceKeys.detail("inv-1")).toEqual(["invoices", "inv-1"]);
  });

  it("exportKeys has correct structure", () => {
    expect(exportKeys.all).toEqual(["exports"]);
    expect(exportKeys.summary()).toEqual(["exports", "summary"]);
  });

  it("instantPaymentKeys has correct structure", () => {
    expect(instantPaymentKeys.all).toEqual(["instantPayments"]);
    expect(instantPaymentKeys.detail("p1")).toEqual(["instantPayments", "get", "p1"]);
  });
});

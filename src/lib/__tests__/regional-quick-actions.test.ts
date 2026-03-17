import { describe, it, expect } from "vitest";
import { getQuickActions } from "../regional-quick-actions";
import type { TenantFeatures } from "@/types/tenant";

/** All standard TenantFeatures enabled */
function allFeaturesEnabled(): TenantFeatures {
  return {
    rdc: true,
    billPay: true,
    p2p: true,
    cardControls: true,
    externalTransfers: true,
    wires: true,
    mobileDeposit: true,
    directDeposit: true,
    openBanking: true,
    sca: true,
    confirmationOfPayee: true,
    multiCurrency: true,
    internationalPayments: true,
    internationalBillPay: true,
    openBankingAggregation: true,
    aliasPayments: true,
    amlScreening: true,
    instantPayments: true,
  };
}

/** Helper to create features with specific overrides */
function featuresWithOverrides(overrides: Partial<TenantFeatures>): TenantFeatures {
  return { ...allFeaturesEnabled(), ...overrides };
}

describe("getQuickActions", () => {
  describe("US region", () => {
    it("returns 5 actions when all features are enabled", () => {
      const actions = getQuickActions("us", allFeaturesEnabled());
      expect(actions).toHaveLength(5);
    });

    it("returns 4 actions when rdc is disabled (no Deposit Check)", () => {
      const actions = getQuickActions("us", featuresWithOverrides({ rdc: false }));
      expect(actions).toHaveLength(4);
      const labels = actions.map((a) => a.labelKey);
      expect(labels).not.toContain("nav.depositCheck");
    });

    it("returns 4 actions when billPay is disabled (no Pay Bills)", () => {
      const actions = getQuickActions("us", featuresWithOverrides({ billPay: false }));
      expect(actions).toHaveLength(4);
      const labels = actions.map((a) => a.labelKey);
      expect(labels).not.toContain("dashboard.payBills");
    });
  });

  describe("UK region", () => {
    it("returns actions including Pay Contact and International", () => {
      const actions = getQuickActions("uk", allFeaturesEnabled());
      const labels = actions.map((a) => a.labelKey);
      expect(labels).toContain("dashboard.payContact");
      expect(labels).toContain("nav.internationalPayments");
    });

    it("returns 5 actions when all features enabled", () => {
      const actions = getQuickActions("uk", allFeaturesEnabled());
      expect(actions).toHaveLength(5);
    });
  });

  describe("EU region", () => {
    it("returns same actions as UK (shared UK_EU_ACTIONS)", () => {
      const ukActions = getQuickActions("uk", allFeaturesEnabled());
      const euActions = getQuickActions("eu", allFeaturesEnabled());
      expect(euActions.map((a) => a.labelKey)).toEqual(ukActions.map((a) => a.labelKey));
    });
  });

  describe("Africa region", () => {
    it("returns actions including P2P and Alias", () => {
      const actions = getQuickActions("africa", allFeaturesEnabled());
      const labels = actions.map((a) => a.labelKey);
      expect(labels).toContain("dashboard.payContact");
      expect(labels).toContain("nav.payByAlias");
    });

    it("returns 5 actions when all features enabled", () => {
      const actions = getQuickActions("africa", allFeaturesEnabled());
      expect(actions).toHaveLength(5);
    });
  });

  describe("India (apac) region", () => {
    it("returns actions including UPI/Alias", () => {
      const actions = getQuickActions("apac", allFeaturesEnabled());
      const labels = actions.map((a) => a.labelKey);
      expect(labels).toContain("nav.payByAlias");
    });

    it("returns 5 actions when all features enabled", () => {
      const actions = getQuickActions("apac", allFeaturesEnabled());
      expect(actions).toHaveLength(5);
    });
  });

  describe("MENA region", () => {
    it("returns appropriate actions", () => {
      const actions = getQuickActions("mena", allFeaturesEnabled());
      const labels = actions.map((a) => a.labelKey);
      expect(labels).toContain("nav.moveMoney");
      expect(labels).toContain("dashboard.payBills");
      expect(labels).toContain("nav.internationalPayments");
      expect(labels).toContain("nav.multiCurrency");
      expect(labels).toContain("nav.cardControls");
    });

    it("returns 5 actions when all features enabled", () => {
      const actions = getQuickActions("mena", allFeaturesEnabled());
      expect(actions).toHaveLength(5);
    });
  });

  describe("LATAM region", () => {
    it("returns all LATAM actions when features enabled", () => {
      const actions = getQuickActions("latam", allFeaturesEnabled());
      const labels = actions.map((a) => a.labelKey);
      expect(labels).toContain("nav.moveMoney");
      expect(labels).toContain("dashboard.payContact");
      expect(labels).toContain("dashboard.payBills");
      expect(labels).toContain("nav.cardControls");
      expect(labels).toContain("nav.instantPayments");
    });

    it("includes instantPayments action when feature is enabled", () => {
      const features = allFeaturesEnabled();
      const actions = getQuickActions("latam", features);
      const labels = actions.map((a) => a.labelKey);
      expect(labels).toContain("nav.instantPayments");
    });

    it("returns 5 actions when all features enabled", () => {
      const actions = getQuickActions("latam", allFeaturesEnabled());
      expect(actions).toHaveLength(5);
    });
  });

  describe("actions without requiredFeature are always included", () => {
    it("Move Money is always included in US regardless of features", () => {
      const noFeatures: TenantFeatures = {
        rdc: false,
        billPay: false,
        p2p: false,
        cardControls: false,
        externalTransfers: false,
        wires: false,
        mobileDeposit: false,
        directDeposit: false,
        openBanking: false,
        sca: false,
        confirmationOfPayee: false,
        multiCurrency: false,
        internationalPayments: false,
        internationalBillPay: false,
        openBankingAggregation: false,
        aliasPayments: false,
        amlScreening: false,
        instantPayments: false,
      };
      const actions = getQuickActions("us", noFeatures);
      const labels = actions.map((a) => a.labelKey);
      expect(labels).toContain("nav.moveMoney");
      expect(labels).toContain("dashboard.findATM");
    });
  });

  describe("action shape", () => {
    it("all returned actions have labelKey, icon, color, and to", () => {
      const actions = getQuickActions("us", allFeaturesEnabled());
      for (const action of actions) {
        expect(action).toHaveProperty("labelKey");
        expect(action).toHaveProperty("icon");
        expect(action).toHaveProperty("color");
        expect(action).toHaveProperty("to");
        expect(typeof action.labelKey).toBe("string");
        expect(typeof action.color).toBe("string");
        expect(typeof action.to).toBe("string");
      }
    });
  });
});

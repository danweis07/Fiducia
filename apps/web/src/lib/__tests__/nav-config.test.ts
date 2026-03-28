import { describe, it, expect } from "vitest";
import {
  primaryNavItems,
  mobilePrimaryNavItems,
  overflowNavItems,
  mobileMoreItems,
  filterNavItems,
  groupNavItems,
  NAV_GROUP_LABELS,
} from "../nav-config";
import type { NavItem, NavGroup } from "../nav-config";
import type { TenantFeatures } from "@/types/tenant";

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

function allFeaturesDisabled(): TenantFeatures {
  return {
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
}

// ---------------------------------------------------------------------------
// Static nav arrays
// ---------------------------------------------------------------------------

describe("primaryNavItems", () => {
  it("has 4 items", () => {
    expect(primaryNavItems).toHaveLength(4);
  });

  it("contains Dashboard, Accounts, Move Money, Cards", () => {
    const labels = primaryNavItems.map((i) => i.labelKey);
    expect(labels).toEqual(["nav.dashboard", "nav.accounts", "nav.moveMoney", "nav.cards"]);
  });
});

describe("mobilePrimaryNavItems", () => {
  it("has 4 items", () => {
    expect(mobilePrimaryNavItems).toHaveLength(4);
  });
});

describe("overflowNavItems", () => {
  it("has items with group property", () => {
    const itemsWithGroup = overflowNavItems.filter((i) => i.group !== undefined);
    expect(itemsWithGroup.length).toBeGreaterThan(0);
    // All overflow items should have a group
    expect(itemsWithGroup.length).toBe(overflowNavItems.length);
  });
});

describe("mobileMoreItems", () => {
  it("includes all overflow items plus settings", () => {
    expect(mobileMoreItems.length).toBe(overflowNavItems.length + 1);
    const lastItem = mobileMoreItems[mobileMoreItems.length - 1];
    expect(lastItem.labelKey).toBe("nav.settings");
    expect(lastItem.path).toBe("/settings");
  });
});

// ---------------------------------------------------------------------------
// filterNavItems
// ---------------------------------------------------------------------------

describe("filterNavItems", () => {
  it("with no features/region returns only items without requiredFeature", () => {
    const items: NavItem[] = [
      { path: "/a", icon: primaryNavItems[0].icon, labelKey: "a" },
      { path: "/b", icon: primaryNavItems[0].icon, labelKey: "b", requiredFeature: "rdc" },
    ];
    const result = filterNavItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].labelKey).toBe("a");
  });

  it("with features enabled returns matching items", () => {
    const items: NavItem[] = [
      { path: "/a", icon: primaryNavItems[0].icon, labelKey: "a" },
      { path: "/b", icon: primaryNavItems[0].icon, labelKey: "b", requiredFeature: "rdc" },
      { path: "/c", icon: primaryNavItems[0].icon, labelKey: "c", requiredFeature: "wires" },
    ];
    const result = filterNavItems(items, allFeaturesEnabled());
    expect(result).toHaveLength(3);
  });

  it("with features disabled filters out items with that requiredFeature", () => {
    const items: NavItem[] = [
      { path: "/a", icon: primaryNavItems[0].icon, labelKey: "a" },
      { path: "/b", icon: primaryNavItems[0].icon, labelKey: "b", requiredFeature: "rdc" },
      { path: "/c", icon: primaryNavItems[0].icon, labelKey: "c", requiredFeature: "wires" },
    ];
    const features = { ...allFeaturesDisabled(), rdc: true };
    const result = filterNavItems(items, features);
    expect(result).toHaveLength(2);
    const labels = result.map((i) => i.labelKey);
    expect(labels).toContain("a");
    expect(labels).toContain("b");
    expect(labels).not.toContain("c");
  });

  it("with array requiredFeature checks all features", () => {
    const items: NavItem[] = [
      {
        path: "/a",
        icon: primaryNavItems[0].icon,
        labelKey: "a",
        requiredFeature: ["rdc", "wires"],
      },
    ];
    // Only rdc enabled, wires disabled
    const partialFeatures = { ...allFeaturesDisabled(), rdc: true };
    expect(filterNavItems(items, partialFeatures)).toHaveLength(0);

    // Both enabled
    const bothEnabled = { ...allFeaturesDisabled(), rdc: true, wires: true };
    expect(filterNavItems(items, bothEnabled)).toHaveLength(1);
  });

  it("with requiredRegion filters by region", () => {
    const items: NavItem[] = [
      { path: "/a", icon: primaryNavItems[0].icon, labelKey: "a", requiredRegion: ["us"] },
      { path: "/b", icon: primaryNavItems[0].icon, labelKey: "b", requiredRegion: ["uk", "eu"] },
      { path: "/c", icon: primaryNavItems[0].icon, labelKey: "c" },
    ];
    const usResult = filterNavItems(items, allFeaturesEnabled(), "us");
    expect(usResult).toHaveLength(2);
    expect(usResult.map((i) => i.labelKey)).toEqual(["a", "c"]);

    const ukResult = filterNavItems(items, allFeaturesEnabled(), "uk");
    expect(ukResult).toHaveLength(2);
    expect(ukResult.map((i) => i.labelKey)).toEqual(["b", "c"]);
  });

  it("with requiredRegion but no region arg filters out region-gated items", () => {
    const items: NavItem[] = [
      { path: "/a", icon: primaryNavItems[0].icon, labelKey: "a", requiredRegion: ["us"] },
      { path: "/b", icon: primaryNavItems[0].icon, labelKey: "b" },
    ];
    const result = filterNavItems(items, allFeaturesEnabled());
    expect(result).toHaveLength(1);
    expect(result[0].labelKey).toBe("b");
  });
});

// ---------------------------------------------------------------------------
// groupNavItems
// ---------------------------------------------------------------------------

describe("groupNavItems", () => {
  it("groups items by their group property", () => {
    const grouped = groupNavItems(overflowNavItems);
    expect(grouped.size).toBeGreaterThan(0);
    for (const [group, items] of grouped) {
      for (const item of items) {
        expect(item.group).toBe(group);
      }
    }
  });

  it("returns groups in order: money, accounts, business, tools, security", () => {
    const grouped = groupNavItems(overflowNavItems);
    const keys = Array.from(grouped.keys());
    const expectedOrder: NavGroup[] = ["money", "accounts", "business", "tools", "security"];
    // Filter expected to only groups that actually have items
    const presentOrder = expectedOrder.filter((g) => grouped.has(g));
    expect(keys).toEqual(presentOrder);
  });

  it('puts ungrouped items into "tools"', () => {
    const items: NavItem[] = [
      { path: "/a", icon: primaryNavItems[0].icon, labelKey: "a" },
      { path: "/b", icon: primaryNavItems[0].icon, labelKey: "b", group: "money" },
    ];
    const grouped = groupNavItems(items);
    const toolsItems = grouped.get("tools");
    expect(toolsItems).toBeDefined();
    expect(toolsItems!.some((i) => i.labelKey === "a")).toBe(true);
  });

  it("contains all 5 groups for overflowNavItems", () => {
    const grouped = groupNavItems(overflowNavItems);
    const expectedGroups: NavGroup[] = ["money", "accounts", "business", "tools", "security"];
    for (const g of expectedGroups) {
      expect(grouped.has(g)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// NAV_GROUP_LABELS
// ---------------------------------------------------------------------------

describe("NAV_GROUP_LABELS", () => {
  it("has entries for all 5 groups", () => {
    const groups: NavGroup[] = ["money", "accounts", "business", "tools", "security"];
    for (const group of groups) {
      expect(NAV_GROUP_LABELS[group]).toBeDefined();
      expect(typeof NAV_GROUP_LABELS[group]).toBe("string");
    }
  });

  it("has exactly 5 entries", () => {
    expect(Object.keys(NAV_GROUP_LABELS)).toHaveLength(5);
  });
});

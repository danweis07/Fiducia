import { describe, it, expect } from "vitest";
import {
  REGIONAL_PROFILES,
  getRegionalDefaults,
  getProfileById,
  getProfilesForRegion,
} from "../regional-profiles";
import type { TenantRegion } from "@/types/tenant";

const REQUIRED_PROFILE_FIELDS = [
  "id",
  "label",
  "description",
  "region",
  "defaultCurrency",
  "features",
];

const ALL_FEATURE_KEYS = [
  "rdc",
  "billPay",
  "p2p",
  "cardControls",
  "externalTransfers",
  "wires",
  "mobileDeposit",
  "directDeposit",
  "openBanking",
  "sca",
  "confirmationOfPayee",
  "multiCurrency",
  "internationalPayments",
  "internationalBillPay",
  "openBankingAggregation",
  "aliasPayments",
  "amlScreening",
  "instantPayments",
];

describe("REGIONAL_PROFILES", () => {
  it("has exactly 8 entries", () => {
    expect(REGIONAL_PROFILES).toHaveLength(8);
  });

  it.each(REGIONAL_PROFILES)('profile "$id" has all required fields', (profile) => {
    for (const field of REQUIRED_PROFILE_FIELDS) {
      expect(profile).toHaveProperty(field);
    }
  });

  it.each(REGIONAL_PROFILES)('profile "$id" features has all 18 feature flag keys', (profile) => {
    const featureKeys = Object.keys(profile.features);
    expect(featureKeys).toHaveLength(18);
    for (const key of ALL_FEATURE_KEYS) {
      expect(profile.features).toHaveProperty(key);
      expect(typeof profile.features[key as keyof typeof profile.features]).toBe("boolean");
    }
  });
});

describe("getRegionalDefaults", () => {
  it('returns us_credit_union for "us"', () => {
    const profile = getRegionalDefaults("us");
    expect(profile.id).toBe("us_credit_union");
  });

  it('returns uk_neobank for "uk"', () => {
    const profile = getRegionalDefaults("uk");
    expect(profile.id).toBe("uk_neobank");
  });

  it('returns eu_bank for "eu"', () => {
    const profile = getRegionalDefaults("eu");
    expect(profile.id).toBe("eu_bank");
  });

  it('returns africa_mobile for "africa"', () => {
    const profile = getRegionalDefaults("africa");
    expect(profile.id).toBe("africa_mobile");
  });

  it("falls back to us_credit_union for unknown region", () => {
    const profile = getRegionalDefaults("unknown" as TenantRegion);
    expect(profile.id).toBe("us_credit_union");
  });
});

describe("getProfileById", () => {
  it("returns the correct profile for us_neobank", () => {
    const profile = getProfileById("us_neobank");
    expect(profile).toBeDefined();
    expect(profile!.id).toBe("us_neobank");
    expect(profile!.label).toBe("US Neobank");
    expect(profile!.region).toBe("us");
  });

  it("returns the correct profile for each known id", () => {
    const ids = [
      "us_credit_union",
      "us_neobank",
      "uk_neobank",
      "eu_bank",
      "africa_mobile",
      "india_digital",
      "latam_digital",
      "mena_bank",
    ] as const;

    for (const id of ids) {
      const profile = getProfileById(id);
      expect(profile).toBeDefined();
      expect(profile!.id).toBe(id);
    }
  });

  it("returns undefined for nonexistent id", () => {
    const profile = getProfileById("nonexistent" as any);
    expect(profile).toBeUndefined();
  });
});

describe("getProfilesForRegion", () => {
  it('returns 2 profiles for "us" (us_credit_union, us_neobank)', () => {
    const profiles = getProfilesForRegion("us");
    expect(profiles).toHaveLength(2);
    const ids = profiles.map((p) => p.id);
    expect(ids).toContain("us_credit_union");
    expect(ids).toContain("us_neobank");
  });

  it('returns 1 profile for "uk"', () => {
    const profiles = getProfilesForRegion("uk");
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe("uk_neobank");
  });

  it('returns 1 profile for "eu"', () => {
    const profiles = getProfilesForRegion("eu");
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe("eu_bank");
  });

  it("returns empty array for unknown region", () => {
    const profiles = getProfilesForRegion("unknown" as TenantRegion);
    expect(profiles).toHaveLength(0);
  });
});

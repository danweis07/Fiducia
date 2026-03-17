import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/backend", () => ({
  getBackend: vi.fn().mockReturnValue({
    gateway: { invoke: vi.fn() },
  }),
}));
vi.mock("@/lib/demo", () => ({
  isDemoMode: vi.fn().mockReturnValue(false),
}));

import { gateway } from "../../gateway";
import { getBackend } from "@/lib/backend";

function mockInvoke(data: unknown) {
  const backend = getBackend();
  vi.mocked(backend.gateway.invoke).mockResolvedValue({ data, error: undefined, meta: {} });
  return vi.mocked(backend.gateway.invoke);
}

describe("CardsDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── cards ───────────────────────────────────────────────────────────────────

  describe("cards", () => {
    it("list calls cards.list", async () => {
      const invoke = mockInvoke({ cards: [] });
      await gateway.cards.list();
      expect(invoke).toHaveBeenCalledWith("cards.list", {});
    });

    it("lock calls cards.lock", async () => {
      const invoke = mockInvoke({ card: {} });
      await gateway.cards.lock("c1");
      expect(invoke).toHaveBeenCalledWith("cards.lock", { id: "c1" });
    });

    it("unlock calls cards.unlock", async () => {
      const invoke = mockInvoke({ card: {} });
      await gateway.cards.unlock("c1");
      expect(invoke).toHaveBeenCalledWith("cards.unlock", { id: "c1" });
    });

    it("setLimit calls cards.setLimit", async () => {
      const invoke = mockInvoke({ card: {} });
      await gateway.cards.setLimit("c1", 500000);
      expect(invoke).toHaveBeenCalledWith("cards.setLimit", { id: "c1", dailyLimitCents: 500000 });
    });
  });

  // ── cardProvisioning ────────────────────────────────────────────────────────

  describe("cardProvisioning", () => {
    it("config calls cardProvisioning.config", async () => {
      const invoke = mockInvoke({ config: {} });
      await gateway.cardProvisioning.config();
      expect(invoke).toHaveBeenCalledWith("cardProvisioning.config", {});
    });

    it("checkEligibility calls cardProvisioning.checkEligibility", async () => {
      const invoke = mockInvoke({ eligibility: {} });
      await gateway.cardProvisioning.checkEligibility("c1", "apple_pay" as unknown);
      expect(invoke).toHaveBeenCalledWith("cardProvisioning.checkEligibility", {
        cardId: "c1",
        walletProvider: "apple_pay",
      });
    });

    it("initiate calls cardProvisioning.initiate", async () => {
      const invoke = mockInvoke({ provisioningId: "prov1" });
      await gateway.cardProvisioning.initiate("c1", "apple_pay" as unknown, "dev1");
      expect(invoke).toHaveBeenCalledWith("cardProvisioning.initiate", {
        cardId: "c1",
        walletProvider: "apple_pay",
        deviceId: "dev1",
      });
    });

    it("complete calls cardProvisioning.complete", async () => {
      const invoke = mockInvoke({ status: "completed" });
      await gateway.cardProvisioning.complete("prov1", "c1", "apple_pay" as unknown, "wallet-tok");
      expect(invoke).toHaveBeenCalledWith("cardProvisioning.complete", {
        provisioningId: "prov1",
        cardId: "c1",
        walletProvider: "apple_pay",
        walletToken: "wallet-tok",
      });
    });

    it("credentials calls cardProvisioning.credentials", async () => {
      const invoke = mockInvoke({ credentials: {} });
      await gateway.cardProvisioning.credentials("c1");
      expect(invoke).toHaveBeenCalledWith("cardProvisioning.credentials", { cardId: "c1" });
    });

    it("setTempExpiration calls cardProvisioning.setTempExpiration", async () => {
      const invoke = mockInvoke({
        cardId: "c1",
        temporaryExpirationDate: "",
        setOnSwitch: true,
        setOnCore: true,
      });
      await gateway.cardProvisioning.setTempExpiration("c1");
      expect(invoke).toHaveBeenCalledWith("cardProvisioning.setTempExpiration", { cardId: "c1" });
    });

    it("requestDigitalOnly calls cardProvisioning.digitalOnly", async () => {
      const invoke = mockInvoke({ card: {} });
      await gateway.cardProvisioning.requestDigitalOnly("a1");
      expect(invoke).toHaveBeenCalledWith("cardProvisioning.digitalOnly", { accountId: "a1" });
    });

    it("requestPhysical calls cardProvisioning.requestPhysical", async () => {
      const invoke = mockInvoke({
        cardId: "c1",
        lastFour: "1234",
        cardCategory: "debit",
        activationStatus: "inactive",
      });
      await gateway.cardProvisioning.requestPhysical("c1");
      expect(invoke).toHaveBeenCalledWith("cardProvisioning.requestPhysical", { cardId: "c1" });
    });

    it("reportAndReplace calls cardProvisioning.reportReplace", async () => {
      const invoke = mockInvoke({ newCardId: "c2" });
      await gateway.cardProvisioning.reportAndReplace("c1", "lost", true);
      expect(invoke).toHaveBeenCalledWith("cardProvisioning.reportReplace", {
        cardId: "c1",
        reason: "lost",
        digitalOnly: true,
      });
    });
  });

  // ── cardReplacements ────────────────────────────────────────────────────────

  describe("cardReplacements", () => {
    it("request calls cardServices.replacement.request", async () => {
      const invoke = mockInvoke({ replacement: {} });
      const params = {
        cardId: "c1",
        reason: "damaged" as unknown,
        shippingMethod: "standard" as const,
      };
      await gateway.cardReplacements.request(params);
      expect(invoke).toHaveBeenCalledWith("cardServices.replacement.request", params);
    });

    it("list calls cardServices.replacement.list", async () => {
      const invoke = mockInvoke({ replacements: [] });
      await gateway.cardReplacements.list({ limit: 10 });
      expect(invoke).toHaveBeenCalledWith("cardServices.replacement.list", { limit: 10 });
    });

    it("status calls cardServices.replacement.status", async () => {
      const invoke = mockInvoke({ replacement: {} });
      await gateway.cardReplacements.status("rep1");
      expect(invoke).toHaveBeenCalledWith("cardServices.replacement.status", {
        replacementId: "rep1",
      });
    });

    it("activate calls cardServices.replacement.activate", async () => {
      const invoke = mockInvoke({ success: true, replacementId: "rep1" });
      await gateway.cardReplacements.activate("rep1", "4321");
      expect(invoke).toHaveBeenCalledWith("cardServices.replacement.activate", {
        replacementId: "rep1",
        lastFourDigits: "4321",
      });
    });
  });
});

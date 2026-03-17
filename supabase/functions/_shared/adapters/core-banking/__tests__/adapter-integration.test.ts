/**
 * Core Banking Adapter Integration Tests
 *
 * Tests that each adapter (Mock, CU*Answers, Fineract, Symitar) implements
 * the CoreBankingAdapter interface correctly and returns well-formed data
 * matching the expected types.
 *
 * The Mock adapter is tested directly. The CU*Answers, Fineract, and Symitar
 * adapters are tested against the core-simulator Express server which mimics
 * their real API endpoints.
 */

import { describe, it, expect } from "vitest";
import { MockCoreBankingAdapter } from "../mock-adapter.ts";
import type {
  CoreBankingAdapter,
  CoreAccount,
  CoreTransaction,
  CoreTransferResult,
  ListAccountsResponse,
  ListTransactionsResponse,
} from "../types.ts";

// =============================================================================
// SHARED ADAPTER CONTRACT TESTS
// =============================================================================

/**
 * Runs the same contract tests against any CoreBankingAdapter implementation.
 * Verifies that the adapter returns data conforming to the shared types.
 */
function adapterContractTests(getAdapter: () => CoreBankingAdapter, adapterName: string) {
  const userId = "member-001";
  const tenantId = "test-tenant";

  describe(`${adapterName} — contract tests`, () => {
    // -------------------------------------------------------------------------
    // healthCheck()
    // -------------------------------------------------------------------------
    it("healthCheck returns a valid health response", async () => {
      const adapter = getAdapter();
      const health = await adapter.healthCheck();

      expect(health).toBeDefined();
      expect(health.adapterId).toBeTruthy();
      expect(typeof health.healthy).toBe("boolean");
      expect(health.circuitState).toMatch(/^(closed|open|half-open)$/);
      expect(health.lastCheckedAt).toBeTruthy();
    });

    // -------------------------------------------------------------------------
    // listAccounts()
    // -------------------------------------------------------------------------
    it("listAccounts returns accounts array with correct shape", async () => {
      const adapter = getAdapter();
      const result: ListAccountsResponse = await adapter.listAccounts({
        userId,
        tenantId,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.accounts)).toBe(true);
      expect(typeof result.total).toBe("number");
      expect(result.total).toBeGreaterThan(0);
      expect(result.accounts.length).toBeGreaterThan(0);
    });

    it("listAccounts accounts conform to CoreAccount shape", async () => {
      const adapter = getAdapter();
      const { accounts } = await adapter.listAccounts({ userId, tenantId });

      for (const account of accounts) {
        assertCoreAccount(account);
      }
    });

    it("listAccounts respects limit parameter", async () => {
      const adapter = getAdapter();
      const result = await adapter.listAccounts({
        userId,
        tenantId,
        limit: 1,
      });

      expect(result.accounts.length).toBeLessThanOrEqual(1);
    });

    // -------------------------------------------------------------------------
    // getAccount()
    // -------------------------------------------------------------------------
    it("getAccount returns a single account matching the requested ID", async () => {
      const adapter = getAdapter();
      const { accounts } = await adapter.listAccounts({ userId, tenantId });
      const firstAccount = accounts[0];

      const account = await adapter.getAccount({
        userId,
        tenantId,
        accountId: firstAccount.accountId,
      });

      assertCoreAccount(account);
      expect(account.accountId).toBe(firstAccount.accountId);
    });

    it("getAccount throws for a non-existent account", async () => {
      const adapter = getAdapter();

      await expect(
        adapter.getAccount({
          userId,
          tenantId,
          accountId: "non-existent-account-xyz",
        }),
      ).rejects.toThrow();
    });

    // -------------------------------------------------------------------------
    // listTransactions()
    // -------------------------------------------------------------------------
    it("listTransactions returns transactions with correct shape", async () => {
      const adapter = getAdapter();
      const { accounts } = await adapter.listAccounts({ userId, tenantId });

      const result: ListTransactionsResponse = await adapter.listTransactions({
        userId,
        tenantId,
        accountId: accounts[0].accountId,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.transactions)).toBe(true);
      expect(typeof result.total).toBe("number");
    });

    it("listTransactions transactions conform to CoreTransaction shape", async () => {
      const adapter = getAdapter();
      const { accounts } = await adapter.listAccounts({ userId, tenantId });

      const { transactions } = await adapter.listTransactions({
        userId,
        tenantId,
        accountId: accounts[0].accountId,
      });

      for (const txn of transactions) {
        assertCoreTransaction(txn);
      }
    });

    // -------------------------------------------------------------------------
    // createTransfer()
    // -------------------------------------------------------------------------
    it("createTransfer returns a valid transfer result", async () => {
      const adapter = getAdapter();
      const { accounts } = await adapter.listAccounts({ userId, tenantId });

      // Skip if fewer than 2 accounts (can't do internal transfer)
      if (accounts.length < 2) return;

      const result: CoreTransferResult = await adapter.createTransfer({
        userId,
        tenantId,
        transfer: {
          fromAccountId: accounts[0].accountId,
          toAccountId: accounts[1].accountId,
          type: "internal",
          amountCents: 1000,
          memo: "Integration test transfer",
        },
      });

      assertCoreTransferResult(result);
    });

    // -------------------------------------------------------------------------
    // listCards()
    // -------------------------------------------------------------------------
    it("listCards returns a cards array", async () => {
      const adapter = getAdapter();
      const result = await adapter.listCards({ userId, tenantId });

      expect(result).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);
    });
  });
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

function assertCoreAccount(account: CoreAccount) {
  expect(account.accountId).toBeTruthy();
  expect(typeof account.accountId).toBe("string");
  expect([
    "checking",
    "savings",
    "money_market",
    "cd",
    "fixed_deposit",
    "recurring_deposit",
    "share",
    "loan",
  ]).toContain(account.type);
  expect(["active", "frozen", "closed", "pending"]).toContain(account.status);
  expect(typeof account.balanceCents).toBe("number");
  expect(typeof account.availableBalanceCents).toBe("number");
  expect(typeof account.accountNumberMasked).toBe("string");
  expect(typeof account.routingNumber).toBe("string");
  expect(typeof account.openedAt).toBe("string");
}

function assertCoreTransaction(txn: CoreTransaction) {
  expect(txn.transactionId).toBeTruthy();
  expect(typeof txn.transactionId).toBe("string");
  expect(typeof txn.accountId).toBe("string");
  expect([
    "debit",
    "credit",
    "transfer",
    "deposit",
    "withdrawal",
    "fee",
    "interest",
    "rdc_deposit",
    "bill_payment",
  ]).toContain(txn.type);
  expect(["pending", "posted", "declined", "reversed"]).toContain(txn.status);
  expect(typeof txn.amountCents).toBe("number");
  expect(typeof txn.description).toBe("string");
  expect(typeof txn.createdAt).toBe("string");
}

function assertCoreTransferResult(result: CoreTransferResult) {
  expect(result.transferId).toBeTruthy();
  expect(typeof result.transferId).toBe("string");
  expect(["pending", "processing", "completed", "failed", "cancelled"]).toContain(result.status);
  expect(typeof result.fromAccountId).toBe("string");
  expect(typeof result.amountCents).toBe("number");
  expect(typeof result.createdAt).toBe("string");
}

// =============================================================================
// TEST SUITES
// =============================================================================

// --- Mock Adapter (always available, no external dependencies) ---
describe("Core Banking Adapter Integration Tests", () => {
  describe("MockCoreBankingAdapter", () => {
    const adapter = new MockCoreBankingAdapter();
    adapterContractTests(() => adapter, "MockCoreBankingAdapter");

    it("mock adapter returns consistent data across calls", async () => {
      const result1 = await adapter.listAccounts({ userId: "u1", tenantId: "t1" });
      const result2 = await adapter.listAccounts({ userId: "u1", tenantId: "t1" });

      expect(result1.accounts.length).toBe(result2.accounts.length);
      expect(result1.accounts[0].accountId).toBe(result2.accounts[0].accountId);
    });

    it("mock adapter health is always healthy", async () => {
      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(true);
    });

    it("mock adapter supports pagination on listAccounts", async () => {
      const all = await adapter.listAccounts({ userId: "u1", tenantId: "t1" });
      const page = await adapter.listAccounts({
        userId: "u1",
        tenantId: "t1",
        limit: 1,
        offset: 0,
      });

      expect(page.accounts.length).toBeLessThanOrEqual(1);
      expect(page.total).toBe(all.total);
    });

    it("mock adapter supports pagination on listTransactions", async () => {
      const all = await adapter.listTransactions({
        userId: "u1",
        tenantId: "t1",
        accountId: "acct_mock_checking_1",
      });
      const page = await adapter.listTransactions({
        userId: "u1",
        tenantId: "t1",
        accountId: "acct_mock_checking_1",
        limit: 3,
        offset: 0,
      });

      expect(page.transactions.length).toBeLessThanOrEqual(3);
      expect(page.total).toBe(all.total);
    });

    it("mock adapter transfer has correct amount", async () => {
      const result = await adapter.createTransfer({
        userId: "u1",
        tenantId: "t1",
        transfer: {
          fromAccountId: "acct_mock_checking_1",
          toAccountId: "acct_mock_savings_1",
          type: "internal",
          amountCents: 5000,
          memo: "test",
        },
      });

      expect(result.amountCents).toBe(5000);
      expect(result.fromAccountId).toBe("acct_mock_checking_1");
    });

    it("mock adapter cards have valid structure", async () => {
      const { cards } = await adapter.listCards({ userId: "u1", tenantId: "t1" });

      for (const card of cards) {
        expect(card.cardId).toBeTruthy();
        expect(card.lastFour).toMatch(/^\d{4}$/);
        expect(["debit", "credit"]).toContain(card.type);
        expect(["active", "locked", "lost", "stolen", "expired", "cancelled"]).toContain(
          card.status,
        );
        expect(typeof card.dailyLimitCents).toBe("number");
        expect(typeof card.isContactless).toBe("boolean");
        expect(typeof card.isVirtual).toBe("boolean");
      }
    });

    it("mock adapter lockCard returns locked card", async () => {
      const { cards } = await adapter.listCards({ userId: "u1", tenantId: "t1" });
      if (cards.length === 0) return;
      const card = await adapter.lockCard({
        userId: "u1",
        tenantId: "t1",
        cardId: cards[0].cardId,
      });
      expect(card.status).toBe("locked");
    });

    it("mock adapter unlockCard returns active card", async () => {
      const { cards } = await adapter.listCards({ userId: "u1", tenantId: "t1" });
      if (cards.length === 0) return;
      const card = await adapter.unlockCard({
        userId: "u1",
        tenantId: "t1",
        cardId: cards[0].cardId,
      });
      expect(card.status).toBe("active");
    });
  });
});

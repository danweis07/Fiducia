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

describe("Payments Domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // BILLS
  // ===========================================================================

  describe("bills", () => {
    it("list calls bills.list with params", async () => {
      const invoke = mockInvoke({ bills: [] });
      await gateway.bills.list({ status: "pending", limit: 10 });
      expect(invoke).toHaveBeenCalledWith("bills.list", { status: "pending", limit: 10 });
    });

    it("create calls bills.create with input", async () => {
      const invoke = mockInvoke({ bill: { id: "b1" } });
      const input = {
        payeeName: "Electric Co",
        payeeAccountNumber: "123",
        amountCents: 15000,
        dueDate: "2026-03-20",
        fromAccountId: "a1",
      };
      await gateway.bills.create(input);
      expect(invoke).toHaveBeenCalledWith("bills.create", input);
    });

    it("pay calls bills.pay with id", async () => {
      const invoke = mockInvoke({ bill: { id: "b1" } });
      await gateway.bills.pay("b1");
      expect(invoke).toHaveBeenCalledWith("bills.pay", { id: "b1" });
    });

    it("cancel calls bills.cancel with id", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.bills.cancel("b1");
      expect(invoke).toHaveBeenCalledWith("bills.cancel", { id: "b1" });
    });
  });

  // ===========================================================================
  // BILLPAY
  // ===========================================================================

  describe("billpay", () => {
    it("searchBillers calls billpay.billers.search with params", async () => {
      const invoke = mockInvoke({ billers: [], totalCount: 0 });
      await gateway.billpay.searchBillers({ query: "electric" });
      expect(invoke).toHaveBeenCalledWith("billpay.billers.search", { query: "electric" });
    });

    it("listPayees calls billpay.payees.list", async () => {
      const invoke = mockInvoke({ payees: [] });
      await gateway.billpay.listPayees();
      expect(invoke).toHaveBeenCalledWith("billpay.payees.list", {});
    });

    it("enrollPayee calls billpay.payees.enroll with input", async () => {
      const invoke = mockInvoke({ payee: { payeeId: "p1" } });
      const input = { billerId: "bil1", accountNumber: "9876", nickname: "Power Co" };
      await gateway.billpay.enrollPayee(input);
      expect(invoke).toHaveBeenCalledWith("billpay.payees.enroll", input);
    });

    it("schedulePayment calls billpay.payments.schedule with input", async () => {
      const invoke = mockInvoke({ payment: { paymentId: "pay1" } });
      const input = {
        payeeId: "p1",
        fromAccountId: "a1",
        amountCents: 5000,
        scheduledDate: "2026-04-01",
      };
      await gateway.billpay.schedulePayment(input);
      expect(invoke).toHaveBeenCalledWith("billpay.payments.schedule", input);
    });

    it("cancelPayment calls billpay.payments.cancel with paymentId", async () => {
      const invoke = mockInvoke({ success: true, payment: {} });
      await gateway.billpay.cancelPayment("pay1");
      expect(invoke).toHaveBeenCalledWith("billpay.payments.cancel", { paymentId: "pay1" });
    });

    it("getPaymentStatus calls billpay.payments.status with paymentId", async () => {
      const invoke = mockInvoke({ status: "completed" });
      await gateway.billpay.getPaymentStatus("pay1");
      expect(invoke).toHaveBeenCalledWith("billpay.payments.status", { paymentId: "pay1" });
    });

    it("listPayments calls billpay.payments.list with params", async () => {
      const invoke = mockInvoke({ payments: [] });
      await gateway.billpay.listPayments({ payeeId: "p1", status: "pending", limit: 20 });
      expect(invoke).toHaveBeenCalledWith("billpay.payments.list", {
        payeeId: "p1",
        status: "pending",
        limit: 20,
      });
    });

    it("listEBills calls billpay.ebills.list with params", async () => {
      const invoke = mockInvoke({ eBills: [] });
      await gateway.billpay.listEBills({ payeeId: "p1", status: "new" });
      expect(invoke).toHaveBeenCalledWith("billpay.ebills.list", { payeeId: "p1", status: "new" });
    });
  });

  // ===========================================================================
  // WIRES
  // ===========================================================================

  describe("wires", () => {
    it("createDomestic calls wires.createDomestic with input", async () => {
      const invoke = mockInvoke({ wire: { id: "w1" } });
      const input = {
        fromAccountId: "a1",
        beneficiaryName: "Jane Doe",
        bankName: "Chase",
        routingNumber: "021000021",
        accountNumber: "123456789",
        amountCents: 100000,
        purpose: "invoice payment",
      };
      await gateway.wires.createDomestic(input);
      expect(invoke).toHaveBeenCalledWith("wires.createDomestic", input);
    });

    it("createInternational calls wires.createInternational with input", async () => {
      const invoke = mockInvoke({ wire: { id: "w2" } });
      const input = {
        fromAccountId: "a1",
        beneficiaryName: "Hans Mueller",
        swiftCode: "DEUTDEFF",
        iban: "DE89370400440532013000",
        bankName: "Deutsche Bank",
        bankCountry: "DE",
        amountCents: 500000,
        currency: "EUR",
        purpose: "consulting fees",
      };
      await gateway.wires.createInternational(input);
      expect(invoke).toHaveBeenCalledWith("wires.createInternational", input);
    });

    it("list calls wires.list with params", async () => {
      const invoke = mockInvoke({ wires: [] });
      await gateway.wires.list({ status: "pending", type: "domestic", limit: 10 });
      expect(invoke).toHaveBeenCalledWith("wires.list", {
        status: "pending",
        type: "domestic",
        limit: 10,
      });
    });

    it("get calls wires.get with id", async () => {
      const invoke = mockInvoke({ wire: { id: "w1" } });
      await gateway.wires.get("w1");
      expect(invoke).toHaveBeenCalledWith("wires.get", { id: "w1" });
    });

    it("cancel calls wires.cancel with id", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.wires.cancel("w1");
      expect(invoke).toHaveBeenCalledWith("wires.cancel", { id: "w1" });
    });

    it("fees calls wires.fees", async () => {
      const invoke = mockInvoke({ fees: { domesticCents: 2500, internationalCents: 4500 } });
      await gateway.wires.fees();
      expect(invoke).toHaveBeenCalledWith("wires.fees", {});
    });

    it("limits calls wires.limits", async () => {
      const invoke = mockInvoke({ limits: { dailyLimitCents: 10000000 } });
      await gateway.wires.limits();
      expect(invoke).toHaveBeenCalledWith("wires.limits", {});
    });
  });

  // ===========================================================================
  // STOP PAYMENTS
  // ===========================================================================

  describe("stopPayments", () => {
    it("create calls stopPayments.create with input", async () => {
      const invoke = mockInvoke({ stopPayment: { id: "sp1" } });
      const input = {
        accountId: "a1",
        checkNumber: "1001",
        payeeName: "Vendor",
        amountCents: 50000,
        reason: "Lost check",
        duration: "6months" as const,
      };
      await gateway.stopPayments.create(input);
      expect(invoke).toHaveBeenCalledWith("stopPayments.create", input);
    });

    it("list calls stopPayments.list with params", async () => {
      const invoke = mockInvoke({ stopPayments: [] });
      await gateway.stopPayments.list({ status: "active", accountId: "a1" });
      expect(invoke).toHaveBeenCalledWith("stopPayments.list", {
        status: "active",
        accountId: "a1",
      });
    });

    it("get calls stopPayments.get with id", async () => {
      const invoke = mockInvoke({ stopPayment: { id: "sp1" } });
      await gateway.stopPayments.get("sp1");
      expect(invoke).toHaveBeenCalledWith("stopPayments.get", { id: "sp1" });
    });

    it("cancel calls stopPayments.cancel with id", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.stopPayments.cancel("sp1");
      expect(invoke).toHaveBeenCalledWith("stopPayments.cancel", { id: "sp1" });
    });

    it("renew calls stopPayments.renew with stopPaymentId and duration", async () => {
      const invoke = mockInvoke({ stopPayment: { id: "sp1" } });
      await gateway.stopPayments.renew("sp1", "12months");
      expect(invoke).toHaveBeenCalledWith("stopPayments.renew", {
        stopPaymentId: "sp1",
        duration: "12months",
      });
    });

    it("fee calls stopPayments.fee", async () => {
      const invoke = mockInvoke({ feeCents: 3500 });
      await gateway.stopPayments.fee();
      expect(invoke).toHaveBeenCalledWith("stopPayments.fee", {});
    });
  });

  // ===========================================================================
  // P2P
  // ===========================================================================

  describe("p2p", () => {
    it("enroll calls p2p.enroll with params", async () => {
      const invoke = mockInvoke({ enrollment: { id: "e1" } });
      const params = {
        accountId: "a1",
        enrollmentType: "email" as const,
        enrollmentValue: "john@example.com",
      };
      await gateway.p2p.enroll(params);
      expect(invoke).toHaveBeenCalledWith("p2p.enroll", params);
    });

    it("getEnrollment calls p2p.enrollment", async () => {
      const invoke = mockInvoke({ enrollment: { id: "e1" } });
      await gateway.p2p.getEnrollment();
      expect(invoke).toHaveBeenCalledWith("p2p.enrollment", {});
    });

    it("unenroll calls p2p.unenroll", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.p2p.unenroll();
      expect(invoke).toHaveBeenCalledWith("p2p.unenroll", {});
    });

    it("send calls p2p.send with params", async () => {
      const invoke = mockInvoke({ transaction: { id: "tx1" } });
      const params = {
        recipientType: "email" as const,
        recipientValue: "jane@example.com",
        amountCents: 5000,
        memo: "Lunch",
      };
      await gateway.p2p.send(params);
      expect(invoke).toHaveBeenCalledWith("p2p.send", params);
    });

    it("requestMoney calls p2p.request with params", async () => {
      const invoke = mockInvoke({ transaction: { id: "tx2" } });
      const params = {
        recipientType: "phone" as const,
        recipientValue: "+15551234567",
        amountCents: 2500,
      };
      await gateway.p2p.requestMoney(params);
      expect(invoke).toHaveBeenCalledWith("p2p.request", params);
    });

    it("listTransactions calls p2p.transactions with params", async () => {
      const invoke = mockInvoke({ transactions: [] });
      await gateway.p2p.listTransactions({ filter: "sent", limit: 20 });
      expect(invoke).toHaveBeenCalledWith("p2p.transactions", { filter: "sent", limit: 20 });
    });

    it("getTransaction calls p2p.transaction with id", async () => {
      const invoke = mockInvoke({ transaction: { id: "tx1" } });
      await gateway.p2p.getTransaction("tx1");
      expect(invoke).toHaveBeenCalledWith("p2p.transaction", { id: "tx1" });
    });

    it("cancelRequest calls p2p.cancelRequest with id", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.p2p.cancelRequest("tx2");
      expect(invoke).toHaveBeenCalledWith("p2p.cancelRequest", { id: "tx2" });
    });

    it("getLimits calls p2p.limits", async () => {
      const invoke = mockInvoke({ limits: { dailySendCents: 500000 } });
      await gateway.p2p.getLimits();
      expect(invoke).toHaveBeenCalledWith("p2p.limits", {});
    });
  });

  // ===========================================================================
  // INSTANT PAYMENTS
  // ===========================================================================

  describe("instantPayments", () => {
    it("send calls instantPayments.send with params", async () => {
      const invoke = mockInvoke({
        payment: { paymentId: "ip1", status: "completed", rail: "rtp" },
      });
      const params = {
        sourceAccountId: "a1",
        receiverName: "Jane Doe",
        amountCents: 10000,
        description: "Invoice #123",
        idempotencyKey: "idem-1",
        receiverRoutingNumber: "021000021",
        receiverAccountNumber: "987654321",
      };
      await gateway.instantPayments.send(params);
      expect(invoke).toHaveBeenCalledWith("instantPayments.send", params);
    });

    it("get calls instantPayments.get with paymentId", async () => {
      const invoke = mockInvoke({ payment: { paymentId: "ip1", status: "completed" } });
      await gateway.instantPayments.get("ip1");
      expect(invoke).toHaveBeenCalledWith("instantPayments.get", { paymentId: "ip1" });
    });

    it("list calls instantPayments.list with params", async () => {
      const invoke = mockInvoke({ payments: [] });
      await gateway.instantPayments.list({ accountId: "a1", direction: "outbound", limit: 10 });
      expect(invoke).toHaveBeenCalledWith("instantPayments.list", {
        accountId: "a1",
        direction: "outbound",
        limit: 10,
      });
    });

    it("checkReceiver calls instantPayments.checkReceiver with params", async () => {
      const invoke = mockInvoke({
        eligible: true,
        availableRails: ["rtp", "fednow"],
        institutionName: "Chase",
      });
      const params = { routingNumber: "021000021", accountNumber: "123456789" };
      await gateway.instantPayments.checkReceiver(params);
      expect(invoke).toHaveBeenCalledWith("instantPayments.checkReceiver", params);
    });

    it("requestForPayment calls instantPayments.requestForPayment with params", async () => {
      const invoke = mockInvoke({ rfp: { rfpId: "rfp1", status: "pending" } });
      const params = {
        requesterAccountId: "a1",
        payerRoutingNumber: "021000021",
        payerAccountNumber: "987654321",
        payerName: "John Doe",
        amountCents: 25000,
        description: "Rent",
        expiresAt: "2026-04-01T00:00:00Z",
      };
      await gateway.instantPayments.requestForPayment(params);
      expect(invoke).toHaveBeenCalledWith("instantPayments.requestForPayment", params);
    });

    it("exportISO20022 calls instantPayments.exportISO20022 with paymentId and format", async () => {
      const invoke = mockInvoke({ xml: "<xml/>", messageType: "pain.001", paymentId: "ip1" });
      await gateway.instantPayments.exportISO20022("ip1", "pain.001");
      expect(invoke).toHaveBeenCalledWith("instantPayments.exportISO20022", {
        paymentId: "ip1",
        format: "pain.001",
      });
    });

    it("getLimits calls instantPayments.limits", async () => {
      const invoke = mockInvoke({
        limits: {},
        supportedCurrencies: ["USD"],
        supportedRails: ["rtp"],
      });
      await gateway.instantPayments.getLimits();
      expect(invoke).toHaveBeenCalledWith("instantPayments.limits", {});
    });
  });
});

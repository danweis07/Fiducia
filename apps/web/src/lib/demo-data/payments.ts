/**
 * Demo data for bills, billpay, wires, stopPayments, and p2p.
 */

import {
  ActionHandler,
  TENANT_ID,
  CHECKING_ID,
  DEMO_USER,
  withPagination,
  isoDate,
  futureDate,
} from "./types";

// =============================================================================
// BILLS
// =============================================================================

const BILLS = [
  {
    id: "bill-001",
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    payeeName: "Con Edison Electric",
    payeeAccountNumberMasked: "****4478",
    amountCents: 15200,
    dueDate: futureDate(5),
    status: "scheduled" as const,
    autopay: true,
    recurringRule: {
      frequency: "monthly" as const,
      endDate: null,
      nextExecutionDate: futureDate(5),
    },
    fromAccountId: CHECKING_ID,
    paidAt: null,
    createdAt: isoDate(25),
  },
  {
    id: "bill-002",
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    payeeName: "Verizon Wireless",
    payeeAccountNumberMasked: "****2211",
    amountCents: 8999,
    dueDate: futureDate(12),
    status: "scheduled" as const,
    autopay: false,
    recurringRule: null,
    fromAccountId: CHECKING_ID,
    paidAt: null,
    createdAt: isoDate(10),
  },
  {
    id: "bill-003",
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    payeeName: "State Farm Insurance",
    payeeAccountNumberMasked: "****7765",
    amountCents: 14500,
    dueDate: isoDate(3),
    status: "paid" as const,
    autopay: true,
    recurringRule: {
      frequency: "monthly" as const,
      endDate: null,
      nextExecutionDate: futureDate(27),
    },
    fromAccountId: CHECKING_ID,
    paidAt: isoDate(3),
    createdAt: isoDate(30),
  },
];

// =============================================================================
// HANDLERS
// =============================================================================

export const paymentHandlers: Record<string, ActionHandler> = {
  // Bill Pay (simple)
  "bills.list": () => withPagination({ bills: BILLS }, BILLS.length),
  "bills.create": (p) => ({
    bill: {
      id: `bill-demo-${Date.now()}`,
      tenantId: TENANT_ID,
      userId: DEMO_USER.id,
      payeeName: p.payeeName,
      payeeAccountNumberMasked: `****${String(p.payeeAccountNumber || "0000").slice(-4)}`,
      amountCents: p.amountCents,
      dueDate: p.dueDate,
      status: "scheduled",
      autopay: p.autopay || false,
      recurringRule: p.recurringRule || null,
      fromAccountId: p.fromAccountId,
      paidAt: null,
      createdAt: new Date().toISOString(),
    },
  }),
  "bills.pay": (p) => ({
    bill: { ...BILLS[0], id: p.id, status: "paid", paidAt: new Date().toISOString() },
  }),
  "bills.cancel": () => ({ success: true }),

  // Bill Pay (adapter-backed)
  "billpay.billers.search": (p) => ({
    billers: [
      {
        billerId: "blr-att",
        name: "AT&T",
        shortName: "AT&T",
        category: "telecom",
        logoUrl: "https://logo.clearbit.com/att.com",
        supportsEBill: true,
        supportsRushPayment: true,
        processingDays: 1,
        enrollmentFields: [
          {
            name: "account_number",
            label: "Account Number",
            type: "account_number",
            required: true,
            maxLength: 12,
          },
          { name: "zip_code", label: "ZIP Code", type: "zip", required: true },
        ],
      },
      {
        billerId: "blr-pge",
        name: "Pacific Gas & Electric",
        shortName: "PG&E",
        category: "utilities",
        logoUrl: "https://logo.clearbit.com/pge.com",
        supportsEBill: true,
        supportsRushPayment: false,
        processingDays: 2,
        enrollmentFields: [
          {
            name: "account_number",
            label: "Account Number",
            type: "account_number",
            required: true,
          },
        ],
      },
      {
        billerId: "blr-comcast",
        name: "Comcast / Xfinity",
        shortName: "Xfinity",
        category: "telecom",
        logoUrl: "https://logo.clearbit.com/xfinity.com",
        supportsEBill: true,
        supportsRushPayment: true,
        processingDays: 1,
        enrollmentFields: [
          {
            name: "account_number",
            label: "Account Number",
            type: "account_number",
            required: true,
          },
        ],
      },
    ].filter((b) => !p.query || b.name.toLowerCase().includes(String(p.query).toLowerCase())),
    totalCount: 3,
  }),
  "billpay.payees.list": () => ({
    payees: [
      {
        payeeId: "pay-001",
        billerId: "blr-att",
        nickname: "AT&T Wireless",
        billerName: "AT&T",
        category: "telecom",
        accountNumberMasked: "****4521",
        eBillStatus: "active",
        nextDueDate: futureDate(12),
        nextAmountDueCents: 8599,
        logoUrl: "https://logo.clearbit.com/att.com",
        enrolledAt: isoDate(180),
        autopayEnabled: true,
      },
      {
        payeeId: "pay-002",
        billerId: "blr-pge",
        nickname: "Electric Bill",
        billerName: "Pacific Gas & Electric",
        category: "utilities",
        accountNumberMasked: "****7890",
        eBillStatus: "active",
        nextDueDate: futureDate(5),
        nextAmountDueCents: 14523,
        logoUrl: "https://logo.clearbit.com/pge.com",
        enrolledAt: isoDate(365),
        autopayEnabled: false,
      },
      {
        payeeId: "pay-003",
        billerId: "blr-comcast",
        billerName: "Comcast / Xfinity",
        category: "telecom",
        accountNumberMasked: "****3344",
        eBillStatus: "not_enrolled",
        logoUrl: "https://logo.clearbit.com/xfinity.com",
        enrolledAt: isoDate(90),
        autopayEnabled: false,
      },
    ],
  }),
  "billpay.payees.enroll": (p) => ({
    payee: {
      payeeId: `pay-${Date.now()}`,
      billerId: p.billerId,
      nickname: p.nickname || null,
      billerName: "New Payee",
      category: "other",
      accountNumberMasked: "****" + String(p.accountNumber || "0000").slice(-4),
      eBillStatus: "not_enrolled",
      enrolledAt: new Date().toISOString(),
      autopayEnabled: false,
    },
  }),
  "billpay.payments.schedule": (p) => ({
    payment: {
      paymentId: `pmt-${Date.now()}`,
      providerPaymentId: `prov-${Date.now()}`,
      payeeId: p.payeeId,
      fromAccountId: p.fromAccountId,
      amountCents: p.amountCents,
      status: "scheduled",
      scheduledDate: p.scheduledDate,
      method: p.method || "electronic",
      memo: p.memo || null,
      createdAt: new Date().toISOString(),
    },
  }),
  "billpay.payments.cancel": () => ({
    success: true,
    payment: { paymentId: "pmt-001", status: "canceled" },
  }),
  "billpay.payments.status": () => ({
    paymentId: "pmt-001",
    status: "processing",
    scheduledDate: isoDate(1),
    amountCents: 8599,
  }),
  "billpay.payments.list": () =>
    withPagination(
      {
        payments: [
          {
            paymentId: "pmt-001",
            providerPaymentId: "prov-001",
            payeeId: "pay-001",
            fromAccountId: CHECKING_ID,
            amountCents: 8599,
            status: "paid",
            scheduledDate: isoDate(15),
            processedDate: isoDate(14),
            deliveryDate: isoDate(13),
            method: "electronic",
            confirmationNumber: "CNF-001234",
            createdAt: isoDate(16),
          },
          {
            paymentId: "pmt-002",
            providerPaymentId: "prov-002",
            payeeId: "pay-002",
            fromAccountId: CHECKING_ID,
            amountCents: 14523,
            status: "scheduled",
            scheduledDate: futureDate(5),
            method: "electronic",
            createdAt: isoDate(2),
          },
          {
            paymentId: "pmt-003",
            providerPaymentId: "prov-003",
            payeeId: "pay-001",
            fromAccountId: CHECKING_ID,
            amountCents: 8599,
            status: "paid",
            scheduledDate: isoDate(45),
            processedDate: isoDate(44),
            method: "electronic",
            confirmationNumber: "CNF-001189",
            createdAt: isoDate(46),
          },
        ],
      },
      3,
    ),
  "billpay.ebills.list": () => ({
    eBills: [
      {
        eBillId: "eb-001",
        payeeId: "pay-001",
        amountCents: 8599,
        minimumPaymentCents: 8599,
        dueDate: futureDate(12),
        statementDate: isoDate(3),
        status: "unpaid",
      },
      {
        eBillId: "eb-002",
        payeeId: "pay-002",
        amountCents: 14523,
        dueDate: futureDate(5),
        statementDate: isoDate(5),
        status: "unpaid",
        balanceCents: 14523,
      },
    ],
  }),
};

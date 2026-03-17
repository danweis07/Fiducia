/**
 * Gateway Domain — Bills, BillPay, Wires, StopPayments, P2P, InstantPayments
 */

import type { CallGatewayFn, Pagination } from './client';
import type {
  Bill,
  WireTransfer,
  WireFeeSchedule,
  WireLimits,
  StopPayment,
  P2PEnrollment,
  P2PTransaction,
  P2PLimits,
} from '@/types';

export function createPaymentsDomain(callGateway: CallGatewayFn) {
  return {
    bills: {
      async list(params: { status?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ bills: Bill[]; _pagination?: Pagination }>('bills.list', params);
      },

      async create(input: {
        payeeName: string;
        payeeAccountNumber: string;
        amountCents: number;
        dueDate: string;
        fromAccountId: string;
        autopay?: boolean;
        recurringRule?: { frequency: string; endDate?: string };
      }) {
        return callGateway<{ bill: Bill }>('bills.create', input);
      },

      async pay(id: string) {
        return callGateway<{ bill: Bill }>('bills.pay', { id });
      },

      async cancel(id: string) {
        return callGateway<{ success: boolean }>('bills.cancel', { id });
      },
    },

    billpay: {
      async searchBillers(params: { query: string; category?: string; zipCode?: string; limit?: number }) {
        return callGateway<{ billers: Array<{
          billerId: string; name: string; shortName?: string; category: string;
          logoUrl?: string; supportsEBill: boolean; supportsRushPayment: boolean;
          processingDays: number; enrollmentFields: Array<{ name: string; label: string; type: string; required: boolean; pattern?: string; helpText?: string; maxLength?: number }>;
        }>; totalCount: number }>('billpay.billers.search', params);
      },

      async listPayees() {
        return callGateway<{ payees: Array<{
          payeeId: string; billerId: string; nickname?: string; billerName: string;
          category: string; accountNumberMasked: string; eBillStatus: string;
          nextDueDate?: string; nextAmountDueCents?: number; minimumPaymentCents?: number;
          accountBalanceCents?: number; logoUrl?: string; enrolledAt: string; autopayEnabled: boolean;
        }> }>('billpay.payees.list', {});
      },

      async enrollPayee(input: { billerId: string; accountNumber: string; nickname?: string; enrollmentFields?: Record<string, string> }) {
        return callGateway<{ payee: Record<string, unknown> }>('billpay.payees.enroll', input);
      },

      async schedulePayment(input: {
        payeeId: string; fromAccountId: string; amountCents: number; scheduledDate: string;
        method?: string; memo?: string; recurringRule?: { frequency: string; dayOfMonth?: number; endDate?: string };
      }) {
        return callGateway<{ payment: Record<string, unknown> }>('billpay.payments.schedule', input);
      },

      async cancelPayment(paymentId: string) {
        return callGateway<{ success: boolean; payment: Record<string, unknown> }>('billpay.payments.cancel', { paymentId });
      },

      async getPaymentStatus(paymentId: string) {
        return callGateway<Record<string, unknown>>('billpay.payments.status', { paymentId });
      },

      async listPayments(params: { payeeId?: string; status?: string; fromDate?: string; toDate?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ payments: Array<Record<string, unknown>>; _pagination?: Pagination }>('billpay.payments.list', params);
      },

      async listEBills(params: { payeeId?: string; status?: string } = {}) {
        return callGateway<{ eBills: Array<{
          eBillId: string; payeeId: string; amountCents: number; minimumPaymentCents?: number;
          dueDate: string; statementDate: string; status: string; balanceCents?: number;
        }> }>('billpay.ebills.list', params);
      },
    },

    wires: {
      async createDomestic(input: {
        fromAccountId: string; beneficiaryName: string; bankName: string;
        routingNumber: string; accountNumber: string; amountCents: number;
        memo?: string; purpose: string;
      }) {
        return callGateway<{ wire: WireTransfer }>('wires.createDomestic', input);
      },

      async createInternational(input: {
        fromAccountId: string; beneficiaryName: string; swiftCode: string;
        iban: string; bankName: string; bankCountry: string;
        amountCents: number; currency: string; memo?: string; purpose: string;
      }) {
        return callGateway<{ wire: WireTransfer }>('wires.createInternational', input);
      },

      async list(params: { status?: string; type?: string; fromDate?: string; toDate?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ wires: WireTransfer[]; _pagination?: Pagination }>('wires.list', params);
      },

      async get(id: string) {
        return callGateway<{ wire: WireTransfer }>('wires.get', { id });
      },

      async cancel(id: string) {
        return callGateway<{ success: boolean }>('wires.cancel', { id });
      },

      async fees() {
        return callGateway<{ fees: WireFeeSchedule }>('wires.fees', {});
      },

      async limits() {
        return callGateway<{ limits: WireLimits }>('wires.limits', {});
      },
    },

    stopPayments: {
      async create(input: {
        accountId: string; checkNumber: string; checkNumberEnd?: string;
        payeeName?: string; amountCents?: number;
        amountRangeLowCents?: number; amountRangeHighCents?: number;
        reason: string; duration: '6months' | '12months' | 'permanent';
      }) {
        return callGateway<{ stopPayment: StopPayment }>('stopPayments.create', input);
      },

      async list(params: { status?: string; accountId?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ stopPayments: StopPayment[]; _pagination?: Pagination }>('stopPayments.list', params);
      },

      async get(id: string) {
        return callGateway<{ stopPayment: StopPayment }>('stopPayments.get', { id });
      },

      async cancel(id: string) {
        return callGateway<{ success: boolean }>('stopPayments.cancel', { id });
      },

      async renew(stopPaymentId: string, duration: '6months' | '12months' | 'permanent') {
        return callGateway<{ stopPayment: StopPayment }>('stopPayments.renew', { stopPaymentId, duration });
      },

      async fee() {
        return callGateway<{ feeCents: number }>('stopPayments.fee', {});
      },
    },

    p2p: {
      async enroll(params: { accountId: string; enrollmentType: 'email' | 'phone'; enrollmentValue: string }) {
        return callGateway<{ enrollment: P2PEnrollment }>('p2p.enroll', params);
      },
      async getEnrollment() {
        return callGateway<{ enrollment: P2PEnrollment | null }>('p2p.enrollment', {});
      },
      async unenroll() {
        return callGateway<{ success: boolean }>('p2p.unenroll', {});
      },
      async send(params: { recipientType: 'email' | 'phone' | 'token'; recipientValue: string; amountCents: number; memo?: string }) {
        return callGateway<{ transaction: P2PTransaction }>('p2p.send', params);
      },
      async requestMoney(params: { recipientType: 'email' | 'phone' | 'token'; recipientValue: string; amountCents: number; memo?: string }) {
        return callGateway<{ transaction: P2PTransaction }>('p2p.request', params);
      },
      async listTransactions(params: { filter?: 'sent' | 'received' | 'requests'; limit?: number; offset?: number } = {}) {
        return callGateway<{ transactions: P2PTransaction[]; _pagination?: Pagination }>('p2p.transactions', params);
      },
      async getTransaction(id: string) {
        return callGateway<{ transaction: P2PTransaction }>('p2p.transaction', { id });
      },
      async cancelRequest(id: string) {
        return callGateway<{ success: boolean }>('p2p.cancelRequest', { id });
      },
      async getLimits() {
        return callGateway<{ limits: P2PLimits }>('p2p.limits', {});
      },
    },

    instantPayments: {
      async send(params: { sourceAccountId: string; receiverName: string; amountCents: number; description: string; idempotencyKey: string; receiverRoutingNumber?: string; receiverAccountNumber?: string; preferredRail?: string; receiverIBAN?: string; receiverBIC?: string; pixKey?: string; pixKeyType?: string; receiverVPA?: string }) {
        return callGateway<{ payment: { paymentId: string; status: string; rail: string; amountCents: number; createdAt: string } }>('instantPayments.send', params);
      },
      async get(paymentId: string) {
        return callGateway<{ payment: { paymentId: string; status: string; rail: string; amountCents: number; senderName: string; receiverName: string; createdAt: string; completedAt: string | null } }>('instantPayments.get', { paymentId });
      },
      async list(params: { accountId?: string; direction?: string; status?: string; startDate?: string; endDate?: string; limit?: number } = {}) {
        return callGateway<{ payments: Array<{ paymentId: string; status: string; rail: string; amountCents: number; direction: string; createdAt: string }> }>('instantPayments.list', params);
      },
      async checkReceiver(params: { routingNumber?: string; accountNumber?: string; receiverIBAN?: string; pixKey?: string; receiverVPA?: string }) {
        return callGateway<{ eligible: boolean; availableRails: string[]; institutionName: string | null }>('instantPayments.checkReceiver', params);
      },
      async requestForPayment(params: { requesterAccountId: string; payerRoutingNumber: string; payerAccountNumber: string; payerName: string; amountCents: number; description: string; expiresAt: string; preferredRail?: string }) {
        return callGateway<{ rfp: { rfpId: string; status: string; amountCents: number; expiresAt: string; createdAt: string } }>('instantPayments.requestForPayment', params);
      },
      async exportISO20022(paymentId: string, format?: 'pain.001' | 'pacs.008') {
        return callGateway<{ xml: string; messageType: string; paymentId: string }>('instantPayments.exportISO20022', { paymentId, format });
      },
      async getLimits() {
        return callGateway<{ limits: import('@/types').InstantPaymentLimits; supportedCurrencies: string[]; supportedRails: string[] }>('instantPayments.limits', {});
      },
    },
  };
}

/**
 * Mock Bill Pay Adapter
 *
 * Sandbox implementation with realistic biller directory and payment lifecycle.
 * Simulates Fiserv CheckFree-like behavior for development and demos.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  BillPayAdapter,
  Biller,
  Payee,
  Payment,
  SearchBillersRequest,
  SearchBillersResponse,
  EnrollPayeeRequest,
  EnrollPayeeResponse,
  ListPayeesRequest,
  ListPayeesResponse,
  SchedulePaymentRequest,
  SchedulePaymentResponse,
  CancelPaymentRequest,
  CancelPaymentResponse,
  GetPaymentStatusRequest,
  ListPaymentsRequest,
  ListPaymentsResponse,
  ListEBillsRequest,
  ListEBillsResponse,
} from './types.ts';

// =============================================================================
// MOCK BILLER DIRECTORY
// =============================================================================

const MOCK_BILLERS: Biller[] = [
  {
    billerId: 'blr_att',
    name: 'AT&T',
    shortName: 'AT&T',
    category: 'telecom',
    supportsEBill: true,
    supportsRushPayment: true,
    processingDays: 2,
    enrollmentFields: [
      { name: 'accountNumber', label: 'AT&T Account Number', type: 'account_number', required: true, maxLength: 12 },
      { name: 'zipCode', label: 'Service ZIP Code', type: 'zip', required: true },
    ],
  },
  {
    billerId: 'blr_pge',
    name: 'Pacific Gas & Electric (PG&E)',
    shortName: 'PG&E',
    category: 'utilities',
    supportsEBill: true,
    supportsRushPayment: false,
    processingDays: 3,
    enrollmentFields: [
      { name: 'accountNumber', label: 'PG&E Account Number', type: 'account_number', required: true, maxLength: 10 },
    ],
  },
  {
    billerId: 'blr_comcast',
    name: 'Comcast / Xfinity',
    shortName: 'Xfinity',
    category: 'telecom',
    supportsEBill: true,
    supportsRushPayment: true,
    processingDays: 2,
    enrollmentFields: [
      { name: 'accountNumber', label: 'Comcast Account Number', type: 'account_number', required: true },
      { name: 'phone', label: 'Phone on Account', type: 'phone', required: false },
    ],
  },
  {
    billerId: 'blr_chase_cc',
    name: 'Chase Credit Card',
    shortName: 'Chase CC',
    category: 'credit_card',
    supportsEBill: true,
    supportsRushPayment: true,
    processingDays: 1,
    enrollmentFields: [
      { name: 'accountNumber', label: 'Credit Card Number (last 4)', type: 'account_number', required: true, maxLength: 4 },
    ],
  },
  {
    billerId: 'blr_statefarm',
    name: 'State Farm Insurance',
    shortName: 'State Farm',
    category: 'insurance',
    supportsEBill: false,
    supportsRushPayment: false,
    processingDays: 5,
    enrollmentFields: [
      { name: 'policyNumber', label: 'Policy Number', type: 'text', required: true },
      { name: 'zipCode', label: 'ZIP Code', type: 'zip', required: true },
    ],
  },
  {
    billerId: 'blr_water',
    name: 'City Water & Sewer',
    shortName: 'Water',
    category: 'utilities',
    supportsEBill: false,
    supportsRushPayment: false,
    processingDays: 5,
    enrollmentFields: [
      { name: 'accountNumber', label: 'Account Number', type: 'account_number', required: true },
    ],
  },
  {
    billerId: 'blr_tmobile',
    name: 'T-Mobile',
    shortName: 'T-Mobile',
    category: 'telecom',
    supportsEBill: true,
    supportsRushPayment: true,
    processingDays: 2,
    enrollmentFields: [
      { name: 'accountNumber', label: 'T-Mobile Account Number', type: 'account_number', required: true },
    ],
  },
  {
    billerId: 'blr_geico',
    name: 'GEICO Auto Insurance',
    shortName: 'GEICO',
    category: 'insurance',
    supportsEBill: true,
    supportsRushPayment: false,
    processingDays: 3,
    enrollmentFields: [
      { name: 'policyNumber', label: 'Policy Number', type: 'text', required: true },
    ],
  },
];

// In-memory stores for sandbox
const payees = new Map<string, Payee>();
const payments = new Map<string, Payment>();

export class MockBillPayAdapter implements BillPayAdapter {
  readonly config: AdapterConfig = {
    id: 'mock',
    name: 'Mock Bill Pay (Sandbox)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async searchBillers(request: SearchBillersRequest): Promise<SearchBillersResponse> {
    const query = request.query.toLowerCase();
    const limit = request.limit ?? 20;

    let results = MOCK_BILLERS.filter(b =>
      b.name.toLowerCase().includes(query) ||
      b.shortName?.toLowerCase().includes(query) ||
      b.category === query
    );

    if (request.category) {
      results = results.filter(b => b.category === request.category);
    }

    return {
      billers: results.slice(0, limit),
      totalCount: results.length,
    };
  }

  async enrollPayee(request: EnrollPayeeRequest): Promise<EnrollPayeeResponse> {
    const biller = MOCK_BILLERS.find(b => b.billerId === request.billerId);
    if (!biller) {
      throw new Error(`Biller not found: ${request.billerId}`);
    }

    const payeeId = `pay_${Date.now().toString(36)}`;
    const maskedAcct = request.accountNumber.length > 4
      ? `****${request.accountNumber.slice(-4)}`
      : `****${request.accountNumber}`;

    const payee: Payee = {
      payeeId,
      billerId: request.billerId,
      nickname: request.nickname,
      billerName: biller.name,
      category: biller.category,
      accountNumberMasked: maskedAcct,
      eBillStatus: biller.supportsEBill ? 'pending' : 'not_enrolled',
      enrolledAt: new Date().toISOString(),
      autopayEnabled: false,
    };

    payees.set(payeeId, payee);

    return { payee };
  }

  async listPayees(_request: ListPayeesRequest): Promise<ListPayeesResponse> {
    return { payees: Array.from(payees.values()) };
  }

  async schedulePayment(request: SchedulePaymentRequest): Promise<SchedulePaymentResponse> {
    const paymentId = `pmt_${Date.now().toString(36)}`;

    const payment: Payment = {
      paymentId,
      providerPaymentId: `MOCK-${paymentId}`,
      payeeId: request.payeeId,
      fromAccountId: request.fromAccountId,
      amountCents: request.amountCents,
      status: 'scheduled',
      scheduledDate: request.scheduledDate,
      method: request.method ?? 'electronic',
      memo: request.memo,
      recurringRule: request.recurringRule,
      createdAt: new Date().toISOString(),
      confirmationNumber: `CNF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    };

    payments.set(paymentId, payment);

    return { payment };
  }

  async cancelPayment(request: CancelPaymentRequest): Promise<CancelPaymentResponse> {
    const payment = payments.get(request.paymentId);
    if (!payment) throw new Error(`Payment not found: ${request.paymentId}`);

    payment.status = 'canceled';
    return { success: true, payment };
  }

  async getPaymentStatus(request: GetPaymentStatusRequest): Promise<Payment> {
    const payment = payments.get(request.paymentId);
    if (!payment) throw new Error(`Payment not found: ${request.paymentId}`);

    // Simulate lifecycle progression
    const created = new Date(payment.createdAt).getTime();
    const elapsed = Date.now() - created;

    if (payment.status === 'scheduled' && elapsed > 60_000) {
      payment.status = 'processing';
      payment.processedDate = new Date().toISOString();
    }
    if (payment.status === 'processing' && elapsed > 120_000) {
      payment.status = 'paid';
      payment.deliveryDate = new Date().toISOString();
    }

    return payment;
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    let results = Array.from(payments.values());

    if (request.payeeId) results = results.filter(p => p.payeeId === request.payeeId);
    if (request.status) results = results.filter(p => p.status === request.status);

    const offset = request.offset ?? 0;
    const limit = request.limit ?? 50;

    return {
      payments: results.slice(offset, offset + limit),
      totalCount: results.length,
    };
  }

  async listEBills(_request: ListEBillsRequest): Promise<ListEBillsResponse> {
    // Generate mock e-bills for enrolled payees
    const enrolledPayees = Array.from(payees.values()).filter(p => p.eBillStatus === 'active');

    return {
      eBills: enrolledPayees.map(p => ({
        eBillId: `eb_${p.payeeId}`,
        payeeId: p.payeeId,
        amountCents: Math.floor(Math.random() * 30000) + 2000,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        statementDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        status: 'unpaid',
      })),
    };
  }
}

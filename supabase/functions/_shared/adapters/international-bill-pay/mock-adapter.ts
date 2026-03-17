/**
 * Mock International Bill Pay Adapter
 *
 * Returns synthetic data for development and testing.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  InternationalBillPayAdapter,
  InternationalBiller,
  InternationalBillPayment,
  SearchInternationalBillersRequest,
  SearchInternationalBillersResponse,
  PayInternationalBillRequest,
  GetInternationalBillPaymentRequest,
  ListInternationalBillPaymentsRequest,
  ListInternationalBillPaymentsResponse,
  GetSupportedCountriesRequest,
  GetSupportedCountriesResponse,
} from './types.ts';

const MOCK_BILLERS: InternationalBiller[] = [
  { billerId: 'ib_edf_fr', name: 'EDF (Électricité de France)', country: 'FR', currency: 'EUR', category: 'utilities', supportsInstantPayment: true, supportsCashPayment: false, requiredFields: [{ name: 'contract_number', label: 'Contract Number', type: 'account_number', required: true }], processingTimeHours: 1 },
  { billerId: 'ib_bt_gb', name: 'British Telecom', country: 'GB', currency: 'GBP', category: 'telecom', supportsInstantPayment: true, supportsCashPayment: false, requiredFields: [{ name: 'account_number', label: 'Account Number', type: 'account_number', required: true }], processingTimeHours: 2 },
  { billerId: 'ib_vattenfall_de', name: 'Vattenfall', country: 'DE', currency: 'EUR', category: 'utilities', supportsInstantPayment: true, supportsCashPayment: false, requiredFields: [{ name: 'kundennummer', label: 'Customer Number', type: 'account_number', required: true }], processingTimeHours: 1 },
  { billerId: 'ib_singtel_sg', name: 'Singtel', country: 'SG', currency: 'SGD', category: 'telecom', supportsInstantPayment: true, supportsCashPayment: false, requiredFields: [{ name: 'account_number', label: 'Account Number', type: 'account_number', required: true }], processingTimeHours: 4 },
  { billerId: 'ib_iras_sg', name: 'IRAS (Tax Authority)', country: 'SG', currency: 'SGD', category: 'government', supportsInstantPayment: false, supportsCashPayment: false, requiredFields: [{ name: 'tax_reference', label: 'Tax Reference', type: 'reference', required: true }], processingTimeHours: 24 },
  { billerId: 'ib_enel_it', name: 'Enel Energia', country: 'IT', currency: 'EUR', category: 'utilities', supportsInstantPayment: true, supportsCashPayment: true, requiredFields: [{ name: 'codice_cliente', label: 'Client Code', type: 'account_number', required: true }], processingTimeHours: 2 },
  { billerId: 'ib_telmex_mx', name: 'Telmex', country: 'MX', currency: 'MXN', category: 'telecom', supportsInstantPayment: false, supportsCashPayment: true, requiredFields: [{ name: 'phone_number', label: 'Phone Number', type: 'phone', required: true }], processingTimeHours: 24 },
  { billerId: 'ib_jio_in', name: 'Jio (Reliance)', country: 'IN', currency: 'INR', category: 'telecom', supportsInstantPayment: true, supportsCashPayment: true, requiredFields: [{ name: 'mobile_number', label: 'Mobile Number', type: 'phone', required: true }], processingTimeHours: 1 },
];

export class MockInternationalBillPayAdapter implements InternationalBillPayAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-international-bill-pay',
    name: 'Mock International Bill Pay',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
  }

  async searchBillers(request: SearchInternationalBillersRequest): Promise<SearchInternationalBillersResponse> {
    let billers = MOCK_BILLERS;
    if (request.country) billers = billers.filter(b => b.country === request.country);
    if (request.category) billers = billers.filter(b => b.category === request.category);
    if (request.query) {
      const q = request.query.toLowerCase();
      billers = billers.filter(b => b.name.toLowerCase().includes(q) || b.country.toLowerCase().includes(q));
    }
    const limit = request.limit ?? 20;
    return { billers: billers.slice(0, limit), total: billers.length };
  }

  async payBill(request: PayInternationalBillRequest): Promise<InternationalBillPayment> {
    const biller = MOCK_BILLERS.find(b => b.billerId === request.billerId) ?? MOCK_BILLERS[0];
    const fxRate = request.fromCurrency === biller.currency ? 1 : 0.92;
    const toAmount = Math.round(request.amountCents * fxRate);
    const feeCents = Math.max(Math.round(request.amountCents * 0.005), 50);

    return {
      paymentId: `ibp_mock_${Date.now()}`,
      billerId: request.billerId,
      billerName: biller.name,
      billerCountry: biller.country,
      fromCurrency: request.fromCurrency,
      fromAmountCents: request.amountCents,
      toCurrency: biller.currency,
      toAmountCents: toAmount,
      exchangeRate: fxRate,
      feeAmountCents: feeCents,
      feeCurrency: request.fromCurrency,
      rail: request.rail ?? (biller.supportsInstantPayment ? 'sepa_instant' : 'local_push'),
      status: 'processing',
      referenceNumber: `REF-${Date.now()}`,
      accountReference: request.accountReference,
      estimatedDelivery: new Date(Date.now() + biller.processingTimeHours * 3600000).toISOString(),
      deliveredAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async getPayment(request: GetInternationalBillPaymentRequest): Promise<InternationalBillPayment> {
    return {
      paymentId: request.paymentId,
      billerId: 'ib_edf_fr',
      billerName: 'EDF (Électricité de France)',
      billerCountry: 'FR',
      fromCurrency: 'USD',
      fromAmountCents: 15000,
      toCurrency: 'EUR',
      toAmountCents: 13800,
      exchangeRate: 0.92,
      feeAmountCents: 75,
      feeCurrency: 'USD',
      rail: 'sepa_instant',
      status: 'paid',
      referenceNumber: 'REF-12345',
      accountReference: '****5678',
      estimatedDelivery: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    };
  }

  async listPayments(request: ListInternationalBillPaymentsRequest): Promise<ListInternationalBillPaymentsResponse> {
    const now = new Date();
    const payments: InternationalBillPayment[] = Array.from({ length: 4 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 7);
      const billers = MOCK_BILLERS.slice(0, 4);
      const biller = billers[i];
      return {
        paymentId: `ibp_mock_${i + 1}`,
        billerId: biller.billerId,
        billerName: biller.name,
        billerCountry: biller.country,
        fromCurrency: 'USD',
        fromAmountCents: (i + 1) * 8500,
        toCurrency: biller.currency,
        toAmountCents: Math.round((i + 1) * 8500 * 0.92),
        exchangeRate: 0.92,
        feeAmountCents: Math.max((i + 1) * 42, 50),
        feeCurrency: 'USD',
        rail: biller.supportsInstantPayment ? 'sepa_instant' as const : 'local_push' as const,
        status: i === 0 ? 'processing' as const : 'paid' as const,
        referenceNumber: `REF-${1000 + i}`,
        accountReference: `****${3000 + i}`,
        estimatedDelivery: new Date(date.getTime() + biller.processingTimeHours * 3600000).toISOString(),
        deliveredAt: i > 0 ? date.toISOString() : null,
        createdAt: date.toISOString(),
      };
    });

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { payments: payments.slice(offset, offset + limit), total: payments.length };
  }

  async getSupportedCountries(_request: GetSupportedCountriesRequest): Promise<GetSupportedCountriesResponse> {
    const countryMap = new Map<string, { countryCode: string; countryName: string; currency: string; count: number; instant: boolean }>();
    for (const b of MOCK_BILLERS) {
      const existing = countryMap.get(b.country);
      if (existing) {
        existing.count++;
        if (b.supportsInstantPayment) existing.instant = true;
      } else {
        const names: Record<string, string> = { FR: 'France', GB: 'United Kingdom', DE: 'Germany', SG: 'Singapore', IT: 'Italy', MX: 'Mexico', IN: 'India' };
        countryMap.set(b.country, { countryCode: b.country, countryName: names[b.country] ?? b.country, currency: b.currency, count: 1, instant: b.supportsInstantPayment });
      }
    }
    return {
      countries: Array.from(countryMap.values()).map(c => ({
        countryCode: c.countryCode,
        countryName: c.countryName,
        currency: c.currency,
        billerCount: c.count,
        supportsInstant: c.instant,
      })),
    };
  }
}

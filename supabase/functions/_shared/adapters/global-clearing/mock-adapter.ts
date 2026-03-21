/**
 * Mock Global Clearing Adapter
 *
 * Deterministic cross-border clearing for development and testing.
 * Returns synthetic virtual accounts, FX quotes, and payment data.
 */

import type { AdapterConfig, AdapterHealth } from "../types.ts";
import {
  DEFAULT_RETRY_CONFIG,
  DEFAULT_TIMEOUT_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from "../types.ts";
import { secureRandomDigits } from "../../secure-random.ts";
import type {
  GlobalClearingAdapter,
  CreateVirtualAccountRequest,
  VirtualAccount,
  ListVirtualAccountsRequest,
  ListVirtualAccountsResponse,
  GetFXQuoteRequest,
  FXQuote,
  ExecuteFXConversionRequest,
  FXConversion,
  SendCrossBorderPaymentRequest,
  CrossBorderPayment,
  GetPaymentRequest,
  ListPaymentsRequest,
  ListPaymentsResponse,
  ListSupportedCurrenciesResponse,
} from "./types.ts";

// =============================================================================
// MOCK FX RATES (vs USD)
// =============================================================================

const MOCK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CHF: 0.88,
  JPY: 149.5,
  CAD: 1.36,
  AUD: 1.53,
  SGD: 1.34,
  HKD: 7.82,
  SEK: 10.45,
  NOK: 10.72,
  DKK: 6.87,
  PLN: 3.97,
  CZK: 23.15,
  BRL: 4.97,
  INR: 83.12,
  MXN: 17.15,
  ZAR: 18.65,
  CNY: 7.24,
  KRW: 1325.0,
};

function getRate(from: string, to: string): number {
  const fromUsd = MOCK_RATES[from] ?? 1;
  const toUsd = MOCK_RATES[to] ?? 1;
  return toUsd / fromUsd;
}

// =============================================================================
// IN-MEMORY STORES
// =============================================================================

const accountStore = new Map<string, VirtualAccount>();
const paymentStore = new Map<string, CrossBorderPayment>();

// =============================================================================
// ADAPTER
// =============================================================================

export class MockGlobalClearingAdapter implements GlobalClearingAdapter {
  readonly config: AdapterConfig = {
    id: "mock-global-clearing",
    name: "Mock Global Clearing",
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: "closed",
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async createVirtualAccount(request: CreateVirtualAccountRequest): Promise<VirtualAccount> {
    await new Promise((r) => setTimeout(r, 300));
    const id = `mock_va_${crypto.randomUUID()}`;
    const iban = `${request.country}00MOCK${secureRandomDigits(16)}`;
    const account: VirtualAccount = {
      accountId: id,
      externalId: `ext_${id}`,
      ibanMasked: `${iban.slice(0, 4)}****${iban.slice(-4)}`,
      bic: "MOCKBIC0",
      holderName: request.holderName,
      currency: request.currency,
      balanceMinorUnits: 0,
      availableBalanceMinorUnits: 0,
      status: "active",
      country: request.country,
      availableRails:
        request.country === "GB"
          ? ["faster_payments", "bacs", "chaps", "swift"]
          : ["sepa", "sepa_instant", "swift"],
      createdAt: new Date().toISOString(),
    };
    accountStore.set(id, account);
    return account;
  }

  async listVirtualAccounts(
    request: ListVirtualAccountsRequest,
  ): Promise<ListVirtualAccountsResponse> {
    await new Promise((r) => setTimeout(r, 100));
    let accounts = Array.from(accountStore.values());
    if (request.currency) accounts = accounts.filter((a) => a.currency === request.currency);
    if (request.status) accounts = accounts.filter((a) => a.status === request.status);
    const total = accounts.length;
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 25;
    return { accounts: accounts.slice(offset, offset + limit), total };
  }

  async getFXQuote(request: GetFXQuoteRequest): Promise<FXQuote> {
    await new Promise((r) => setTimeout(r, 200));
    const rate = getRate(request.sourceCurrency, request.targetCurrency);
    const targetAmount = Math.round(request.sourceAmountMinorUnits * rate);
    const fee = Math.round(request.sourceAmountMinorUnits * 0.003); // 0.3% fee
    const now = new Date();
    return {
      quoteId: `mock_quote_${crypto.randomUUID()}`,
      sourceCurrency: request.sourceCurrency,
      targetCurrency: request.targetCurrency,
      rate,
      inverseRate: 1 / rate,
      sourceAmountMinorUnits: request.sourceAmountMinorUnits,
      targetAmountMinorUnits: targetAmount,
      feeMinorUnits: fee,
      expiresAt: new Date(now.getTime() + 30000).toISOString(),
      createdAt: now.toISOString(),
    };
  }

  async executeFXConversion(request: ExecuteFXConversionRequest): Promise<FXConversion> {
    await new Promise((r) => setTimeout(r, 500));
    const now = new Date();
    return {
      conversionId: `mock_conv_${crypto.randomUUID()}`,
      quoteId: request.quoteId,
      sourceCurrency: "USD",
      targetCurrency: "EUR",
      rate: 0.92,
      sourceAmountMinorUnits: 100000,
      targetAmountMinorUnits: 92000,
      feeMinorUnits: 300,
      status: "completed",
      completedAt: now.toISOString(),
      createdAt: now.toISOString(),
    };
  }

  async sendPayment(request: SendCrossBorderPaymentRequest): Promise<CrossBorderPayment> {
    await new Promise((r) => setTimeout(r, 800));
    const now = new Date();
    const targetCurrency = request.targetCurrency ?? "EUR";
    const rate = getRate("USD", targetCurrency);
    const ibanLast4 = request.beneficiaryIban.slice(-4);
    const payment: CrossBorderPayment = {
      paymentId: `mock_cbp_${crypto.randomUUID()}`,
      sourceAccountId: request.sourceAccountId,
      sourceCurrency: "USD",
      sourceAmountMinorUnits: request.amountMinorUnits,
      beneficiaryName: request.beneficiaryName,
      beneficiaryIbanMasked: `****${ibanLast4}`,
      beneficiaryBic: request.beneficiaryBic,
      beneficiaryCountry: request.beneficiaryCountry,
      targetCurrency,
      targetAmountMinorUnits: Math.round(request.amountMinorUnits * rate),
      fxRate: rate !== 1 ? rate : null,
      feeMinorUnits: Math.round(request.amountMinorUnits * 0.003),
      rail: request.preferredRail ?? "sepa",
      reference: request.reference,
      status: "processing",
      statusReason: null,
      createdAt: now.toISOString(),
      completedAt: null,
    };
    paymentStore.set(payment.paymentId, payment);
    return payment;
  }

  async getPayment(request: GetPaymentRequest): Promise<CrossBorderPayment> {
    await new Promise((r) => setTimeout(r, 100));
    const payment = paymentStore.get(request.paymentId);
    if (!payment) throw new Error(`Payment not found: ${request.paymentId}`);
    return payment;
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    await new Promise((r) => setTimeout(r, 100));
    let payments = Array.from(paymentStore.values());
    if (request.sourceAccountId)
      payments = payments.filter((p) => p.sourceAccountId === request.sourceAccountId);
    if (request.status) payments = payments.filter((p) => p.status === request.status);
    const total = payments.length;
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 25;
    return { payments: payments.slice(offset, offset + limit), total };
  }

  async listSupportedCurrencies(): Promise<ListSupportedCurrenciesResponse> {
    return {
      currencies: Object.keys(MOCK_RATES).map((code) => ({
        code,
        name: code,
        minorUnits: code === "JPY" || code === "KRW" ? 0 : 2,
        availableRails: ["sepa", "swift"] as import("./types.ts").ClearingRail[],
      })),
    };
  }
}

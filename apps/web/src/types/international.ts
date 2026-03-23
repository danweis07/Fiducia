/**
 * International Types
 *
 * International payments, FX, country coverage, global cards, payouts,
 * international bill pay, international loans, BaaS, alias payments,
 * currency pots, and regulatory transparency.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// INTERNATIONAL PAYMENTS
// =============================================================================

export type InternationalPaymentStatus =
  | "pending"
  | "processing"
  | "requires_action"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded";
export type PaymentRail =
  | "swift"
  | "sepa"
  | "sepa_instant"
  | "faster_payments"
  | "ach"
  | "wire"
  | "local_rails"
  | "card";
export type SupportedRegion = "us" | "eu" | "uk" | "apac" | "latam" | "mena" | "africa";

export interface InternationalPayment {
  paymentId: string;
  fromAccountId: string;
  fromCurrency: string;
  fromAmountCents: number;
  toCurrency: string;
  toAmountCents: number;
  exchangeRate: number;
  feeAmountCents: number;
  feeCurrency: string;
  rail: PaymentRail;
  status: InternationalPaymentStatus;
  beneficiaryName: string;
  beneficiaryCountry: string;
  beneficiaryAccountMasked: string;
  swiftBic?: string;
  iban?: string;
  reference?: string;
  estimatedArrival?: string;
  completedAt: string | null;
  createdAt: string;
}

export interface FXQuote {
  quoteId: string;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  inverseRate: number;
  fromAmountCents: number;
  toAmountCents: number;
  feeAmountCents: number;
  feeCurrency: string;
  expiresAt: string;
}

export interface CountryCoverage {
  countryCode: string;
  countryName: string;
  region: SupportedRegion;
  currencyCode: string;
  supportsPaymentAcceptance: boolean;
  supportsCardIssuing: boolean;
  supportsPayouts: boolean;
  localPaymentMethods: string[];
}

export interface GlobalIssuedCard {
  cardId: string;
  type: "virtual" | "physical";
  status: "active" | "inactive" | "frozen" | "cancelled" | "pending";
  lastFour: string;
  cardholderName: string;
  currency: string;
  country: string;
  spendLimitCents: number;
  spendLimitInterval: string;
  totalSpentCents: number;
  network: "visa" | "mastercard";
  expirationMonth: number;
  expirationYear: number;
  metadata: Record<string, string>;
  createdAt: string;
}

export type PayoutStatus = "pending" | "in_transit" | "paid" | "failed" | "cancelled";

export interface InternationalPayout {
  payoutId: string;
  destinationCountry: string;
  destinationCurrency: string;
  amountCents: number;
  feeAmountCents: number;
  status: PayoutStatus;
  rail: PaymentRail;
  recipientName: string;
  recipientAccountMasked: string;
  estimatedArrival: string;
  paidAt: string | null;
  createdAt: string;
}

// =============================================================================
// INTERNATIONAL BILL PAY
// =============================================================================

export interface InternationalBiller {
  billerId: string;
  name: string;
  country: string;
  currency: string;
  category: string;
  logoUrl?: string;
  supportsInstantPayment: boolean;
  supportsCashPayment: boolean;
  processingTimeHours: number;
}

export interface InternationalBillPayment {
  paymentId: string;
  billerId: string;
  billerName: string;
  billerCountry: string;
  fromCurrency: string;
  fromAmountCents: number;
  toCurrency: string;
  toAmountCents: number;
  exchangeRate: number;
  feeAmountCents: number;
  feeCurrency: string;
  rail: string;
  status: string;
  referenceNumber: string;
  accountReference: string;
  estimatedDelivery: string;
  deliveredAt: string | null;
  createdAt: string;
}

// =============================================================================
// INTERNATIONAL LOANS
// =============================================================================

export type InternationalLoanStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "conditionally_approved"
  | "denied"
  | "withdrawn"
  | "funded";

export interface InternationalLoanApplication {
  id: string;
  country: string;
  currency: string;
  productType: string;
  requestedAmountCents: number;
  approvedAmountCents?: number;
  termMonths?: number;
  interestRateBps?: number;
  status: InternationalLoanStatus;
  applicantName: string;
  complianceStatus: string;
  creditScore?: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// BANKING-AS-A-SERVICE (BaaS)
// =============================================================================

export type BaaSAccountStatus = "active" | "pending" | "frozen" | "closed";

export interface BaaSAccount {
  accountId: string;
  country: string;
  currency: string;
  accountType: string;
  accountHolderName: string;
  iban?: string;
  sortCode?: string;
  accountNumber?: string;
  balanceCents: number;
  availableBalanceCents: number;
  status: BaaSAccountStatus;
  partnerBank: string;
  createdAt: string;
}

// =============================================================================
// ALIAS-FIRST PAYMENTS (Global Alias Resolution + Request-to-Pay)
// =============================================================================

export type AliasType = "phone" | "email" | "tax_id" | "upi_vpa" | "pix_key" | "proxy_id";

export type AliasDirectoryRegion = "us" | "uk" | "eu" | "br" | "in" | "sg" | "au" | "mx";

export interface AliasResolution {
  aliasId: string;
  aliasType: AliasType;
  aliasValue: string;
  resolvedName: string;
  resolvedInstitution: string;
  resolvedAccountMasked: string;
  resolvedIban?: string;
  resolvedSortCode?: string;
  resolvedRoutingNumber?: string;
  country: string;
  currency: string;
  availableRails: string[];
  directory: string;
  resolvedAt: string;
  expiresAt: string;
}

export type RequestToPayStatus = "pending" | "approved" | "declined" | "expired" | "cancelled";

export interface RequestToPayInbound {
  requestId: string;
  requesterName: string;
  requesterAlias: string;
  requesterAliasType: AliasType;
  requesterInstitution: string;
  amountCents: number;
  currency: string;
  description: string;
  reference: string;
  status: RequestToPayStatus;
  expiresAt: string;
  createdAt: string;
  respondedAt: string | null;
}

export interface RequestToPayOutbound {
  requestId: string;
  payerName: string;
  payerAlias: string;
  payerAliasType: AliasType;
  amountCents: number;
  currency: string;
  description: string;
  reference: string;
  status: RequestToPayStatus;
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
}

// =============================================================================
// MULTI-CURRENCY POTS & vIBAN MANAGER
// =============================================================================

export type CurrencyPotStatus = "active" | "frozen" | "closed";

export interface CurrencyPot {
  potId: string;
  memberId: string;
  currency: string;
  currencyName: string;
  balanceCents: number;
  availableBalanceCents: number;
  status: CurrencyPotStatus;
  viban: VirtualIBAN | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VirtualIBAN {
  vibanId: string;
  potId: string;
  country: string;
  currency: string;
  iban: string;
  bic: string;
  sortCode?: string;
  accountNumber?: string;
  routingNumber?: string;
  bankName: string;
  status: "active" | "suspended" | "closed";
  createdAt: string;
}

export interface FXSwap {
  swapId: string;
  fromPotId: string;
  toPotId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmountCents: number;
  toAmountCents: number;
  exchangeRate: number;
  inverseRate: number;
  feeAmountCents: number;
  feeCurrency: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  executedAt: string | null;
  createdAt: string;
}

export interface FXSwapQuote {
  quoteId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmountCents: number;
  toAmountCents: number;
  exchangeRate: number;
  inverseRate: number;
  midMarketRate: number;
  markup: number;
  feeAmountCents: number;
  feeCurrency: string;
  expiresAt: string;
}

// =============================================================================
// REGULATORY TRANSPARENCY WIDGETS
// =============================================================================

export interface SafeguardingInfo {
  custodianName: string;
  custodianType: string;
  protectionScheme: string;
  protectionLimit: string;
  protectionCurrency: string;
  regulatoryBody: string;
  country: string;
  lastAuditDate: string;
  certificateUrl?: string;
}

export interface InterestWithholdingEntry {
  entryId: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  grossInterestCents: number;
  taxWithheldCents: number;
  netInterestCents: number;
  withholdingRateBps: number;
  currency: string;
  taxAuthority: string;
  jurisdiction: string;
  paidAt: string;
}

export interface CarbonFootprint {
  transactionId: string;
  merchantName: string;
  category: string;
  carbonKg: number;
  carbonRating: "low" | "medium" | "high" | "very_high";
  treesEquivalent: number;
  countryAvgKg: number;
  calculationMethod: string;
  offsetAvailable: boolean;
}

export interface CarbonSummary {
  periodStart: string;
  periodEnd: string;
  totalCarbonKg: number;
  transactionCount: number;
  avgCarbonPerTransaction: number;
  topCategories: Array<{ category: string; carbonKg: number; percentage: number }>;
  monthOverMonthChange: number;
  countryAvgKg: number;
  rating: "excellent" | "good" | "average" | "above_average" | "high";
  offsetCostCents: number;
  offsetCurrency: string;
}

// =============================================================================
// INTERNATIONAL CONSENTS (PSD3 / Open Finance)
// =============================================================================

export type InternationalConsentStatus =
  | "active"
  | "revoked"
  | "expired"
  | "suspended"
  | "awaiting_reauthorization";

export type InternationalConsentScope =
  | "account_info"
  | "balances"
  | "transactions"
  | "transfer_initiate"
  | "identity"
  | "standing_orders"
  | "direct_debits"
  | "beneficiaries";

export type ConsentRegulation =
  | "psd2"
  | "psd3"
  | "open_banking_uk"
  | "open_finance_brazil"
  | "cfpb_1033"
  | "cdp_australia";

export interface InternationalConsent {
  id: string;
  providerId: string;
  providerName: string;
  providerLogo: string | null;
  providerUrl: string | null;
  status: InternationalConsentStatus;
  scopes: InternationalConsentScope[];
  accountIds: string[];
  purpose: string;
  regulation: ConsentRegulation;
  consentGrantedAt: string;
  consentExpiresAt: string | null;
  consentRevokedAt: string | null;
  lastAccessedAt: string | null;
  accessCount30d: number;
  reauthorizationRequired: boolean;
  reauthorizationDeadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InternationalConsentAccessLog {
  id: string;
  consentId: string;
  providerId: string;
  providerName: string;
  scope: InternationalConsentScope;
  endpoint: string;
  dataPointsAccessed: number;
  accessedAt: string;
  ipAddress: string | null;
}

export interface InternationalConsentSummary {
  totalConsents: number;
  activeConsents: number;
  revokedConsents: number;
  expiredConsents: number;
  pendingReauthorization: number;
  recentAccessCount: number;
}

// =============================================================================
// STRONG CUSTOMER AUTHENTICATION (SCA)
// =============================================================================

export type SCAFactorType = "knowledge" | "possession" | "inherence";

export type SCAMethod =
  | "biometric_face"
  | "biometric_fingerprint"
  | "device_binding"
  | "pin"
  | "password"
  | "totp";

export type SCAStatus = "pending" | "authenticated" | "failed" | "expired" | "cancelled";

export interface SCAChallenge {
  challengeId: string;
  triggerAction: string;
  status: SCAStatus;
  requiredFactors: SCAFactorType[];
  completedFactors: SCAFactorType[];
  paymentAmountCents: number | null;
  paymentCurrency: string | null;
  payeeName: string | null;
  trustedDeviceId: string | null;
  trustedDeviceName: string | null;
  thresholdCents: number;
  createdAt: string;
  expiresAt: string;
}

export interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  deviceType: "mobile" | "tablet" | "desktop";
  platform: string;
  isTrusted: boolean;
  boundAt: string;
  lastUsedAt: string | null;
  biometricCapable: boolean;
  pushToken: string | null;
}

export interface SCAConfig {
  scaEnabled: boolean;
  defaultThresholdCents: number;
  thresholdCurrency: string;
  biometricPreferred: boolean;
  challengeExpirySeconds: number;
  maxRetries: number;
  supportedMethods: SCAMethod[];
}

// =============================================================================
// LOCALIZED eKYC
// =============================================================================

export type EKYCProvider = "aadhaar" | "cpf_receita" | "govuk_oneid" | "generic_document" | "mock";

export type EKYCVerificationStatus =
  | "pending"
  | "in_progress"
  | "verified"
  | "failed"
  | "expired"
  | "manual_review";

export type LivenessCheckStatus = "not_started" | "in_progress" | "passed" | "failed";

export interface EKYCVerification {
  id: string;
  provider: EKYCProvider;
  status: EKYCVerificationStatus;
  countryCode: string;
  documentType: string;
  documentNumberMasked: string | null;
  livenessStatus: LivenessCheckStatus;
  livenessScore: number | null;
  livenessCompletedAt: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EKYCProviderConfig {
  provider: EKYCProvider;
  countryCode: string;
  displayName: string;
  description: string;
  requiredFields: string[];
  supportsLiveness: boolean;
  supportsBiometric: boolean;
  estimatedTimeSeconds: number;
}

export interface LivenessChallenge {
  challengeId: string;
  actions: string[];
  currentActionIndex: number;
  status: LivenessCheckStatus;
  sessionUrl: string | null;
  expiresAt: string;
}

// =============================================================================
// PAYMENT ALIASES (VPA / Pix / UPI / FPS)
// =============================================================================

export type PaymentAliasType = "vpa" | "pix_key" | "phone" | "email" | "national_id" | "evp";

export type PaymentNetwork = "upi" | "pix" | "fps" | "sepa_instant" | "neft" | "imps";

export type ConfirmationOfPayeeStatus = "match" | "partial_match" | "no_match" | "unavailable";

export interface PaymentAlias {
  id: string;
  aliasType: PaymentAliasType;
  aliasValue: string;
  displayName: string;
  linkedAccountId: string;
  linkedAccountMasked: string;
  network: PaymentNetwork;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ConfirmationOfPayee {
  aliasValue: string;
  aliasType: PaymentAliasType;
  legalName: string;
  matchStatus: ConfirmationOfPayeeStatus;
  warningMessage: string | null;
  institutionName: string | null;
  verifiedAt: string;
}

export interface QRPaymentData {
  rawData: string;
  recipientAlias: string;
  recipientAliasType: PaymentAliasType;
  recipientName: string | null;
  amountCents: number | null;
  currencyCode: string | null;
  network: PaymentNetwork;
  merchantId: string | null;
  reference: string | null;
}

export interface InternationalPaymentLimits {
  perTransactionLimitCents: number;
  dailyLimitCents: number;
  monthlyLimitCents: number;
  usedTodayCents: number;
  usedThisMonthCents: number;
  currency: string;
}

// =============================================================================
// OPEN FINANCE (Account Aggregation + Alternative Credit)
// =============================================================================

export type OpenFinanceConnectionStatus = "active" | "inactive" | "reconnect_required" | "error";

export interface OpenFinanceConnection {
  connectionId: string;
  institutionId: string;
  institutionName: string;
  institutionLogo: string | null;
  countryCode: string;
  status: OpenFinanceConnectionStatus;
  accountCount: number;
  totalBalanceCents: number;
  currencyCode: string;
  lastSyncedAt: string | null;
  consentExpiresAt: string | null;
  createdAt: string;
}

export interface OpenFinanceAggregatedAccount {
  accountId: string;
  connectionId: string;
  institutionName: string;
  institutionLogo: string | null;
  name: string;
  type: string;
  mask: string;
  balanceCents: number;
  availableBalanceCents: number | null;
  currencyCode: string;
  lastSyncedAt: string;
}

export interface OpenFinanceNetWorth {
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  netWorthCents: number;
  currencyCode: string;
  connectionCount: number;
  accountCount: number;
  lastUpdatedAt: string;
}

export interface AlternativeCreditData {
  estimatedMonthlyIncomeCents: number;
  incomeConfidenceScore: number;
  monthsAnalyzed: number;
  avgMonthlyBalanceCents: number;
  accountsAnalyzed: number;
  meetsMinimumRequirements: boolean;
  currencyCode: string;
  generatedAt: string;
}

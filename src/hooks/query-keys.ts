/**
 * Centralized query key definitions for React Query.
 *
 * Re-exports keys from hooks that already define them, and adds
 * key objects for hooks that previously used inline string arrays.
 */

// ---------------------------------------------------------------------------
// Re-exports from hooks that already have key objects
// ---------------------------------------------------------------------------
export { accountKeys } from './useAccounts';
export { transactionKeys } from './useTransactions';
export { transferKeys } from './useTransfer';
export { beneficiaryKeys } from './useBeneficiaries';
export { cardKeys } from './useCards';
export { cardProvisioningKeys } from './useCardProvisioning';
export { loanKeys } from './useLoans';
export { loanOriginationKeys } from './useLoanOrigination';
export { statementKeys } from './useStatements';
export { notificationKeys } from './useNotifications';
export { rdcKeys } from './useRDC';
export { profileKeys } from './useProfile';
export { memberKeys } from './useMemberProfile';
export { locationKeys } from './useLocations';
export { chargeKeys } from './useCharges';
export { standingInstructionKeys } from './useStandingInstructions';
export { externalAccountKeys } from './useExternalAccounts';
export { adminUserKeys } from './useAdminUsers';
export { adminAccountKeys } from './useAdminAccounts';
export { adminAuditKeys } from './useAdminAuditLog';
export { adminIntegrationKeys } from './useAdminIntegrations';
export { adminCDPKeys } from './useAdminCDP';
export { accountOpeningKeys } from './useAccountOpening';
export { activationKeys } from './useActivation';
export { cdKeys } from './useCDMaturity';
export { wireKeys } from './useWireTransfers';
export { stopPaymentKeys } from './useStopPayments';
export { p2pKeys } from './useP2P';
export { goalKeys } from './useSavingsGoals';
export { jointAccountKeys } from './useJointAccounts';
export { disputeKeys } from './useDisputes';
export { messagingKeys } from './useSecureMessaging';
export { checkOrderKeys } from './useCheckOrders';
export { directDepositKeys } from './useDirectDeposit';
export { openBankingKeys } from './useOpenBanking';
export { aggregatorKeys } from './useAggregator';

// ---------------------------------------------------------------------------
// New key objects for hooks that previously used inline arrays
// ---------------------------------------------------------------------------

export const regulatoryKeys = {
  all: ['regulatory'] as const,
  safeguarding: (country?: string) => ['regulatory', 'safeguarding', country] as const,
  withholding: (params?: Record<string, unknown>) => ['regulatory', 'withholding', params] as const,
  carbonTransaction: (transactionId: string) => ['regulatory', 'carbon', 'transaction', transactionId] as const,
  carbonSummary: (periodStart: string, periodEnd: string) => ['regulatory', 'carbon', 'summary', periodStart, periodEnd] as const,
};

export const screenKeys = {
  all: ['sdui'] as const,
  manifests: () => ['sdui', 'manifests'] as const,
  personas: () => ['sdui', 'personas'] as const,
};

export const vaultKeys = {
  all: ['vault'] as const,
  documents: (params?: Record<string, unknown>) => ['vault', 'documents', params] as const,
  document: (id: string) => ['vault', 'document', id] as const,
  summary: () => ['vault', 'summary'] as const,
  search: (params?: Record<string, unknown>) => ['vault', 'search', params] as const,
};

export const sweepKeys = {
  all: ['sweeps'] as const,
  rules: (status?: string) => ['sweeps', 'rules', status] as const,
  executions: (ruleId?: string) => ['sweeps', 'executions', ruleId] as const,
  summary: () => ['sweeps', 'summary'] as const,
};

export const treasuryKeys = {
  all: ['treasury'] as const,
  vaults: () => ['treasury', 'vaults'] as const,
  summary: () => ['treasury', 'summary'] as const,
};

export const amlKeys = {
  all: ['aml'] as const,
  screening: (screeningId: string) => ['aml-screening', screeningId] as const,
  monitoring: (params?: Record<string, unknown>) => ['aml-monitoring', params] as const,
  alerts: (params?: Record<string, unknown>) => ['aml-alerts', params] as const,
};

export const overdraftKeys = {
  all: ['overdraft'] as const,
  settings: (accountId: string) => ['overdraft', 'settings', accountId] as const,
  history: (accountId: string, limit?: number, offset?: number) => ['overdraft', 'history', accountId, limit, offset] as const,
  feeSchedule: () => ['overdraft', 'feeSchedule'] as const,
};

export const spendingAlertKeys = {
  all: ['spending-alerts'] as const,
  history: (limit?: number, offset?: number) => ['spending-alerts', 'history', limit, offset] as const,
  summary: () => ['spending-alerts', 'summary'] as const,
};

export const internationalPaymentKeys = {
  all: ['internationalPayments'] as const,
  coverage: (region?: string) => ['internationalPayments', 'coverage', region] as const,
  fxQuote: (from: string, to: string, amount?: number) => ['internationalPayments', 'fxQuote', from, to, amount] as const,
  list: (params?: Record<string, unknown>) => ['internationalPayments', 'list', params] as const,
  cards: (params?: Record<string, unknown>) => ['internationalPayments', 'cards', params] as const,
  payouts: (params?: Record<string, unknown>) => ['internationalPayments', 'payouts', params] as const,
};

export const internationalBillPayKeys = {
  all: ['internationalBillPay'] as const,
  billers: (query: string, country?: string) => ['internationalBillPay', 'billers', query, country] as const,
  payments: (params?: Record<string, unknown>) => ['internationalBillPay', 'payments', params] as const,
  countries: () => ['internationalBillPay', 'countries'] as const,
};

export const internationalLoanKeys = {
  all: ['internationalLoans'] as const,
  applications: (params?: Record<string, unknown>) => ['internationalLoans', 'applications', params] as const,
};

export const baasKeys = {
  all: ['baas'] as const,
  accounts: (params?: Record<string, unknown>) => ['baas', 'accounts', params] as const,
};

export const sessionKeys = {
  all: ['sessions'] as const,
  activity: () => ['sessions', 'activity'] as const,
};

export const cashFlowKeys = {
  all: ['cashflow'] as const,
  forecast: (accountId?: string, daysAhead?: number) => ['cashflow', 'forecast', accountId, daysAhead] as const,
};

export const currencyPotKeys = {
  all: ['currencyPots'] as const,
  list: (status?: string) => ['currencyPots', 'list', status] as const,
  get: (potId: string) => ['currencyPots', 'get', potId] as const,
  swapQuote: (fromPotId: string, toPotId: string, amount: number) => ['currencyPots', 'swapQuote', fromPotId, toPotId, amount] as const,
  swaps: (potId?: string) => ['currencyPots', 'swaps', potId] as const,
};

export const notificationPreferenceKeys = {
  all: ['notification-preferences'] as const,
};

export const aliasKeys = {
  all: ['alias'] as const,
  directories: () => ['alias', 'directories'] as const,
  r2p: () => ['alias', 'r2p'] as const,
  r2pInbound: (params?: Record<string, unknown>) => ['alias', 'r2p', 'inbound', params] as const,
  r2pOutbound: (params?: Record<string, unknown>) => ['alias', 'r2p', 'outbound', params] as const,
};

export const approvalKeys = {
  all: ['approvals'] as const,
  requests: (statusOrId?: string) => ['approvals', 'requests', statusOrId] as const,
  policies: () => ['approvals', 'policies'] as const,
  summary: () => ['approvals', 'summary'] as const,
};

export const deviceKeys = {
  all: ['devices'] as const,
  detail: (deviceId: string) => ['devices', deviceId] as const,
  activity: (deviceId: string) => ['devices', deviceId, 'activity'] as const,
};

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (status?: string) => ['invoices', status] as const,
  detail: (invoiceId: string) => ['invoices', invoiceId] as const,
};

export const travelNoticeKeys = {
  all: ['travelNotices'] as const,
  list: (filter?: string) => ['travelNotices', filter] as const,
};

export const cardReplacementKeys = {
  all: ['cardReplacements'] as const,
  detail: (id: string) => ['cardReplacements', id] as const,
};

export const exportKeys = {
  all: ['exports'] as const,
  list: (params?: Record<string, unknown>) => ['exports', params] as const,
  summary: () => ['exports', 'summary'] as const,
};

export const reportTemplateKeys = {
  all: ['report-templates'] as const,
};

export const copKeys = {
  all: ['cop'] as const,
};

export const scaKeys = {
  exemption: (params?: Record<string, unknown>) => ['sca', 'exemption', params] as const,
};

export const instantPaymentKeys = {
  all: ['instantPayments'] as const,
  list: (params?: Record<string, unknown>) => ['instantPayments', 'list', params] as const,
  detail: (paymentId: string) => ['instantPayments', 'get', paymentId] as const,
};

export const complianceKeys = {
  dataResidency: () => ['compliance', 'dataResidency'] as const,
  coolingOff: (loanId: string) => ['compliance', 'coolingOff', loanId] as const,
  interestWithholding: (accountId: string, taxYear?: string) => ['compliance', 'interestWithholding', accountId, taxYear] as const,
};

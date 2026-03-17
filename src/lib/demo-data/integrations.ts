/**
 * Demo data for externalAccounts, locations, accountProducts, cd, charges,
 * standingInstructions, and accountOpening.
 */

import {
  ActionHandler,
  TENANT_ID,
  CHECKING_ID,
  SAVINGS_ID,
  CD_ID,
  withPagination,
  isoDate,
  futureDate,
} from './types';

// =============================================================================
// HANDLERS
// =============================================================================

export const integrationHandlers: Record<string, ActionHandler> = {
  // External Accounts (Plaid)
  'external-accounts.link-token': () => ({
    linkToken: 'demo-link-token-placeholder',
    expiration: futureDate(1),
  }),
  'external-accounts.exchange': () => ({
    itemId: 'demo-item-001',
    linkedAt: new Date().toISOString(),
  }),
  'external-accounts.list': () => ({
    accounts: [
      { accountId: 'ext-001', itemId: 'demo-item-001', institutionName: 'Chase Bank', name: 'Chase Checking', officialName: 'TOTAL CHECKING', type: 'depository', subtype: 'checking', mask: '6789', balanceCents: 543200, availableBalanceCents: 543200, currencyCode: 'USD', linkedAt: isoDate(30) },
    ],
  }),
  'external-accounts.balances': () => ({
    balances: [
      { accountId: 'ext-001', currentCents: 543200, availableCents: 543200, limitCents: null, currencyCode: 'USD', lastUpdatedAt: isoDate(0) },
    ],
  }),
  'external-accounts.transactions': () => ({
    transactions: [
      { transactionId: 'ext-txn-001', accountId: 'ext-001', amountCents: -3500, description: 'Starbucks', merchantName: 'Starbucks', category: ['Food and Drink', 'Coffee Shop'], date: isoDate(1), pending: false, currencyCode: 'USD' },
    ],
    nextCursor: '',
    hasMore: false,
  }),

  // ATM / Branch Locator
  'locations.search': () => ({
    locations: [
      { id: 'loc-001', name: 'Demo CU Main Branch', type: 'branch', latitude: 39.7817, longitude: -89.6501, address: '100 N Main St', city: 'Springfield', state: 'IL', zip: '62701', phone: '(217) 555-0100', distanceMiles: 0.5, hours: { Mon: '9AM-5PM', Tue: '9AM-5PM', Wed: '9AM-5PM', Thu: '9AM-5PM', Fri: '9AM-6PM', Sat: '9AM-12PM', Sun: 'Closed' }, services: ['ATM', 'Drive-through', 'Safe deposit', 'Notary'], isOpen: true, isDepositAccepting: true, network: null },
      { id: 'loc-002', name: 'Demo CU ATM - Grocery Store', type: 'atm', latitude: 39.7900, longitude: -89.6400, address: '500 S Grand Ave', city: 'Springfield', state: 'IL', zip: '62703', phone: null, distanceMiles: 1.2, hours: null, services: ['ATM', 'Deposits'], isOpen: true, isDepositAccepting: true, network: 'CO-OP' },
    ],
  }),

  // Account Products
  'accountProducts.list': () => ({
    products: [
      { id: 'prod-checking-001', name: 'Free Checking', shortName: 'Free Chk', description: 'No monthly fee checking account', type: 'checking', interestRateBps: 25, interestCompounding: 'monthly', interestPosting: 'monthly', interestCalculation: 'daily_balance', minimumOpeningBalanceCents: 2500, minimumBalanceCents: 0, maximumBalanceCents: null, withdrawalLimitPerMonth: null, termMonths: null, earlyWithdrawalPenaltyBps: null, autoRenew: false, isActive: true },
      { id: 'prod-savings-001', name: 'High-Yield Savings', shortName: 'HY Sav', description: 'Earn 4.25% APY', type: 'savings', interestRateBps: 425, interestCompounding: 'daily', interestPosting: 'monthly', interestCalculation: 'daily_balance', minimumOpeningBalanceCents: 10000, minimumBalanceCents: 0, maximumBalanceCents: null, withdrawalLimitPerMonth: 6, termMonths: null, earlyWithdrawalPenaltyBps: null, autoRenew: false, isActive: true },
      { id: 'prod-cd-001', name: '12-Month CD', shortName: '12M CD', description: '5.00% APY for 12 months', type: 'cd', interestRateBps: 500, interestCompounding: 'monthly', interestPosting: 'monthly', interestCalculation: 'daily_balance', minimumOpeningBalanceCents: 100000, minimumBalanceCents: 100000, maximumBalanceCents: null, withdrawalLimitPerMonth: 0, termMonths: 12, earlyWithdrawalPenaltyBps: 150, autoRenew: true, isActive: true },
    ],
  }),
  'accountProducts.get': (p) => ({
    product: { id: p.id || 'prod-checking-001', name: 'Free Checking', shortName: 'Free Chk', description: 'No monthly fee checking account', type: 'checking', interestRateBps: 25, interestCompounding: 'monthly', interestPosting: 'monthly', interestCalculation: 'daily_balance', minimumOpeningBalanceCents: 2500, minimumBalanceCents: 0, maximumBalanceCents: null, withdrawalLimitPerMonth: null, termMonths: null, earlyWithdrawalPenaltyBps: null, autoRenew: false, isActive: true },
  }),

  // CD Maturity
  'cd.maturity': () => ({
    maturity: {
      accountId: CD_ID,
      maturityDate: futureDate(180),
      maturityAction: 'renew_same_term',
      maturityTransferAccountId: null,
      originalTermMonths: 12,
      penaltyWithdrawnCents: 0,
      productId: 'prod-cd-001',
    },
  }),
  'cd.updateMaturityAction': () => ({ success: true }),

  // Charges & Fees
  'charges.definitions': () => ({
    chargeDefinitions: [
      { id: 'chdef-001', name: 'Monthly Maintenance', description: 'Monthly account maintenance fee', chargeType: 'monthly_maintenance', appliesTo: 'checking', amountCents: 1000, isPercentage: false, frequency: 'monthly', waivable: true, waiveIfBalanceAboveCents: 150000, maxPerDay: null, isActive: true },
      { id: 'chdef-002', name: 'Overdraft Fee', description: 'Fee for insufficient funds', chargeType: 'overdraft', appliesTo: 'checking', amountCents: 3500, isPercentage: false, frequency: 'per_occurrence', waivable: true, waiveIfBalanceAboveCents: null, maxPerDay: 3, isActive: true },
    ],
  }),
  'charges.list': () => withPagination({
    charges: [
      { id: 'chg-001', accountId: CHECKING_ID, loanId: null, chargeDefinitionId: 'chdef-001', amountCents: 1000, status: 'waived', waivedReason: 'Balance above $1,500', waivedAt: isoDate(5), appliedAt: null, createdAt: isoDate(5) },
    ],
  }, 1),

  // Standing Instructions
  'standingInstructions.list': () => ({
    instructions: [
      { id: 'si-001', fromAccountId: CHECKING_ID, toAccountId: SAVINGS_ID, toBeneficiaryId: null, toLoanId: null, transferType: 'account_to_account' as const, amountCents: 50000, name: 'Monthly Savings Transfer', frequency: 'monthly' as const, dayOfWeek: null, dayOfMonth: 1, startDate: '2024-01-01', endDate: null, nextExecutionDate: futureDate(15), status: 'active' as const, totalExecutions: 14, lastExecutedAt: isoDate(15), lastFailureReason: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: isoDate(15) },
    ],
  }),
  'standingInstructions.create': (p) => ({
    instruction: {
      id: `si-demo-${Date.now()}`,
      fromAccountId: p.fromAccountId,
      toAccountId: p.toAccountId || null,
      toBeneficiaryId: p.toBeneficiaryId || null,
      toLoanId: p.toLoanId || null,
      transferType: p.transferType || 'account_to_account',
      amountCents: p.amountCents,
      name: p.name,
      frequency: p.frequency || 'monthly',
      dayOfWeek: p.dayOfWeek || null,
      dayOfMonth: p.dayOfMonth || null,
      startDate: p.startDate,
      endDate: null,
      nextExecutionDate: p.startDate,
      status: 'active',
      totalExecutions: 0,
      lastExecutedAt: null,
      lastFailureReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }),
  'standingInstructions.update': (p) => ({
    instruction: {
      id: p.id,
      fromAccountId: CHECKING_ID,
      toAccountId: SAVINGS_ID,
      toBeneficiaryId: null,
      toLoanId: null,
      transferType: 'account_to_account',
      amountCents: p.amountCents || 50000,
      name: p.name || 'Monthly Savings Transfer',
      frequency: p.frequency || 'monthly',
      dayOfWeek: p.dayOfWeek || null,
      dayOfMonth: p.dayOfMonth || 1,
      startDate: '2024-01-01',
      endDate: p.endDate || null,
      nextExecutionDate: futureDate(15),
      status: p.status || 'active',
      totalExecutions: 14,
      lastExecutedAt: isoDate(15),
      lastFailureReason: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  }),

  // Account Opening
  'account-opening.config': () => ({
    products: [
      {
        id: 'prod_checking_free',
        type: 'checking',
        name: 'Free Checking',
        description: 'No monthly fees, no minimum balance. Free debit card included.',
        apyBps: 10,
        minOpeningDepositCents: 2500,
        monthlyFeeCents: 0,
        isAvailable: true,
      },
      {
        id: 'prod_savings_high_yield',
        type: 'savings',
        name: 'High-Yield Savings',
        description: 'Our best savings rate. Perfect for building your emergency fund.',
        apyBps: 425,
        minOpeningDepositCents: 500,
        monthlyFeeCents: 0,
        isAvailable: true,
      },
      {
        id: 'prod_money_market',
        type: 'money_market',
        name: 'Money Market Account',
        description: 'Higher rates with check-writing privileges. Tiered interest rates.',
        apyBps: 350,
        minOpeningDepositCents: 100000,
        monthlyFeeCents: 500,
        feeWaiverDescription: 'Waived with $5,000 minimum daily balance',
        isAvailable: true,
      },
      {
        id: 'prod_cd_12mo',
        type: 'cd',
        name: '12-Month CD',
        description: 'Our most popular CD term with a competitive rate.',
        apyBps: 500,
        minOpeningDepositCents: 100000,
        monthlyFeeCents: 0,
        termMonths: 12,
        isAvailable: true,
      },
    ],
    allowedFundingMethods: ['ach_transfer', 'debit_card', 'internal_transfer', 'none'],
    minimumAge: 18,
    maxApplicationsPerDay: 5,
    applicationExpiryHours: 72,
    allowJointApplications: false,
    requiredDisclosures: ['digital_banking_agreement', 'electronic_disclosure', 'privacy_policy'],
  }),
  'account-opening.create': () => {
    const now = new Date().toISOString();
    return {
      id: 'app_demo_001',
      tenantId: TENANT_ID,
      status: 'kyc_approved',
      applicant: {
        firstNameInitial: 'D',
        lastNameMasked: 'U***',
        emailMasked: 'd***@example.com',
        ssnMasked: '***-**-6789',
      },
      selectedProducts: [],
      createdAt: now,
      updatedAt: now,
      expiresAt: futureDate(3),
    };
  },
  'account-opening.get': () => {
    const now = new Date().toISOString();
    return {
      id: 'app_demo_001',
      tenantId: TENANT_ID,
      status: 'kyc_approved',
      applicant: {
        firstNameInitial: 'D',
        lastNameMasked: 'U***',
        emailMasked: 'd***@example.com',
        ssnMasked: '***-**-6789',
      },
      selectedProducts: [],
      createdAt: now,
      updatedAt: now,
      expiresAt: futureDate(3),
    };
  },
  'account-opening.selectProducts': (p) => {
    const productIds = Array.isArray(p.productIds) ? p.productIds : [];
    const productMap: Record<string, { productType: string; productName: string }> = {
      prod_checking_free: { productType: 'checking', productName: 'Free Checking' },
      prod_savings_high_yield: { productType: 'savings', productName: 'High-Yield Savings' },
      prod_money_market: { productType: 'money_market', productName: 'Money Market Account' },
      prod_cd_12mo: { productType: 'cd', productName: '12-Month CD' },
    };
    return {
      id: p.applicationId || 'app_demo_001',
      tenantId: TENANT_ID,
      status: 'products_selected',
      applicant: {
        firstNameInitial: 'D',
        lastNameMasked: 'U***',
        emailMasked: 'd***@example.com',
        ssnMasked: '***-**-6789',
      },
      selectedProducts: productIds.map((pid: string) => ({
        productId: pid,
        ...(productMap[pid] || { productType: 'checking', productName: pid }),
      })),
      createdAt: isoDate(0),
      updatedAt: new Date().toISOString(),
      expiresAt: futureDate(3),
    };
  },
  'account-opening.submitFunding': (p) => ({
    id: p.applicationId || 'app_demo_001',
    tenantId: TENANT_ID,
    status: 'funded',
    applicant: {
      firstNameInitial: 'D',
      lastNameMasked: 'U***',
      emailMasked: 'd***@example.com',
      ssnMasked: '***-**-6789',
    },
    selectedProducts: [
      { productId: 'prod_checking_free', productType: 'checking', productName: 'Free Checking' },
    ],
    funding: {
      method: p.method || 'ach_transfer',
      amountCents: p.amountCents || 10000,
      sourceAccountMasked: '****5678',
    },
    createdAt: isoDate(0),
    updatedAt: new Date().toISOString(),
    expiresAt: futureDate(3),
  }),
  'account-opening.complete': (p) => ({
    id: p.applicationId || 'app_demo_001',
    tenantId: TENANT_ID,
    status: 'completed',
    applicant: {
      firstNameInitial: 'D',
      lastNameMasked: 'U***',
      emailMasked: 'd***@example.com',
      ssnMasked: '***-**-6789',
    },
    selectedProducts: [
      { productId: 'prod_checking_free', productType: 'checking', productName: 'Free Checking' },
    ],
    funding: {
      method: 'ach_transfer',
      amountCents: 10000,
      sourceAccountMasked: '****5678',
    },
    createdAccounts: [
      { accountId: 'acct_new_001', accountNumberMasked: '****3456', type: 'checking' },
    ],
    createdAt: isoDate(0),
    updatedAt: new Date().toISOString(),
    expiresAt: futureDate(3),
  }),
  'account-opening.cancel': () => ({ success: true }),
};

/**
 * Demo data for financial, enrichment, offers, goals, overdraft, and spendingAlerts.
 */

import {
  ActionHandler,
  CHECKING_ID,
  SAVINGS_ID,
  CD_ID,
  CARD_CREDIT_ID,
  LOAN_AUTO_ID,
  LOAN_MORTGAGE_ID,
  isoDate,
  futureDate,
} from './types';

// =============================================================================
// HANDLERS
// =============================================================================

export const financialHandlers: Record<string, ActionHandler> = {
  // Transaction Enrichment (MX Platform)
  'enrichment.enhance': (p) => ({
    transaction: {
      description: p.description,
      amount: p.amount,
      date: p.date,
      id: p.id,
      accountId: p.accountId,
      merchantName: 'Enriched Merchant',
      merchantLogo: null,
      category: 'shopping',
      isRecurring: false,
      categoryCode: 'SHP',
      confidence: 0.92,
    },
    adapter: 'mock',
  }),
  'enrichment.batch': (p) => {
    const txns = Array.isArray(p.transactions) ? p.transactions : [];
    return {
      transactions: txns.map((t: Record<string, unknown>) => ({
        ...t,
        merchantName: 'Enriched Merchant',
        merchantLogo: null,
        category: 'shopping',
        isRecurring: false,
        categoryCode: 'SHP',
        confidence: 0.90,
      })),
      count: txns.length,
      adapter: 'mock',
    };
  },

  // Financial Data & Insights
  'financial.enrich': (p) => {
    const txns = (p.transactions as Array<{ transactionId: string; description: string; amountCents: number; date: string; type: string }>) || [];
    return {
      enrichedTransactions: txns.map(t => ({
        transactionId: t.transactionId,
        cleanDescription: t.description.replace(/[#\d]+/g, '').trim(),
        rawDescription: t.description,
        merchant: { name: t.description.split(' ')[0], category: 'shopping' },
        category: 'shopping',
        amountCents: t.amountCents,
        date: t.date,
        isRecurring: false,
        transactionType: t.type,
        isBillPayment: false,
      })),
    };
  },
  'financial.spending': () => ({
    totalSpendingCents: 385200, totalIncomeCents: 650000, netCashFlowCents: 264800,
    avgDailySpendingCents: 12840, periodStart: isoDate(30).split('T')[0], periodEnd: new Date().toISOString().split('T')[0],
    byCategory: [
      { category: 'housing', totalCents: 150000, transactionCount: 1, percentOfTotal: 38.9, trend: 'stable', changeFromPreviousCents: 0, topMerchants: [{ name: 'Rent Payment', totalCents: 150000 }] },
      { category: 'food_dining', totalCents: 62300, transactionCount: 18, percentOfTotal: 16.2, trend: 'up', changeFromPreviousCents: 8500, topMerchants: [{ name: 'Starbucks', totalCents: 14500, logoUrl: 'https://logo.clearbit.com/starbucks.com' }, { name: 'Chipotle', totalCents: 9800, logoUrl: 'https://logo.clearbit.com/chipotle.com' }] },
      { category: 'groceries', totalCents: 48700, transactionCount: 8, percentOfTotal: 12.6, trend: 'stable', changeFromPreviousCents: -2100, topMerchants: [{ name: 'Whole Foods', totalCents: 28400, logoUrl: 'https://logo.clearbit.com/wholefoodsmarket.com' }, { name: 'Trader Joe\'s', totalCents: 20300, logoUrl: 'https://logo.clearbit.com/traderjoes.com' }] },
      { category: 'transportation', totalCents: 35800, transactionCount: 12, percentOfTotal: 9.3, trend: 'down', changeFromPreviousCents: -5200, topMerchants: [{ name: 'Chevron', totalCents: 18500, logoUrl: 'https://logo.clearbit.com/chevron.com' }, { name: 'Uber', totalCents: 12300, logoUrl: 'https://logo.clearbit.com/uber.com' }] },
      { category: 'subscriptions', totalCents: 24900, transactionCount: 6, percentOfTotal: 6.5, trend: 'stable', changeFromPreviousCents: 0, topMerchants: [{ name: 'Netflix', totalCents: 1599, logoUrl: 'https://logo.clearbit.com/netflix.com' }, { name: 'Spotify', totalCents: 1099, logoUrl: 'https://logo.clearbit.com/spotify.com' }] },
      { category: 'shopping', totalCents: 38200, transactionCount: 5, percentOfTotal: 9.9, trend: 'up', changeFromPreviousCents: 12400, topMerchants: [{ name: 'Amazon', totalCents: 28700, logoUrl: 'https://logo.clearbit.com/amazon.com' }] },
      { category: 'utilities', totalCents: 25300, transactionCount: 3, percentOfTotal: 6.6, trend: 'stable', changeFromPreviousCents: 1200, topMerchants: [{ name: 'PG&E', totalCents: 14500 }, { name: 'AT&T', totalCents: 8599 }] },
    ],
  }),
  'financial.trends': () => ({
    trends: [
      { month: '2026-03', spendingCents: 385200, incomeCents: 650000, savingsCents: 264800, topCategory: 'housing' },
      { month: '2026-02', spendingCents: 362100, incomeCents: 650000, savingsCents: 287900, topCategory: 'housing' },
      { month: '2026-01', spendingCents: 410500, incomeCents: 650000, savingsCents: 239500, topCategory: 'housing' },
      { month: '2025-12', spendingCents: 485300, incomeCents: 675000, savingsCents: 189700, topCategory: 'shopping' },
      { month: '2025-11', spendingCents: 345600, incomeCents: 650000, savingsCents: 304400, topCategory: 'housing' },
      { month: '2025-10', spendingCents: 378900, incomeCents: 650000, savingsCents: 271100, topCategory: 'housing' },
    ],
  }),
  'financial.budgets.list': () => ({
    budgets: [
      { budgetId: 'bgt-001', category: 'food_dining', limitCents: 60000, spentCents: 62300, remainingCents: -2300, percentUsed: 103.8, isOverBudget: true, projectedCents: 68500 },
      { budgetId: 'bgt-002', category: 'groceries', limitCents: 50000, spentCents: 48700, remainingCents: 1300, percentUsed: 97.4, isOverBudget: false, projectedCents: 52100 },
      { budgetId: 'bgt-003', category: 'transportation', limitCents: 40000, spentCents: 35800, remainingCents: 4200, percentUsed: 89.5, isOverBudget: false, projectedCents: 38200 },
      { budgetId: 'bgt-004', category: 'shopping', limitCents: 30000, spentCents: 38200, remainingCents: -8200, percentUsed: 127.3, isOverBudget: true, projectedCents: 42500 },
      { budgetId: 'bgt-005', category: 'entertainment', limitCents: 20000, spentCents: 8500, remainingCents: 11500, percentUsed: 42.5, isOverBudget: false, projectedCents: 12800 },
    ],
    totalBudgetCents: 200000,
    totalSpentCents: 193500,
  }),
  'financial.budgets.set': (p) => ({
    budgetId: `bgt-${Date.now()}`, category: p.category, limitCents: p.limitCents, spentCents: 0,
    remainingCents: p.limitCents, percentUsed: 0, isOverBudget: false, projectedCents: 0,
  }),
  'financial.networth': () => ({
    date: new Date().toISOString().split('T')[0],
    totalAssetsCents: 18524300, totalLiabilitiesCents: 3245800, netWorthCents: 15278500,
    accounts: [
      { accountId: CHECKING_ID, name: 'Primary Checking', type: 'asset', balanceCents: 1254300 },
      { accountId: SAVINGS_ID, name: 'Premium Savings', type: 'asset', balanceCents: 4520000 },
      { accountId: CD_ID, name: '12-Month CD', type: 'asset', balanceCents: 2500000 },
      { accountId: 'ext-brokerage', name: 'Brokerage Account', type: 'asset', balanceCents: 10250000, institution: 'Fidelity' },
      { accountId: CARD_CREDIT_ID, name: 'Platinum Rewards Visa', type: 'liability', balanceCents: -245800 },
      { accountId: LOAN_AUTO_ID, name: 'Auto Loan', type: 'liability', balanceCents: -1800000 },
      { accountId: LOAN_MORTGAGE_ID, name: 'Home Mortgage', type: 'liability', balanceCents: -1200000 },
    ],
  }),
  'financial.networth.history': () => [
    { date: '2026-03-01', totalAssetsCents: 18524300, totalLiabilitiesCents: 3245800, netWorthCents: 15278500, accounts: [] },
    { date: '2026-02-01', totalAssetsCents: 18124300, totalLiabilitiesCents: 3345800, netWorthCents: 14778500, accounts: [] },
    { date: '2026-01-01', totalAssetsCents: 17824300, totalLiabilitiesCents: 3445800, netWorthCents: 14378500, accounts: [] },
    { date: '2025-12-01', totalAssetsCents: 17524300, totalLiabilitiesCents: 3545800, netWorthCents: 13978500, accounts: [] },
    { date: '2025-11-01', totalAssetsCents: 17124300, totalLiabilitiesCents: 3645800, netWorthCents: 13478500, accounts: [] },
    { date: '2025-10-01', totalAssetsCents: 16824300, totalLiabilitiesCents: 3745800, netWorthCents: 13078500, accounts: [] },
  ],
  'financial.recurring': () => ({
    recurring: [
      { recurringId: 'rec-001', merchantName: 'Netflix', merchantLogoUrl: 'https://logo.clearbit.com/netflix.com', category: 'subscriptions', averageAmountCents: 1599, lastAmountCents: 1599, frequency: 'monthly', nextExpectedDate: futureDate(18), isActive: true, lastChargeDate: isoDate(12), chargeCount: 24 },
      { recurringId: 'rec-002', merchantName: 'Spotify', merchantLogoUrl: 'https://logo.clearbit.com/spotify.com', category: 'subscriptions', averageAmountCents: 1099, lastAmountCents: 1099, frequency: 'monthly', nextExpectedDate: futureDate(22), isActive: true, lastChargeDate: isoDate(8), chargeCount: 36 },
      { recurringId: 'rec-003', merchantName: 'Planet Fitness', merchantLogoUrl: 'https://logo.clearbit.com/planetfitness.com', category: 'personal_care', averageAmountCents: 2499, lastAmountCents: 2499, frequency: 'monthly', nextExpectedDate: futureDate(3), isActive: true, lastChargeDate: isoDate(27), chargeCount: 18 },
      { recurringId: 'rec-004', merchantName: 'AT&T Wireless', merchantLogoUrl: 'https://logo.clearbit.com/att.com', category: 'utilities', averageAmountCents: 8599, lastAmountCents: 8599, frequency: 'monthly', nextExpectedDate: futureDate(12), isActive: true, lastChargeDate: isoDate(18), chargeCount: 48 },
      { recurringId: 'rec-005', merchantName: 'Adobe Creative Cloud', merchantLogoUrl: 'https://logo.clearbit.com/adobe.com', category: 'subscriptions', averageAmountCents: 5499, lastAmountCents: 5499, frequency: 'monthly', nextExpectedDate: futureDate(8), isActive: true, lastChargeDate: isoDate(22), chargeCount: 12 },
      { recurringId: 'rec-006', merchantName: 'Amazon Prime', merchantLogoUrl: 'https://logo.clearbit.com/amazon.com', category: 'subscriptions', averageAmountCents: 14900, lastAmountCents: 14900, frequency: 'annual', nextExpectedDate: futureDate(120), isActive: true, lastChargeDate: isoDate(245), chargeCount: 5 },
    ],
    totalMonthlyCents: 19295,
    totalAnnualCents: 246240,
  }),

  // Card-Linked Offers
  'offers.list': () => ({
    offers: [
      { offerId: 'off_starbucks_5', merchant: { merchantId: 'mch_starbucks', name: 'Starbucks', logoUrl: 'https://logo.clearbit.com/starbucks.com', category: 'food_dining' }, headline: '5% cash back at Starbucks', description: 'Earn 5% cash back on all purchases at Starbucks locations. Minimum spend $10.', offerType: 'cashback_percent', rewardValue: 500, minimumSpendCents: 1000, maximumRewardCents: 2500, status: 'available', expiresAt: futureDate(30), isPersonalized: true, relevanceScore: 95, tags: ['coffee', 'food', 'popular'] },
      { offerId: 'off_amazon_3', merchant: { merchantId: 'mch_amazon', name: 'Amazon', logoUrl: 'https://logo.clearbit.com/amazon.com', category: 'shopping' }, headline: '3% cash back at Amazon', description: 'Get 3% back on Amazon.com purchases.', offerType: 'cashback_percent', rewardValue: 300, maximumRewardCents: 5000, status: 'available', expiresAt: futureDate(45), isPersonalized: true, relevanceScore: 92, tags: ['shopping', 'online', 'popular'] },
      { offerId: 'off_target_10', merchant: { merchantId: 'mch_target', name: 'Target', logoUrl: 'https://logo.clearbit.com/target.com', category: 'shopping', locations: [{ latitude: 37.7749, longitude: -122.4194, city: 'San Francisco', state: 'CA' }] }, headline: '$10 back when you spend $75 at Target', description: 'Get $10 cash back on your next Target purchase of $75 or more.', offerType: 'cashback_flat', rewardValue: 1000, minimumSpendCents: 7500, status: 'available', expiresAt: futureDate(14), isPersonalized: false, relevanceScore: 85, tags: ['shopping', 'retail'] },
      { offerId: 'off_uber_15', merchant: { merchantId: 'mch_uber', name: 'Uber', logoUrl: 'https://logo.clearbit.com/uber.com', category: 'transportation' }, headline: '15% off your next 3 Uber rides', description: 'Save 15% on your next 3 Uber rides. Max discount $5 per ride.', offerType: 'discount_percent', rewardValue: 1500, maximumRewardCents: 500, status: 'available', expiresAt: futureDate(21), isPersonalized: true, relevanceScore: 78, tags: ['transportation', 'rideshare'] },
      { offerId: 'off_wholefds_8', merchant: { merchantId: 'mch_wholefoods', name: 'Whole Foods Market', logoUrl: 'https://logo.clearbit.com/wholefoodsmarket.com', category: 'groceries' }, headline: '8% cash back at Whole Foods', description: 'Earn 8% back on all Whole Foods purchases.', offerType: 'cashback_percent', rewardValue: 800, maximumRewardCents: 4000, status: 'available', expiresAt: futureDate(60), isPersonalized: true, relevanceScore: 88, tags: ['groceries', 'food'] },
      { offerId: 'off_chevron_10c', merchant: { merchantId: 'mch_chevron', name: 'Chevron', logoUrl: 'https://logo.clearbit.com/chevron.com', category: 'transportation' }, headline: '10¢ off per gallon at Chevron', description: 'Save 10 cents per gallon on fuel.', offerType: 'discount_flat', rewardValue: 10, status: 'activated', activatedAt: isoDate(5), expiresAt: futureDate(25), isPersonalized: false, relevanceScore: 72, tags: ['fuel', 'gas'] },
      { offerId: 'off_netflix_free', merchant: { merchantId: 'mch_netflix', name: 'Netflix', logoUrl: 'https://logo.clearbit.com/netflix.com', category: 'entertainment' }, headline: '$5 back on your Netflix subscription', description: 'Get $5 cash back on your next Netflix billing cycle.', offerType: 'cashback_flat', rewardValue: 500, status: 'activated', activatedAt: isoDate(10), expiresAt: futureDate(20), isPersonalized: true, relevanceScore: 90, tags: ['streaming', 'entertainment'] },
    ],
    nearbyOffers: [],
    _pagination: { total: 7, limit: 20, offset: 0, hasMore: false },
  }),
  'offers.activate': (p) => ({
    success: true,
    offer: { offerId: p.offerId, status: 'activated', activatedAt: new Date().toISOString() },
  }),
  'offers.deactivate': () => ({ success: true }),
  'offers.redemptions': () => ({
    redemptions: [
      { redemptionId: 'rdm_001', offerId: 'off_starbucks_5', transactionId: 'txn_sb_001', transactionAmountCents: 1250, rewardAmountCents: 63, rewardType: 'cashback_percent', merchantName: 'Starbucks', redeemedAt: isoDate(3), payoutStatus: 'credited' },
      { redemptionId: 'rdm_002', offerId: 'off_amazon_3', transactionId: 'txn_amz_001', transactionAmountCents: 8999, rewardAmountCents: 270, rewardType: 'cashback_percent', merchantName: 'Amazon', redeemedAt: isoDate(7), payoutStatus: 'credited' },
      { redemptionId: 'rdm_003', offerId: 'off_target_10', transactionId: 'txn_tgt_001', transactionAmountCents: 11234, rewardAmountCents: 1000, rewardType: 'cashback_flat', merchantName: 'Target', redeemedAt: isoDate(14), payoutStatus: 'pending' },
    ],
    totalRewardsCents: 1333,
  }),
  'offers.summary': () => ({
    availableCount: 5,
    activatedCount: 2,
    monthlyRewardsCents: 1333,
    totalRewardsCents: 4250,
    topOffers: [
      { offerId: 'off_starbucks_5', merchant: { merchantId: 'mch_starbucks', name: 'Starbucks', logoUrl: 'https://logo.clearbit.com/starbucks.com', category: 'food_dining' }, headline: '5% cash back at Starbucks', offerType: 'cashback_percent', rewardValue: 500, status: 'available', relevanceScore: 95 },
      { offerId: 'off_amazon_3', merchant: { merchantId: 'mch_amazon', name: 'Amazon', logoUrl: 'https://logo.clearbit.com/amazon.com', category: 'shopping' }, headline: '3% cash back at Amazon', offerType: 'cashback_percent', rewardValue: 300, status: 'available', relevanceScore: 92 },
      { offerId: 'off_netflix_free', merchant: { merchantId: 'mch_netflix', name: 'Netflix', logoUrl: 'https://logo.clearbit.com/netflix.com', category: 'entertainment' }, headline: '$5 back on Netflix', offerType: 'cashback_flat', rewardValue: 500, status: 'activated', relevanceScore: 90 },
    ],
  }),
};

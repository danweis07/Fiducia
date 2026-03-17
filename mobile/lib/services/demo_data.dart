/// Demo Data Layer — mirrors src/lib/demo-data.ts
/// Returns realistic mock data for all gateway actions when demo mode is active.

import '../models/banking.dart';
import '../models/financial_data.dart';
import '../models/savings_goal.dart';
import '../models/secure_message.dart';
import '../models/dispute.dart';

// =============================================================================
// SHARED IDS
// =============================================================================

const _checkingId = 'acct-demo-checking-001';
const _savingsId = 'acct-demo-savings-002';
const _cdId = 'acct-demo-cd-003';
const _loanAutoId = 'loan-demo-auto-001';
const _loanMortgageId = 'loan-demo-mortgage-002';

String _isoDate(int daysAgo) {
  final d = DateTime.now().subtract(Duration(days: daysAgo));
  return d.toIso8601String();
}

String _futureDate(int daysAhead) {
  final d = DateTime.now().add(Duration(days: daysAhead));
  return d.toIso8601String();
}

// =============================================================================
// ACCOUNTS
// =============================================================================

final List<Account> demoAccounts = [
  Account(
    id: _checkingId,
    type: 'checking',
    nickname: 'Primary Checking',
    accountNumberMasked: '****4521',
    routingNumber: '021000021',
    balanceCents: 1254783,
    availableBalanceCents: 1254783,
    status: 'active',
    interestRateBps: 25,
    openedAt: '2023-01-15T00:00:00Z',
  ),
  Account(
    id: _savingsId,
    type: 'savings',
    nickname: 'Emergency Fund',
    accountNumberMasked: '****7832',
    routingNumber: '021000021',
    balanceCents: 4520100,
    availableBalanceCents: 4520100,
    status: 'active',
    interestRateBps: 425,
    openedAt: '2023-03-01T00:00:00Z',
  ),
  Account(
    id: _cdId,
    type: 'cd',
    nickname: '12-Month CD',
    accountNumberMasked: '****9156',
    routingNumber: '021000021',
    balanceCents: 2500000,
    availableBalanceCents: 0,
    status: 'active',
    interestRateBps: 500,
    openedAt: '2024-06-01T00:00:00Z',
  ),
];

// =============================================================================
// TRANSACTIONS
// =============================================================================

List<Transaction> get demoTransactions => [
  Transaction(id: 'txn-001', accountId: _checkingId, type: 'debit', amountCents: -4299, description: 'Whole Foods Market', category: 'groceries', status: 'posted', merchantName: 'Whole Foods', runningBalanceCents: 1254783, postedAt: _isoDate(0), createdAt: _isoDate(0)),
  Transaction(id: 'txn-002', accountId: _checkingId, type: 'debit', amountCents: -1550, description: 'Starbucks Coffee', category: 'dining', status: 'posted', merchantName: 'Starbucks', runningBalanceCents: 1259082, postedAt: _isoDate(1), createdAt: _isoDate(1)),
  Transaction(id: 'txn-003', accountId: _checkingId, type: 'credit', amountCents: 350000, description: 'Payroll - Acme Corp', category: 'income', status: 'posted', runningBalanceCents: 1260632, postedAt: _isoDate(1), createdAt: _isoDate(1)),
  Transaction(id: 'txn-004', accountId: _checkingId, type: 'debit', amountCents: -8500, description: 'Netflix Subscription', category: 'entertainment', status: 'posted', merchantName: 'Netflix', runningBalanceCents: 910632, postedAt: _isoDate(2), createdAt: _isoDate(2)),
  Transaction(id: 'txn-005', accountId: _checkingId, type: 'debit', amountCents: -125000, description: 'Mortgage Payment', category: 'housing', status: 'posted', runningBalanceCents: 919132, postedAt: _isoDate(3), createdAt: _isoDate(3)),
  Transaction(id: 'txn-006', accountId: _checkingId, type: 'debit', amountCents: -3475, description: 'Shell Gas Station', category: 'transportation', status: 'posted', merchantName: 'Shell', runningBalanceCents: 1044132, postedAt: _isoDate(4), createdAt: _isoDate(4)),
  Transaction(id: 'txn-007', accountId: _checkingId, type: 'debit', amountCents: -6200, description: 'Amazon.com', category: 'shopping', status: 'posted', merchantName: 'Amazon', runningBalanceCents: 1047607, postedAt: _isoDate(5), createdAt: _isoDate(5)),
  Transaction(id: 'txn-008', accountId: _checkingId, type: 'transfer', amountCents: -50000, description: 'Transfer to Savings', category: 'transfer', status: 'posted', runningBalanceCents: 1053807, postedAt: _isoDate(6), createdAt: _isoDate(6)),
  Transaction(id: 'txn-009', accountId: _savingsId, type: 'transfer', amountCents: 50000, description: 'Transfer from Checking', category: 'transfer', status: 'posted', runningBalanceCents: 4520100, postedAt: _isoDate(6), createdAt: _isoDate(6)),
  Transaction(id: 'txn-010', accountId: _checkingId, type: 'debit', amountCents: -2999, description: 'CVS Pharmacy', category: 'healthcare', status: 'posted', merchantName: 'CVS', runningBalanceCents: 1103807, postedAt: _isoDate(7), createdAt: _isoDate(7)),
  Transaction(id: 'txn-011', accountId: _savingsId, type: 'interest', amountCents: 1587, description: 'Monthly Interest', category: 'income', status: 'posted', runningBalanceCents: 4470100, postedAt: _isoDate(7), createdAt: _isoDate(7)),
  Transaction(id: 'txn-012', accountId: _checkingId, type: 'debit', amountCents: -15000, description: 'Electric Company', category: 'utilities', status: 'posted', merchantName: 'Con Edison', runningBalanceCents: 1106806, postedAt: _isoDate(8), createdAt: _isoDate(8)),
  Transaction(id: 'txn-013', accountId: _checkingId, type: 'debit', amountCents: -7800, description: 'Target', category: 'shopping', status: 'posted', merchantName: 'Target', runningBalanceCents: 1121806, postedAt: _isoDate(10), createdAt: _isoDate(10)),
  Transaction(id: 'txn-014', accountId: _checkingId, type: 'credit', amountCents: 350000, description: 'Payroll - Acme Corp', category: 'income', status: 'posted', runningBalanceCents: 1129606, postedAt: _isoDate(14), createdAt: _isoDate(14)),
  Transaction(id: 'txn-015', accountId: _checkingId, type: 'debit', amountCents: -4500, description: 'Uber Ride', category: 'transportation', status: 'pending', merchantName: 'Uber', runningBalanceCents: 779606, createdAt: _isoDate(0)),
];

// =============================================================================
// LOANS
// =============================================================================

List<Loan> get demoLoans => [
  Loan(id: _loanAutoId, loanNumberMasked: '****3291', principalCents: 2800000, interestRateBps: 549, termMonths: 60, outstandingBalanceCents: 2245000, principalPaidCents: 555000, interestPaidCents: 128000, nextPaymentDueDate: _futureDate(12), nextPaymentAmountCents: 53482, paymentsRemaining: 42, autopayAccountId: _checkingId, status: 'active', daysPastDue: 0, maturityDate: '2029-01-15T00:00:00Z', createdAt: '2024-01-15T00:00:00Z'),
  Loan(id: _loanMortgageId, loanNumberMasked: '****8174', principalCents: 35000000, interestRateBps: 689, termMonths: 360, outstandingBalanceCents: 33450000, principalPaidCents: 1550000, interestPaidCents: 4200000, nextPaymentDueDate: _futureDate(18), nextPaymentAmountCents: 231245, paymentsRemaining: 318, autopayAccountId: _checkingId, status: 'active', daysPastDue: 0, maturityDate: '2052-06-01T00:00:00Z', createdAt: '2022-06-01T00:00:00Z'),
];

// =============================================================================
// CARDS
// =============================================================================

final List<BankCard> demoCards = [
  BankCard(id: 'card-demo-debit-001', accountId: _checkingId, type: 'debit', lastFour: '4521', cardholderName: 'DEMO USER', status: 'active', dailyLimitCents: 500000, singleTransactionLimitCents: 250000, expirationDate: '12/28', isContactless: true, isVirtual: false),
  BankCard(id: 'card-demo-credit-002', accountId: _checkingId, type: 'credit', lastFour: '9832', cardholderName: 'DEMO USER', status: 'locked', dailyLimitCents: 1000000, singleTransactionLimitCents: 500000, expirationDate: '03/27', isContactless: true, isVirtual: false),
];

// =============================================================================
// BILLS
// =============================================================================

List<Bill> get demoBills => [
  Bill(id: 'bill-001', payeeName: 'Con Edison Electric', payeeAccountNumberMasked: '****4478', amountCents: 15200, dueDate: _futureDate(5), status: 'scheduled', autopay: true, fromAccountId: _checkingId, createdAt: _isoDate(25)),
  Bill(id: 'bill-002', payeeName: 'Verizon Wireless', payeeAccountNumberMasked: '****2211', amountCents: 8999, dueDate: _futureDate(12), status: 'scheduled', autopay: false, fromAccountId: _checkingId, createdAt: _isoDate(10)),
  Bill(id: 'bill-003', payeeName: 'State Farm Insurance', payeeAccountNumberMasked: '****7765', amountCents: 14500, dueDate: _isoDate(3), status: 'paid', autopay: true, fromAccountId: _checkingId, paidAt: _isoDate(3), createdAt: _isoDate(30)),
];

// =============================================================================
// NOTIFICATIONS
// =============================================================================

List<BankNotification> get demoNotifications => [
  BankNotification(id: 'notif-001', type: 'transaction', title: 'Large Transaction Alert', body: 'A debit of \$1,250.00 was posted to your checking account.', isRead: false, actionUrl: '/accounts', createdAt: _isoDate(0)),
  BankNotification(id: 'notif-002', type: 'bill_due', title: 'Bill Due Soon', body: 'Your Con Edison Electric bill of \$152.00 is due in 5 days.', isRead: false, actionUrl: '/bills', createdAt: _isoDate(1)),
  BankNotification(id: 'notif-003', type: 'transfer', title: 'Transfer Completed', body: 'Your transfer of \$500.00 to savings has been completed.', isRead: true, actionUrl: '/transfers', createdAt: _isoDate(3)),
  BankNotification(id: 'notif-004', type: 'security', title: 'New Device Login', body: 'A new login was detected from Chrome on macOS.', isRead: false, createdAt: _isoDate(5)),
  BankNotification(id: 'notif-005', type: 'rdc_status', title: 'Deposit Approved', body: 'Your mobile deposit of \$1,250.00 has been approved.', isRead: true, actionUrl: '/deposit', createdAt: _isoDate(7)),
];

// =============================================================================
// BENEFICIARIES
// =============================================================================

final List<Beneficiary> demoBeneficiaries = [
  Beneficiary(id: 'bene-demo-001', name: 'Jane Smith', nickname: 'Jane', accountNumberMasked: '****6789', bankName: 'Chase Bank', type: 'external', isVerified: true),
  Beneficiary(id: 'bene-demo-002', name: 'Robert Johnson', nickname: 'Bob', accountNumberMasked: '****3456', bankName: 'Bank of America', type: 'external', isVerified: true),
];

// =============================================================================
// RDC DEPOSITS
// =============================================================================

List<RDCDeposit> get demoRDCDeposits => [
  RDCDeposit(id: 'rdc-001', accountId: _checkingId, amountCents: 125000, status: 'cleared', checkNumber: '1042', clearedAt: _isoDate(5), createdAt: _isoDate(7)),
  RDCDeposit(id: 'rdc-002', accountId: _checkingId, amountCents: 75000, status: 'accepted', checkNumber: '2087', createdAt: _isoDate(2)),
];

// =============================================================================
// STATEMENTS
// =============================================================================

List<AccountStatement> generateDemoStatements(String accountId) {
  final statements = <AccountStatement>[];
  for (int i = 0; i < 6; i++) {
    final d = DateTime.now().subtract(Duration(days: 30 * (i + 1)));
    final periodStart = DateTime(d.year, d.month, 1).toIso8601String();
    final periodEnd = DateTime(d.year, d.month + 1, 0).toIso8601String();
    final months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    final label = '${months[d.month - 1]} ${d.year}';
    statements.add(AccountStatement(
      id: 'stmt-${(i + 1).toString().padLeft(3, '0')}',
      accountId: accountId,
      periodLabel: label,
      periodStart: periodStart,
      periodEnd: periodEnd,
      format: 'hybrid',
      openingBalanceCents: 1100000 + i * 50000,
      closingBalanceCents: 1100000 + (i - 1) * 50000,
      totalCreditsCents: 700000,
      totalDebitsCents: 750000,
      transactionCount: 25 + i * 3,
      generatedAt: periodEnd,
    ));
  }
  return statements;
}

// =============================================================================
// STANDING INSTRUCTIONS
// =============================================================================

List<StandingInstruction> get demoStandingInstructions => [
  StandingInstruction(
    id: 'si-001',
    fromAccountId: _checkingId,
    toAccountId: _savingsId,
    transferType: 'account_to_account',
    amountCents: 50000,
    name: 'Monthly Savings Transfer',
    frequency: 'monthly',
    dayOfMonth: 1,
    nextExecutionDate: _futureDate(15),
    status: 'active',
    totalExecutions: 14,
    lastExecutedAt: _isoDate(15),
    createdAt: '2024-01-01T00:00:00Z',
  ),
];

// =============================================================================
// MEMBER PROFILE
// =============================================================================

final BankingUser demoUser = BankingUser(
  id: 'demo-user-001',
  email: 'demo@example.com',
  firstName: 'Demo',
  lastName: 'User',
  phone: '(555) 123-4567',
  kycStatus: 'approved',
  mfaEnabled: true,
);

List<MemberAddress> get demoAddresses => [
  MemberAddress(id: 'addr-001', type: 'home', isPrimary: true, line1: '742 Evergreen Terrace', city: 'Springfield', state: 'IL', zip: '62704', country: 'US', verifiedAt: _isoDate(90)),
  MemberAddress(id: 'addr-002', type: 'mailing', isPrimary: false, line1: 'PO Box 1234', city: 'Springfield', state: 'IL', zip: '62705', country: 'US'),
];

final List<MemberDocument> demoDocuments = [
  MemberDocument(id: 'doc-001', type: 'drivers_license', label: "Driver's License", documentNumberMasked: '****4521', issuingAuthority: 'Illinois SOS', issuedDate: '2022-03-15', expirationDate: '2026-03-15', status: 'verified'),
];

final List<MemberIdentifier> demoIdentifiers = [
  MemberIdentifier(id: 'ident-001', type: 'ssn', valueMasked: '***-**-6789', isPrimary: true),
  MemberIdentifier(id: 'ident-002', type: 'member_number', valueMasked: 'MBR****4521', isPrimary: false),
];

// =============================================================================
// LOCATIONS
// =============================================================================

final List<BranchLocation> demoLocations = [
  BranchLocation(id: 'loc-001', name: 'Demo CU Main Branch', type: 'branch', latitude: 39.7817, longitude: -89.6501, address: '100 N Main St', city: 'Springfield', state: 'IL', zip: '62701', phone: '(217) 555-0100', distanceMiles: 0.5, hours: {'Mon': '9AM-5PM', 'Tue': '9AM-5PM', 'Wed': '9AM-5PM', 'Thu': '9AM-5PM', 'Fri': '9AM-6PM', 'Sat': '9AM-12PM', 'Sun': 'Closed'}, services: ['ATM', 'Drive-through', 'Safe deposit', 'Notary'], isOpen: true, isDepositAccepting: true),
  BranchLocation(id: 'loc-002', name: 'Demo CU ATM - Grocery Store', type: 'atm', latitude: 39.7900, longitude: -89.6400, address: '500 S Grand Ave', city: 'Springfield', state: 'IL', zip: '62703', distanceMiles: 1.2, services: ['ATM', 'Deposits'], isOpen: true, isDepositAccepting: true, network: 'CO-OP'),
];

// =============================================================================
// CMS CONTENT
// =============================================================================

final List<CMSContent> demoCMSContent = [
  CMSContent(id: 'cms-001', slug: 'welcome-announcement', title: 'Welcome to Digital Banking', body: 'We are excited to launch our new digital banking platform.', contentType: 'announcement', status: 'published', channels: ['web_portal', 'mobile_app'], metadata: {'priority': 'high'}, publishedAt: _isoDate(7), createdAt: _isoDate(14)),
  CMSContent(id: 'cms-002', slug: 'cd-rate-promotion', title: '5.00% APY on 12-Month CDs', body: 'Lock in a great rate! Open a 12-Month Certificate of Deposit today.', contentType: 'promotion', status: 'published', channels: ['web_portal', 'mobile_app'], metadata: {'priority': 'medium'}, publishedAt: _isoDate(3), expiresAt: _futureDate(30), createdAt: _isoDate(5)),
  CMSContent(id: 'cms-006', slug: 'maintenance-banner', title: 'Scheduled Maintenance', body: 'Online banking will be unavailable Saturday 2AM-6AM for scheduled maintenance.', contentType: 'banner', status: 'published', channels: ['web_portal', 'mobile_app'], metadata: {'variant': 'warning'}, publishedAt: _isoDate(1), createdAt: _isoDate(1)),
];

// =============================================================================
// FINANCIAL DATA & INSIGHTS
// =============================================================================

final SpendingSummary demoSpendingSummary = SpendingSummary(
  totalSpendingCents: 385200,
  totalIncomeCents: 650000,
  netCashFlowCents: 264800,
  avgDailySpendingCents: 12840,
  periodStart: DateTime.now().subtract(const Duration(days: 30)).toIso8601String().split('T')[0],
  periodEnd: DateTime.now().toIso8601String().split('T')[0],
  byCategory: [
    SpendingByCategory(category: 'housing', totalCents: 150000, transactionCount: 1, percentOfTotal: 38.9, trend: 'stable', changeFromPreviousCents: 0, topMerchants: [TopMerchant(name: 'Rent Payment', totalCents: 150000)]),
    SpendingByCategory(category: 'food_dining', totalCents: 62300, transactionCount: 18, percentOfTotal: 16.2, trend: 'up', changeFromPreviousCents: 8500, topMerchants: [TopMerchant(name: 'Starbucks', totalCents: 14500, logoUrl: 'https://logo.clearbit.com/starbucks.com'), TopMerchant(name: 'Chipotle', totalCents: 9800, logoUrl: 'https://logo.clearbit.com/chipotle.com')]),
    SpendingByCategory(category: 'groceries', totalCents: 48700, transactionCount: 8, percentOfTotal: 12.6, trend: 'stable', changeFromPreviousCents: -2100, topMerchants: [TopMerchant(name: 'Whole Foods', totalCents: 28400, logoUrl: 'https://logo.clearbit.com/wholefoodsmarket.com')]),
    SpendingByCategory(category: 'transportation', totalCents: 35800, transactionCount: 12, percentOfTotal: 9.3, trend: 'down', changeFromPreviousCents: -5200, topMerchants: [TopMerchant(name: 'Chevron', totalCents: 18500, logoUrl: 'https://logo.clearbit.com/chevron.com')]),
    SpendingByCategory(category: 'shopping', totalCents: 38200, transactionCount: 5, percentOfTotal: 9.9, trend: 'up', changeFromPreviousCents: 12400, topMerchants: [TopMerchant(name: 'Amazon', totalCents: 28700, logoUrl: 'https://logo.clearbit.com/amazon.com')]),
    SpendingByCategory(category: 'subscriptions', totalCents: 24900, transactionCount: 6, percentOfTotal: 6.5, trend: 'stable', changeFromPreviousCents: 0, topMerchants: [TopMerchant(name: 'Netflix', totalCents: 1599, logoUrl: 'https://logo.clearbit.com/netflix.com')]),
  ],
);

final List<MonthlyTrend> demoMonthlyTrends = [
  MonthlyTrend(month: '2026-03', spendingCents: 385200, incomeCents: 650000, savingsCents: 264800, topCategory: 'housing'),
  MonthlyTrend(month: '2026-02', spendingCents: 362100, incomeCents: 650000, savingsCents: 287900, topCategory: 'housing'),
  MonthlyTrend(month: '2026-01', spendingCents: 410500, incomeCents: 650000, savingsCents: 239500, topCategory: 'housing'),
  MonthlyTrend(month: '2025-12', spendingCents: 485300, incomeCents: 675000, savingsCents: 189700, topCategory: 'shopping'),
  MonthlyTrend(month: '2025-11', spendingCents: 345600, incomeCents: 650000, savingsCents: 304400, topCategory: 'housing'),
  MonthlyTrend(month: '2025-10', spendingCents: 378900, incomeCents: 650000, savingsCents: 271100, topCategory: 'housing'),
];

final BudgetSummary demoBudgetSummary = BudgetSummary(
  budgets: [
    Budget(budgetId: 'bgt-001', category: 'food_dining', limitCents: 60000, spentCents: 62300, remainingCents: -2300, percentUsed: 103.8, isOverBudget: true, projectedCents: 68500),
    Budget(budgetId: 'bgt-002', category: 'groceries', limitCents: 50000, spentCents: 48700, remainingCents: 1300, percentUsed: 97.4, isOverBudget: false, projectedCents: 52100),
    Budget(budgetId: 'bgt-003', category: 'transportation', limitCents: 40000, spentCents: 35800, remainingCents: 4200, percentUsed: 89.5, isOverBudget: false, projectedCents: 38200),
    Budget(budgetId: 'bgt-004', category: 'shopping', limitCents: 30000, spentCents: 38200, remainingCents: -8200, percentUsed: 127.3, isOverBudget: true, projectedCents: 42500),
  ],
  totalBudgetCents: 180000,
  totalSpentCents: 185000,
);

final RecurringSummary demoRecurringSummary = RecurringSummary(
  recurring: [
    RecurringTransaction(recurringId: 'rec-001', merchantName: 'Netflix', merchantLogoUrl: 'https://logo.clearbit.com/netflix.com', category: 'subscriptions', averageAmountCents: 1599, lastAmountCents: 1599, frequency: 'monthly', nextExpectedDate: _futureDate(18), isActive: true, lastChargeDate: _isoDate(12), chargeCount: 24),
    RecurringTransaction(recurringId: 'rec-002', merchantName: 'Spotify', merchantLogoUrl: 'https://logo.clearbit.com/spotify.com', category: 'subscriptions', averageAmountCents: 1099, lastAmountCents: 1099, frequency: 'monthly', nextExpectedDate: _futureDate(22), isActive: true, lastChargeDate: _isoDate(8), chargeCount: 36),
    RecurringTransaction(recurringId: 'rec-003', merchantName: 'Planet Fitness', merchantLogoUrl: 'https://logo.clearbit.com/planetfitness.com', category: 'personal_care', averageAmountCents: 2499, lastAmountCents: 2499, frequency: 'monthly', nextExpectedDate: _futureDate(3), isActive: true, lastChargeDate: _isoDate(27), chargeCount: 18),
    RecurringTransaction(recurringId: 'rec-004', merchantName: 'AT&T Wireless', merchantLogoUrl: 'https://logo.clearbit.com/att.com', category: 'utilities', averageAmountCents: 8599, lastAmountCents: 8599, frequency: 'monthly', nextExpectedDate: _futureDate(12), isActive: true, lastChargeDate: _isoDate(18), chargeCount: 48),
  ],
  totalMonthlyCents: 13796,
  totalAnnualCents: 165552,
);

final NetWorthSnapshot demoNetWorth = NetWorthSnapshot(
  date: DateTime.now().toIso8601String().split('T')[0],
  totalAssetsCents: 18524300,
  totalLiabilitiesCents: 3245800,
  netWorthCents: 15278500,
  accounts: [
    NetWorthAccount(accountId: _checkingId, name: 'Primary Checking', type: 'asset', balanceCents: 1254300),
    NetWorthAccount(accountId: _savingsId, name: 'Premium Savings', type: 'asset', balanceCents: 4520000),
    NetWorthAccount(accountId: _cdId, name: '12-Month CD', type: 'asset', balanceCents: 2500000),
    NetWorthAccount(accountId: 'ext-brokerage', name: 'Brokerage Account', type: 'asset', balanceCents: 10250000, institution: 'Fidelity'),
    NetWorthAccount(accountId: _loanAutoId, name: 'Auto Loan', type: 'liability', balanceCents: -1800000),
    NetWorthAccount(accountId: _loanMortgageId, name: 'Home Mortgage', type: 'liability', balanceCents: -1200000),
  ],
);

// =============================================================================
// CARD-LINKED OFFERS
// =============================================================================

final List<MerchantOffer> demoOffers = [
  MerchantOffer(offerId: 'off_starbucks_5', merchant: MerchantInfo(merchantId: 'mch_starbucks', name: 'Starbucks', logoUrl: 'https://logo.clearbit.com/starbucks.com', category: 'food_dining'), headline: '5% cash back at Starbucks', description: 'Earn 5% cash back on all purchases at Starbucks locations.', offerType: 'cashback_percent', rewardValue: 500, minimumSpendCents: 1000, maximumRewardCents: 2500, status: 'available', expiresAt: _futureDate(30), isPersonalized: true, relevanceScore: 95, tags: ['coffee', 'food', 'popular']),
  MerchantOffer(offerId: 'off_amazon_3', merchant: MerchantInfo(merchantId: 'mch_amazon', name: 'Amazon', logoUrl: 'https://logo.clearbit.com/amazon.com', category: 'shopping'), headline: '3% cash back at Amazon', description: 'Get 3% back on Amazon.com purchases.', offerType: 'cashback_percent', rewardValue: 300, maximumRewardCents: 5000, status: 'available', expiresAt: _futureDate(45), isPersonalized: true, relevanceScore: 92, tags: ['shopping', 'online', 'popular']),
  MerchantOffer(offerId: 'off_target_10', merchant: MerchantInfo(merchantId: 'mch_target', name: 'Target', logoUrl: 'https://logo.clearbit.com/target.com', category: 'shopping'), headline: '\$10 back when you spend \$75 at Target', description: 'Get \$10 cash back on your next Target purchase of \$75 or more.', offerType: 'cashback_flat', rewardValue: 1000, minimumSpendCents: 7500, status: 'available', expiresAt: _futureDate(14), isPersonalized: false, relevanceScore: 85, tags: ['shopping', 'retail']),
  MerchantOffer(offerId: 'off_chevron_10c', merchant: MerchantInfo(merchantId: 'mch_chevron', name: 'Chevron', logoUrl: 'https://logo.clearbit.com/chevron.com', category: 'transportation'), headline: '10c off per gallon at Chevron', description: 'Save 10 cents per gallon on fuel.', offerType: 'discount_flat', rewardValue: 10, status: 'activated', activatedAt: _isoDate(5), expiresAt: _futureDate(25), isPersonalized: false, relevanceScore: 72, tags: ['fuel', 'gas']),
  MerchantOffer(offerId: 'off_netflix_free', merchant: MerchantInfo(merchantId: 'mch_netflix', name: 'Netflix', logoUrl: 'https://logo.clearbit.com/netflix.com', category: 'entertainment'), headline: '\$5 back on your Netflix subscription', description: 'Get \$5 cash back on your next Netflix billing cycle.', offerType: 'cashback_flat', rewardValue: 500, status: 'activated', activatedAt: _isoDate(10), expiresAt: _futureDate(20), isPersonalized: true, relevanceScore: 90, tags: ['streaming', 'entertainment']),
];

final List<OfferRedemption> demoRedemptions = [
  OfferRedemption(redemptionId: 'rdm_001', offerId: 'off_starbucks_5', transactionId: 'txn_sb_001', transactionAmountCents: 1250, rewardAmountCents: 63, rewardType: 'cashback_percent', merchantName: 'Starbucks', redeemedAt: _isoDate(3), payoutStatus: 'credited'),
  OfferRedemption(redemptionId: 'rdm_002', offerId: 'off_amazon_3', transactionId: 'txn_amz_001', transactionAmountCents: 8999, rewardAmountCents: 270, rewardType: 'cashback_percent', merchantName: 'Amazon', redeemedAt: _isoDate(7), payoutStatus: 'credited'),
  OfferRedemption(redemptionId: 'rdm_003', offerId: 'off_target_10', transactionId: 'txn_tgt_001', transactionAmountCents: 11234, rewardAmountCents: 1000, rewardType: 'cashback_flat', merchantName: 'Target', redeemedAt: _isoDate(14), payoutStatus: 'pending'),
];

final OfferSummary demoOfferSummary = OfferSummary(
  availableCount: 3,
  activatedCount: 2,
  monthlyRewardsCents: 1333,
  totalRewardsCents: 4250,
  topOffers: demoOffers.take(3).toList(),
);

// =============================================================================
// SAVINGS GOALS
// =============================================================================

List<SavingsGoal> get demoSavingsGoals => [
  SavingsGoal(id: 'goal-001', name: 'Emergency Fund', targetCents: 1000000, currentCents: 452010, accountId: _savingsId, targetDate: _futureDate(180), createdAt: _isoDate(120)),
  SavingsGoal(id: 'goal-002', name: 'Vacation to Hawaii', targetCents: 500000, currentCents: 175000, targetDate: _futureDate(90), createdAt: _isoDate(60)),
  SavingsGoal(id: 'goal-003', name: 'New Laptop', targetCents: 200000, currentCents: 200000, status: 'completed', createdAt: _isoDate(180)),
];

// =============================================================================
// SECURE MESSAGING
// =============================================================================

List<MessageThread> get demoMessageThreads => [
  MessageThread(id: 'thread-001', subject: 'Question about CD rates', status: 'open', messageCount: 3, unreadCount: 1, lastMessageAt: _isoDate(1), createdAt: _isoDate(5)),
  MessageThread(id: 'thread-002', subject: 'Wire transfer help', status: 'closed', messageCount: 4, unreadCount: 0, lastMessageAt: _isoDate(10), createdAt: _isoDate(14)),
];

List<SecureMessage> get demoMessages => [
  SecureMessage(id: 'msg-001', threadId: 'thread-001', body: 'Hi, I was wondering about the current CD rates for a 12-month term.', senderType: 'member', isRead: true, createdAt: _isoDate(5)),
  SecureMessage(id: 'msg-002', threadId: 'thread-001', body: 'Hello! Our current 12-month CD rate is 5.00% APY. Would you like to open one?', senderType: 'agent', senderName: 'Sarah M.', isRead: true, createdAt: _isoDate(4)),
  SecureMessage(id: 'msg-003', threadId: 'thread-001', body: 'That sounds great! What is the minimum deposit?', senderType: 'member', isRead: false, createdAt: _isoDate(1)),
  SecureMessage(id: 'msg-004', threadId: 'thread-002', body: 'I need help with an international wire transfer.', senderType: 'member', isRead: true, createdAt: _isoDate(14)),
  SecureMessage(id: 'msg-005', threadId: 'thread-002', body: 'I can help with that. International wires have a \$45 fee. What country are you sending to?', senderType: 'agent', senderName: 'John D.', isRead: true, createdAt: _isoDate(13)),
  SecureMessage(id: 'msg-006', threadId: 'thread-002', body: 'To the UK. About \$5,000.', senderType: 'member', isRead: true, createdAt: _isoDate(12)),
  SecureMessage(id: 'msg-007', threadId: 'thread-002', body: 'I have processed your wire transfer. You should see it complete in 1-2 business days.', senderType: 'agent', senderName: 'John D.', isRead: true, createdAt: _isoDate(10)),
];

// =============================================================================
// DISPUTES
// =============================================================================

List<Dispute> get demoDisputes => [
  Dispute(id: 'disp-001', transactionId: 'txn-007', reason: 'unauthorized', description: 'I did not make this Amazon purchase', amountCents: 6200, status: 'investigating', assignedTo: 'Claims Dept.', createdAt: _isoDate(3)),
  Dispute(id: 'disp-002', transactionId: 'txn-004', reason: 'duplicate_charge', description: 'Netflix charged me twice this month', amountCents: 8500, status: 'resolved', resolution: 'Credit issued to your account', createdAt: _isoDate(20), resolvedAt: _isoDate(15)),
];

// =============================================================================
// SPENDING ALERTS
// =============================================================================

final List<Map<String, dynamic>> demoSpendingAlerts = [
  {'id': 'alert-001', 'name': 'Large purchase alert', 'thresholdCents': 50000, 'category': null, 'accountId': _checkingId, 'channels': ['push', 'in_app'], 'enabled': true},
  {'id': 'alert-002', 'name': 'Dining budget warning', 'thresholdCents': 30000, 'category': 'dining', 'accountId': null, 'channels': ['push'], 'enabled': true},
];

// =============================================================================
// SESSIONS
// =============================================================================

List<Map<String, dynamic>> get demoSessions => [
  {'id': 'sess-001', 'device': 'iPhone 15 Pro', 'browser': 'Mobile App', 'ip': '192.168.1.***', 'location': 'Springfield, IL', 'lastActive': _isoDate(0), 'isCurrent': true},
  {'id': 'sess-002', 'device': 'MacBook Pro', 'browser': 'Chrome 120', 'ip': '10.0.0.***', 'location': 'Springfield, IL', 'lastActive': _isoDate(1), 'isCurrent': false},
];

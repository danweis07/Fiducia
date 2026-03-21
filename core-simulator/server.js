/**
 * Core Banking Simulator
 *
 * A sidecar container that mimics CU*Answers (It's Me 247 API), Symitar
 * (SymXchange), and Fineract REST endpoints. Returns realistic mock data
 * with configurable latency, error injection, and rate limiting.
 *
 * Environment variables:
 *   PORT                    — Server port (default: 9090)
 *   SIMULATED_LATENCY_MS    — Base latency per request (default: 50)
 *   LATENCY_JITTER_MS       — Random jitter added to latency (default: 30)
 *   ERROR_RATE              — Fraction of requests that return errors (default: 0)
 *   CORE_BUSY_RATE          — Fraction of requests that return 503 (default: 0)
 *   MTLS_ENABLED            — Enable mutual TLS (default: false)
 *   MTLS_CERT_DIR           — Directory containing ca.crt, server.crt, server.key (default: /certs)
 *   MTLS_REJECT_UNAUTHORIZED — Reject clients without valid cert (default: true)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '9090', 10);
const BASE_LATENCY = parseInt(process.env.SIMULATED_LATENCY_MS || '50', 10);
const JITTER = parseInt(process.env.LATENCY_JITTER_MS || '30', 10);
const ERROR_RATE = parseFloat(process.env.ERROR_RATE || '0');
const CORE_BUSY_RATE = parseFloat(process.env.CORE_BUSY_RATE || '0');

// =============================================================================
// MIDDLEWARE — latency simulation + error injection
// =============================================================================

async function simulateLatency(_req, _res, next) {
  const delay = BASE_LATENCY + Math.floor(Math.random() * JITTER);
  await new Promise((r) => setTimeout(r, delay));
  next();
}

function injectErrors(req, res, next) {
  if (req.path === '/health') return next();

  if (Math.random() < CORE_BUSY_RATE) {
    return res.status(503).json({
      error: 'Core Busy',
      message: 'The core banking system is temporarily unavailable. Please retry.',
      code: 'CORE_BUSY',
      retryAfterMs: 2000,
    });
  }

  if (Math.random() < ERROR_RATE) {
    const errors = [
      { status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred in the core system' },
      { status: 408, code: 'TIMEOUT', message: 'Core request timed out after 30000ms' },
      { status: 502, code: 'BAD_GATEWAY', message: 'Failed to reach upstream core processor' },
      { status: 429, code: 'RATE_LIMITED', message: 'Too many requests — throttled by core' },
    ];
    const err = errors[Math.floor(Math.random() * errors.length)];
    return res.status(err.status).json({ error: err.code, message: err.message });
  }

  next();
}

app.use(simulateLatency);
app.use(injectErrors);

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// DEMO DATA
// =============================================================================

const CREDIT_UNION_ID = 'CU00247';
const ROUTING_NUMBER = '091000019';

const MEMBERS = {
  'member-001': {
    account_base: '000012847',
    organization_name: '',
    first_name: 'John',
    last_name: 'Doe',
    middle_initial: 'A',
    membership_type: 'individual',
    email_address: 'john.doe@example.com',
    address_line_1: '742 Evergreen Terrace',
    address_line_2: 'Apt 3B',
    zip_code: '62704',
    state: 'IL',
    ssn_tin: '***-**-4523',
    date_opened: '2023-06-15',
    routing_number: ROUTING_NUMBER,
  },
};

const ACCOUNTS = {
  'member-001': [
    {
      account_type: { id: 0, description: 'Share Draft' },
      name: 'Primary Checking',
      current_balance: 28475.23,
      account_description: 'Share Draft / Checking',
      last_transaction_date: '2026-03-09',
      available_balance: 27475.23,
      close_date: '',
      account_id: 'acct-sim-checking-1',
      micr_account_number: '0000128474521',
      account_base: '000012847',
      account_suffix: '4521',
    },
    {
      account_type: { id: 1, description: 'Regular Savings' },
      name: 'Emergency Fund',
      current_balance: 152300.50,
      account_description: 'Regular Savings',
      last_transaction_date: '2026-03-01',
      available_balance: 152300.50,
      close_date: '',
      account_id: 'acct-sim-savings-1',
      micr_account_number: '0000128478903',
      account_base: '000012847',
      account_suffix: '8903',
    },
    {
      account_type: { id: 3, description: 'Money Market' },
      name: 'Premium Money Market',
      current_balance: 50123.00,
      account_description: 'Money Market',
      last_transaction_date: '2026-03-01',
      available_balance: 50123.00,
      close_date: '',
      account_id: 'acct-sim-mm-1',
      micr_account_number: '0000128476745',
      account_base: '000012847',
      account_suffix: '6745',
    },
    {
      account_type: { id: 4, description: 'Certificate of Deposit' },
      name: '12-Month CD',
      current_balance: 25000.00,
      account_description: 'Certificate of Deposit',
      last_transaction_date: '2025-03-01',
      available_balance: 0,
      close_date: '',
      account_id: 'acct-sim-cd-1',
      micr_account_number: '0000128472210',
      account_base: '000012847',
      account_suffix: '2210',
    },
  ],
};

function generateTransactions(accountId, count = 25) {
  const merchants = [
    { name: 'Whole Foods Market', category: 'groceries', min: 15, max: 120 },
    { name: 'Shell Gas Station', category: 'transportation', min: 25, max: 75 },
    { name: 'Starbucks Coffee', category: 'dining', min: 4, max: 12 },
    { name: 'Amazon.com', category: 'shopping', min: 10, max: 250 },
    { name: 'Netflix', category: 'entertainment', min: 15.49, max: 15.49 },
    { name: 'Chipotle Mexican Grill', category: 'dining', min: 8, max: 18 },
    { name: 'Target', category: 'shopping', min: 20, max: 150 },
    { name: 'Walgreens', category: 'health', min: 5, max: 45 },
    { name: 'Uber', category: 'transportation', min: 8, max: 40 },
    { name: 'Home Depot', category: 'home', min: 15, max: 300 },
  ];

  const txns = [];
  let balance = 28475.23;
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Every 14 days is a payroll deposit
    if (i % 14 === 0 && i > 0) {
      balance += 3250.00;
      txns.push({
        id: 10000 + i,
        status: 'active',
        comment: 'Payroll - Direct Deposit',
        description: 'PAYROLL ACME CORP ACH',
        activity_date: dateStr,
        post_date: dateStr,
        effective_date: dateStr,
        amount: 3250.00,
        balance,
        transaction_code: 'ACH',
        withdrawal_or_deposit: { id: 1, description: 'Deposit' },
      });
      continue;
    }

    const merchant = merchants[i % merchants.length];
    const amount = +(merchant.min + Math.random() * (merchant.max - merchant.min)).toFixed(2);
    balance -= amount;

    txns.push({
      id: 10000 + i,
      status: i < 2 ? 'pending' : 'active',
      comment: '',
      description: `POS ${merchant.name.toUpperCase()}`,
      activity_date: dateStr,
      post_date: i < 2 ? '' : dateStr,
      effective_date: dateStr,
      amount: -amount,
      balance: +balance.toFixed(2),
      transaction_code: 'POS',
      withdrawal_or_deposit: { id: 0, description: 'Withdrawal' },
    });
  }

  return txns;
}

// Cache generated transactions per account
const txnCache = {};

// =============================================================================
// CU*ANSWERS API ROUTES — /api/credit_unions/:cuId/...
// =============================================================================

// Health / availability
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    simulator: 'fiducia-core-simulator',
    version: '1.0.0',
    uptime: process.uptime(),
    config: {
      latencyMs: BASE_LATENCY,
      jitterMs: JITTER,
      errorRate: ERROR_RATE,
      coreBusyRate: CORE_BUSY_RATE,
    },
    mtls: {
      enabled: MTLS_ENABLED,
      clientAuthenticated: req.client && req.client.authorized === true,
    },
  });
});

app.get('/api/credit_unions/:cuId/available', (req, res) => {
  res.json({ data: { credit_union_id: req.params.cuId, available: true } });
});

// Member lookup
app.get('/api/credit_unions/:cuId/membership/members/:memberId', (req, res) => {
  const member = MEMBERS[req.params.memberId];
  if (!member) {
    return res.status(404).json({ error: 'MEMBER_NOT_FOUND', message: `Member ${req.params.memberId} not found` });
  }
  res.json({ data: member });
});

// List accounts
app.get('/api/credit_unions/:cuId/membership/members/:memberId/accounts', (req, res) => {
  const accounts = ACCOUNTS[req.params.memberId] || [];
  res.json({ data: accounts });
});

// List transactions
app.get('/api/credit_unions/:cuId/membership/members/:memberId/accounts/:accountId/transactions', (req, res) => {
  const cacheKey = `${req.params.memberId}:${req.params.accountId}`;
  if (!txnCache[cacheKey]) {
    txnCache[cacheKey] = generateTransactions(req.params.accountId);
  }

  const limit = parseInt(req.query.limit || '50', 10);
  const offset = parseInt(req.query.offset || '0', 10);
  const txns = txnCache[cacheKey];

  res.json({
    data: txns.slice(offset, offset + limit),
    _pagination: {
      prev: offset > 0 ? `?limit=${limit}&offset=${Math.max(0, offset - limit)}` : '',
      next: offset + limit < txns.length ? `?limit=${limit}&offset=${offset + limit}` : '',
    },
  });
});

// Create tracker (transfer proxy)
app.post('/api/credit_unions/:cuId/membership/members/:memberId/trackers', (req, res) => {
  res.status(201).json({
    data: {
      id: Date.now(),
      ...req.body,
      created_date: new Date().toISOString(),
      status: 'A',
    },
  });
});

// =============================================================================
// SYMITAR / SymXchange ROUTES — /symxchange/...
// =============================================================================

app.get('/symxchange/accounts/:memberId', (req, res) => {
  const accounts = ACCOUNTS[req.params.memberId] || ACCOUNTS['member-001'];
  res.json({
    AccountList: accounts.map((a) => ({
      AccountNumber: a.micr_account_number,
      AccountType: a.account_description,
      Balance: a.current_balance,
      AvailableBalance: a.available_balance,
      Description: a.name,
      Status: a.close_date ? 'Closed' : 'Open',
    })),
  });
});

app.get('/symxchange/transactions/:accountId', (req, res) => {
  const cacheKey = `symitar:${req.params.accountId}`;
  if (!txnCache[cacheKey]) {
    txnCache[cacheKey] = generateTransactions(req.params.accountId);
  }

  const txns = txnCache[cacheKey];
  res.json({
    TransactionList: txns.map((t) => ({
      TransactionId: t.id,
      PostDate: t.post_date,
      EffectiveDate: t.effective_date,
      Amount: t.amount,
      Description: t.description,
      Balance: t.balance,
      Status: t.status === 'active' ? 'Posted' : 'Pending',
    })),
  });
});

// =============================================================================
// FINERACT ROUTES — /fineract-provider/api/v1/...
// =============================================================================

app.get('/fineract-provider/api/v1/savingsaccounts', (_req, res) => {
  const accounts = ACCOUNTS['member-001'];
  res.json({
    totalFilteredRecords: accounts.length,
    pageItems: accounts.map((a) => ({
      id: a.account_id,
      accountNo: a.micr_account_number,
      productName: a.account_description,
      status: { value: 'Active' },
      summary: {
        accountBalance: a.current_balance,
        availableBalance: a.available_balance,
      },
    })),
  });
});

app.get('/fineract-provider/api/v1/savingsaccounts/:id/transactions', (req, res) => {
  const cacheKey = `fineract:${req.params.id}`;
  if (!txnCache[cacheKey]) {
    txnCache[cacheKey] = generateTransactions(req.params.id);
  }

  const txns = txnCache[cacheKey];
  res.json({
    totalFilteredRecords: txns.length,
    pageItems: txns.map((t) => ({
      id: t.id,
      transactionType: { value: t.amount < 0 ? 'Withdrawal' : 'Deposit' },
      amount: Math.abs(t.amount),
      runningBalance: t.balance,
      date: t.activity_date.split('-').map(Number),
      submittedOnDate: t.activity_date.split('-').map(Number),
    })),
  });
});

// =============================================================================
// FINERACT — FIXED DEPOSIT ROUTES
// =============================================================================

const FIXED_DEPOSITS = [
  {
    id: 'fd-001',
    accountNo: '00001284700FD01',
    clientId: 1,
    productName: '12-Month Fixed Deposit',
    shortProductName: 'Fixed Deposit',
    status: { id: 300, code: 'fixedDepositAccountStatusType.active', value: 'Active' },
    currency: { code: 'USD', decimalPlaces: 2 },
    nominalAnnualInterestRate: 5.25,
    depositAmount: 25000.00,
    maturityAmount: 26312.50,
    maturityDate: [2027, 3, 15],
    depositPeriod: 12,
    depositPeriodFrequency: { id: 2, code: 'depositPeriodFrequency.months', value: 'Months' },
    summary: { accountBalance: 25656.25, totalDeposits: 25000.00, totalInterestEarned: 656.25 },
    activatedOnDate: [2026, 3, 15],
    closedOnDate: null,
  },
];

const RECURRING_DEPOSITS = [
  {
    id: 'rd-001',
    accountNo: '00001284700RD01',
    clientId: 1,
    productName: 'Monthly Recurring Deposit',
    shortProductName: 'Recurring Deposit',
    status: { id: 300, code: 'recurringDepositAccountStatusType.active', value: 'Active' },
    currency: { code: 'USD', decimalPlaces: 2 },
    nominalAnnualInterestRate: 4.50,
    mandatoryRecommendedDepositAmount: 500.00,
    depositPeriod: 24,
    depositPeriodFrequency: { id: 2, code: 'depositPeriodFrequency.months', value: 'Months' },
    recurringDepositFrequency: 1,
    recurringDepositFrequencyType: { id: 2, code: 'recurringFrequency.months', value: 'Months' },
    summary: { accountBalance: 6135.00, totalDeposits: 6000.00, totalInterestEarned: 135.00 },
    activatedOnDate: [2025, 3, 1],
    closedOnDate: null,
  },
];

const SHARE_ACCOUNTS = [
  {
    id: 'share-001',
    accountNo: '00001284700SH01',
    clientId: 1,
    productName: 'Membership Shares',
    shortProductName: 'Shares',
    status: { id: 300, code: 'shareAccountStatusType.active', value: 'Active' },
    currency: { code: 'USD', decimalPlaces: 2 },
    totalApprovedShares: 100,
    totalPendingForApprovalShares: 0,
    unitPrice: 25.00,
    activatedDate: [2023, 6, 15],
    closedDate: null,
  },
];

const LOAN_ACCOUNTS = [
  {
    id: 'loan-001',
    accountNo: '00001284700LN01',
    clientId: 1,
    groupId: null,
    productName: 'Personal Microloan',
    shortProductName: 'Microloan',
    status: { id: 300, code: 'loanStatusType.active', value: 'Active' },
    currency: { code: 'USD', decimalPlaces: 2 },
    principal: 5000.00,
    annualInterestRate: 12.00,
    numberOfRepayments: 12,
    repaymentEvery: 1,
    repaymentFrequencyType: { id: 2, code: 'repaymentFrequency.months', value: 'Months' },
    loanType: { id: 1, code: 'loanType.individual', value: 'Individual' },
    summary: {
      principalDisbursed: 5000.00,
      principalPaid: 2500.00,
      principalOutstanding: 2500.00,
      interestCharged: 600.00,
      interestPaid: 325.00,
      interestOutstanding: 275.00,
      totalExpectedRepayment: 5600.00,
      totalRepayment: 2825.00,
      totalOutstanding: 2775.00,
      totalOverdue: 0,
    },
    timeline: {
      submittedOnDate: [2025, 9, 1],
      approvedOnDate: [2025, 9, 3],
      expectedDisbursementDate: [2025, 9, 5],
      actualDisbursementDate: [2025, 9, 5],
      expectedMaturityDate: [2026, 9, 5],
      closedOnDate: null,
    },
  },
];

// --- Mifos Group/Center Lending (JLG, SHG, VSLA) ---

const GROUPS = [
  {
    id: 1,
    accountNo: 'GRP000001',
    name: 'Umoja Self-Help Group',
    externalId: 'shg-umoja-001',
    status: { id: 300, code: 'group.status.active', value: 'Active' },
    activationDate: [2024, 1, 15],
    officeId: 1,
    officeName: 'Head Office',
    centerId: 1,
    centerName: 'Nairobi Financial Inclusion Center',
    clientMembers: [
      { id: 1, displayName: 'John Doe' },
      { id: 2, displayName: 'Jane Kamau' },
      { id: 3, displayName: 'Peter Ochieng' },
      { id: 4, displayName: 'Mary Wanjiku' },
      { id: 5, displayName: 'Samuel Kiprop' },
    ],
  },
  {
    id: 2,
    accountNo: 'GRP000002',
    name: 'Ujamaa Village Savings',
    externalId: 'vsla-ujamaa-001',
    status: { id: 300, code: 'group.status.active', value: 'Active' },
    activationDate: [2024, 6, 1],
    officeId: 1,
    officeName: 'Head Office',
    centerId: 1,
    centerName: 'Nairobi Financial Inclusion Center',
    clientMembers: [
      { id: 1, displayName: 'John Doe' },
      { id: 6, displayName: 'Fatima Abdi' },
      { id: 7, displayName: 'Grace Mutua' },
    ],
  },
];

const CENTERS = [
  {
    id: 1,
    accountNo: 'CTR000001',
    name: 'Nairobi Financial Inclusion Center',
    externalId: 'center-nairobi-001',
    status: { id: 300, code: 'center.status.active', value: 'Active' },
    activationDate: [2023, 6, 1],
    officeId: 1,
    officeName: 'Head Office',
    groupMembers: GROUPS,
  },
];

const GROUP_LOAN_ACCOUNTS = [
  {
    id: 'grp-loan-001',
    accountNo: '00001284700GL01',
    groupId: 1,
    productName: 'JLG Microfinance Loan',
    shortProductName: 'JLG Loan',
    status: { id: 300, code: 'loanStatusType.active', value: 'Active' },
    currency: { code: 'KES', decimalPlaces: 2 },
    principal: 50000.00,
    annualInterestRate: 18.00,
    numberOfRepayments: 24,
    repaymentEvery: 2,
    repaymentFrequencyType: { id: 1, code: 'repaymentFrequency.weeks', value: 'Weeks' },
    loanType: { id: 2, code: 'loanType.jlg', value: 'JLG' },
    summary: {
      principalDisbursed: 50000.00,
      principalPaid: 15000.00,
      principalOutstanding: 35000.00,
      interestCharged: 9000.00,
      interestPaid: 2700.00,
      interestOutstanding: 6300.00,
      totalExpectedRepayment: 59000.00,
      totalRepayment: 17700.00,
      totalOutstanding: 41300.00,
      totalOverdue: 0,
    },
    timeline: {
      submittedOnDate: [2025, 6, 1],
      approvedOnDate: [2025, 6, 5],
      actualDisbursementDate: [2025, 6, 10],
      expectedMaturityDate: [2026, 6, 10],
    },
  },
];

const GROUP_SAVINGS_ACCOUNTS = [
  {
    id: 'grp-sav-001',
    accountNo: '00001284700GS01',
    groupId: 1,
    productName: 'Group Mandatory Savings',
    shortProductName: 'Group Savings',
    status: { id: 300, code: 'savingsAccountStatusType.active', value: 'Active' },
    currency: { code: 'KES', decimalPlaces: 2 },
    summary: { accountBalance: 125000.00, availableBalance: 125000.00 },
    activatedOnDate: [2024, 1, 15],
  },
];

// Fineract fixed deposit endpoints
app.get('/fineract-provider/api/v1/fixeddepositaccounts', (req, res) => {
  const clientId = req.query.clientId;
  const deposits = clientId ? FIXED_DEPOSITS.filter(d => d.clientId === parseInt(clientId, 10)) : FIXED_DEPOSITS;
  res.json({ totalFilteredRecords: deposits.length, pageItems: deposits });
});

app.get('/fineract-provider/api/v1/fixeddepositaccounts/:id', (req, res) => {
  const fd = FIXED_DEPOSITS.find(d => d.id === req.params.id);
  if (!fd) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(fd);
});

// Fineract recurring deposit endpoints
app.get('/fineract-provider/api/v1/recurringdepositaccounts', (req, res) => {
  const clientId = req.query.clientId;
  const deposits = clientId ? RECURRING_DEPOSITS.filter(d => d.clientId === parseInt(clientId, 10)) : RECURRING_DEPOSITS;
  res.json({ totalFilteredRecords: deposits.length, pageItems: deposits });
});

app.get('/fineract-provider/api/v1/recurringdepositaccounts/:id', (req, res) => {
  const rd = RECURRING_DEPOSITS.find(d => d.id === req.params.id);
  if (!rd) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(rd);
});

// Fineract share account endpoints
app.get('/fineract-provider/api/v1/accounts/share', (req, res) => {
  const clientId = req.query.clientId;
  const shares = clientId ? SHARE_ACCOUNTS.filter(s => s.clientId === parseInt(clientId, 10)) : SHARE_ACCOUNTS;
  res.json({ totalFilteredRecords: shares.length, pageItems: shares });
});

app.get('/fineract-provider/api/v1/accounts/share/:id', (req, res) => {
  const sa = SHARE_ACCOUNTS.find(s => s.id === req.params.id);
  if (!sa) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(sa);
});

// Fineract loan account endpoints
app.get('/fineract-provider/api/v1/loans', (req, res) => {
  const clientId = req.query.clientId;
  const loans = clientId ? LOAN_ACCOUNTS.filter(l => l.clientId === parseInt(clientId, 10)) : LOAN_ACCOUNTS;
  res.json({ totalFilteredRecords: loans.length, pageItems: loans });
});

app.get('/fineract-provider/api/v1/loans/:id', (req, res) => {
  const loan = LOAN_ACCOUNTS.find(l => l.id === req.params.id);
  if (!loan) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(loan);
});

app.get('/fineract-provider/api/v1/loans/:id/transactions', (req, res) => {
  const loanId = req.params.id;
  const cacheKey = `fineract-loan:${loanId}`;
  if (!txnCache[cacheKey]) {
    txnCache[cacheKey] = generateLoanTransactions(loanId);
  }
  res.json({ transactions: txnCache[cacheKey] });
});

// Fineract client accounts (enhanced with loan accounts)
app.get('/fineract-provider/api/v1/clients/:clientId/accounts', (req, res) => {
  const accounts = ACCOUNTS['member-001'];
  res.json({
    savingsAccounts: accounts.map((a) => ({
      id: a.account_id,
      accountNo: a.micr_account_number,
      productName: a.account_description,
      shortProductName: a.name,
      status: { id: 300, code: 'savingsAccountStatusType.active', value: 'Active' },
      currency: { code: 'USD', decimalPlaces: 2 },
      nominalAnnualInterestRate: 2.50,
      summary: {
        accountBalance: a.current_balance,
        availableBalance: a.available_balance,
      },
      activatedOnDate: [2023, 6, 15],
    })),
    loanAccounts: LOAN_ACCOUNTS.map((l) => ({
      ...l,
      clientId: parseInt(req.params.clientId, 10),
    })),
  });
});

// Fineract client lookup by externalId
app.get('/fineract-provider/api/v1/clients', (req, res) => {
  const externalId = req.query.externalId;
  if (externalId) {
    res.json({ totalFilteredRecords: 1, pageItems: [{ id: 1, displayName: 'John Doe', externalId }] });
  } else {
    res.json({ totalFilteredRecords: 0, pageItems: [] });
  }
});

// =============================================================================
// MIFOS — GROUP / CENTER LENDING ROUTES
// =============================================================================

app.get('/fineract-provider/api/v1/groups', (req, res) => {
  const clientId = req.query.clientId;
  let groups = GROUPS;
  if (clientId) {
    groups = GROUPS.filter(g =>
      g.clientMembers && g.clientMembers.some(c => c.id === parseInt(clientId, 10))
    );
  }
  res.json({ totalFilteredRecords: groups.length, pageItems: groups });
});

app.get('/fineract-provider/api/v1/groups/:id', (req, res) => {
  const group = GROUPS.find(g => g.id === parseInt(req.params.id, 10));
  if (!group) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(group);
});

app.get('/fineract-provider/api/v1/groups/:id/accounts', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  res.json({
    savingsAccounts: GROUP_SAVINGS_ACCOUNTS.filter(a => a.groupId === groupId),
    loanAccounts: GROUP_LOAN_ACCOUNTS.filter(a => a.groupId === groupId),
  });
});

app.get('/fineract-provider/api/v1/centers', (_req, res) => {
  res.json({ totalFilteredRecords: CENTERS.length, pageItems: CENTERS });
});

app.get('/fineract-provider/api/v1/centers/:id', (req, res) => {
  const center = CENTERS.find(c => c.id === parseInt(req.params.id, 10));
  if (!center) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(center);
});

// Fineract authentication endpoint (health check)
app.get('/fineract-provider/api/v1/authentication', (_req, res) => {
  res.json({ authenticated: true, username: 'mifos', permissions: ['ALL_FUNCTIONS'] });
});

// Fineract account transfer
app.post('/fineract-provider/api/v1/accounttransfers', (req, res) => {
  res.status(200).json({
    savingsId: req.body.fromAccountId,
    resourceId: Date.now(),
  });
});

function generateLoanTransactions(loanId, count = 12) {
  const txns = [];
  let outstanding = 5000.00;
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const dateArr = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
    const principal = 416.67;
    const interest = outstanding * 0.01;
    const total = +(principal + interest).toFixed(2);
    outstanding = Math.max(0, +(outstanding - principal).toFixed(2));

    txns.push({
      id: 20000 + i,
      type: { id: 2, code: 'loanTransactionType.repayment', value: 'Repayment' },
      amount: total,
      date: dateArr,
      principalPortion: +principal.toFixed(2),
      interestPortion: +interest.toFixed(2),
      feeChargesPortion: 0,
      penaltyChargesPortion: 0,
      outstandingLoanBalance: outstanding,
      submittedOnDate: dateArr,
      reversed: false,
    });
  }

  return txns;
}

// =============================================================================
// UK PAYMENT SCHEMES — Faster Payments / BACS / CHAPS
// =============================================================================

const ukPaymentCache = {};

app.post('/uk/faster-payments/send', (req, res) => {
  const { sortCode, accountNumber, amount, reference, payerName, payeeName } = req.body;
  if (!sortCode || !accountNumber || !amount) {
    return res.status(400).json({ error: 'Missing required fields: sortCode, accountNumber, amount' });
  }
  const paymentId = `FPS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payment = {
    paymentId,
    scheme: 'faster_payments',
    status: 'completed',
    sortCode,
    accountNumber: `****${accountNumber.slice(-4)}`,
    amount,
    currency: 'GBP',
    reference: reference || '',
    payerName: payerName || 'Demo User',
    payeeName: payeeName || 'Beneficiary',
    createdAt: new Date().toISOString(),
    settledAt: new Date().toISOString(), // FPS: near-instant
  };
  ukPaymentCache[paymentId] = payment;
  res.status(201).json({ data: payment });
});

app.post('/uk/bacs/send', (req, res) => {
  const { sortCode, accountNumber, amount, reference } = req.body;
  if (!sortCode || !accountNumber || !amount) {
    return res.status(400).json({ error: 'Missing required fields: sortCode, accountNumber, amount' });
  }
  const paymentId = `BACS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const settlementDate = new Date();
  settlementDate.setDate(settlementDate.getDate() + 3); // BACS: 3-day cycle
  const payment = {
    paymentId,
    scheme: 'bacs',
    status: 'processing',
    sortCode,
    accountNumber: `****${accountNumber.slice(-4)}`,
    amount,
    currency: 'GBP',
    reference: reference || '',
    createdAt: new Date().toISOString(),
    estimatedSettlement: settlementDate.toISOString(),
  };
  ukPaymentCache[paymentId] = payment;
  res.status(201).json({ data: payment });
});

app.post('/uk/chaps/send', (req, res) => {
  const { sortCode, accountNumber, amount, reference } = req.body;
  if (!sortCode || !accountNumber || !amount) {
    return res.status(400).json({ error: 'Missing required fields: sortCode, accountNumber, amount' });
  }
  if (amount < 1000000) { // CHAPS typically for high-value (> £10,000)
    return res.status(400).json({ error: 'CHAPS is for high-value payments. Minimum £10,000 (1000000 pence)' });
  }
  const paymentId = `CHAPS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payment = {
    paymentId,
    scheme: 'chaps',
    status: 'completed',
    sortCode,
    accountNumber: `****${accountNumber.slice(-4)}`,
    amount,
    currency: 'GBP',
    reference: reference || '',
    createdAt: new Date().toISOString(),
    settledAt: new Date().toISOString(), // CHAPS: same-day
  };
  ukPaymentCache[paymentId] = payment;
  res.status(201).json({ data: payment });
});

app.get('/uk/payments/:paymentId', (req, res) => {
  const payment = ukPaymentCache[req.params.paymentId];
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json({ data: payment });
});

app.post('/uk/confirmation-of-payee', (req, res) => {
  const { sortCode, accountNumber, payeeName } = req.body;
  if (!sortCode || !accountNumber || !payeeName) {
    return res.status(400).json({ error: 'Missing required fields: sortCode, accountNumber, payeeName' });
  }
  // Simulate CoP: "Demo" names always match, others get close_match
  const nameLower = payeeName.toLowerCase();
  const matchResult = nameLower.includes('demo') || nameLower.includes('test')
    ? 'exact_match' : 'close_match';
  res.json({
    data: {
      matchResult,
      matchedName: matchResult === 'exact_match' ? payeeName : `${payeeName} Ltd`,
      reasonCode: matchResult === 'exact_match' ? 'MTCH' : 'CLSE',
      respondedAt: new Date().toISOString(),
    },
  });
});

// =============================================================================
// SEPA PAYMENT SCHEMES — SCT / SCT Inst / SDD
// =============================================================================

const sepaPaymentCache = {};

app.post('/sepa/sct/send', (req, res) => {
  const { iban, bic, amount, reference, debtorName, creditorName } = req.body;
  if (!iban || !amount) {
    return res.status(400).json({ error: 'Missing required fields: iban, amount' });
  }
  const paymentId = `SCT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const endToEndId = `E2E-${Math.random().toString(36).slice(2, 14).toUpperCase()}`;
  const settlementDate = new Date();
  settlementDate.setDate(settlementDate.getDate() + 1); // SCT: D+1
  const payment = {
    paymentId,
    endToEndId,
    scheme: 'sepa_sct',
    status: 'accepted',
    iban: iban.slice(0, 4) + '****' + iban.slice(-4),
    bic: bic || 'DEUTDEFFXXX',
    amount,
    currency: 'EUR',
    reference: reference || '',
    debtorName: debtorName || 'Demo User',
    creditorName: creditorName || 'Beneficiary',
    messageFormat: 'pain.001.001.09',
    createdAt: new Date().toISOString(),
    estimatedSettlement: settlementDate.toISOString(),
  };
  sepaPaymentCache[paymentId] = payment;
  res.status(201).json({ data: payment });
});

app.post('/sepa/sct-inst/send', (req, res) => {
  const { iban, bic, amount, reference } = req.body;
  if (!iban || !amount) {
    return res.status(400).json({ error: 'Missing required fields: iban, amount' });
  }
  if (amount > 10000000) { // SCT Inst limit: €100,000
    return res.status(400).json({ error: 'SCT Inst limit exceeded. Maximum €100,000 (10000000 cents)' });
  }
  const paymentId = `SCTI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payment = {
    paymentId,
    scheme: 'sepa_sct_inst',
    status: 'completed',
    iban: iban.slice(0, 4) + '****' + iban.slice(-4),
    bic: bic || 'DEUTDEFFXXX',
    amount,
    currency: 'EUR',
    reference: reference || '',
    messageFormat: 'pain.001.001.09',
    createdAt: new Date().toISOString(),
    settledAt: new Date().toISOString(), // SCT Inst: 10 seconds
    settlementTime: '10s',
  };
  sepaPaymentCache[paymentId] = payment;
  res.status(201).json({ data: payment });
});

app.post('/sepa/sdd/mandate', (req, res) => {
  const { iban, creditorId, mandateReference, scheme: sddScheme } = req.body;
  if (!iban || !creditorId) {
    return res.status(400).json({ error: 'Missing required fields: iban, creditorId' });
  }
  const mandateId = `SDD-MND-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.status(201).json({
    data: {
      mandateId,
      scheme: sddScheme || 'core', // core or b2b
      status: 'active',
      iban: iban.slice(0, 4) + '****' + iban.slice(-4),
      creditorId,
      mandateReference: mandateReference || mandateId,
      signedAt: new Date().toISOString(),
    },
  });
});

app.post('/sepa/sdd/collect', (req, res) => {
  const { mandateId, amount, reference } = req.body;
  if (!mandateId || !amount) {
    return res.status(400).json({ error: 'Missing required fields: mandateId, amount' });
  }
  const collectionId = `SDD-COL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const settlementDate = new Date();
  settlementDate.setDate(settlementDate.getDate() + 2); // SDD Core: D+2
  res.status(201).json({
    data: {
      collectionId,
      mandateId,
      status: 'pending',
      amount,
      currency: 'EUR',
      reference: reference || '',
      createdAt: new Date().toISOString(),
      estimatedSettlement: settlementDate.toISOString(),
    },
  });
});

app.get('/sepa/payments/:paymentId', (req, res) => {
  const payment = sepaPaymentCache[req.params.paymentId];
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json({ data: payment });
});

// =============================================================================
// PIX (Brazil) — BCB-style payment simulator
// =============================================================================

const pixPaymentCache = {};

// Pix key lookup (DICT simulation)
app.get('/pix/dict/:keyType/:key', (req, res) => {
  const { keyType, key } = req.params;
  const validTypes = ['cpf', 'cnpj', 'email', 'phone', 'evp'];
  if (!validTypes.includes(keyType)) {
    return res.status(400).json({ error: `Invalid key type. Must be one of: ${validTypes.join(', ')}` });
  }
  // Simulate DICT lookup — always returns a mock account
  res.json({
    data: {
      keyType,
      key,
      account: {
        participant: '00416968', // ISPB
        branch: '0001',
        accountNumber: '****5678',
        accountType: 'CACC',
        ownerName: 'Mock Beneficiary',
        ownerTaxId: keyType === 'cpf' ? '***.***.***-00' : '**.***.***/**00-00',
      },
      createdAt: '2024-01-15T10:30:00Z',
    },
  });
});

// Pix instant payment
app.post('/pix/payment', (req, res) => {
  const { pixKey, pixKeyType, amount, description, payerCpf } = req.body;
  if (!amount) {
    return res.status(400).json({ error: 'Missing required field: amount' });
  }
  if (!pixKey && !req.body.iban) {
    return res.status(400).json({ error: 'Missing required field: pixKey or iban (manual entry)' });
  }
  const endToEndId = `E${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}${Math.random().toString(36).slice(2, 13).toUpperCase()}`;
  const payment = {
    endToEndId,
    status: 'completed',
    pixKey: pixKey || null,
    pixKeyType: pixKeyType || null,
    amount,
    currency: 'BRL',
    description: description || '',
    payerCpf: payerCpf ? `***.***.***-${payerCpf.slice(-2)}` : null,
    createdAt: new Date().toISOString(),
    settledAt: new Date().toISOString(), // Pix: instant (< 10s)
  };
  pixPaymentCache[endToEndId] = payment;
  res.status(201).json({ data: payment });
});

// Pix QR Code generation
app.post('/pix/qrcode', (req, res) => {
  const { pixKey, amount, description, merchantName, merchantCity } = req.body;
  const txId = `pix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  res.status(201).json({
    data: {
      txId,
      qrCodeType: amount ? 'dynamic' : 'static',
      pixKey: pixKey || null,
      amount: amount || null,
      description: description || '',
      merchantName: merchantName || 'Demo Merchant',
      merchantCity: merchantCity || 'São Paulo',
      // EMV payload (mock — real would be BRCode format)
      payload: `00020126580014br.gov.bcb.pix0136${txId}520400005303986${amount ? '54' + String(amount).length.toString().padStart(2, '0') + amount : ''}5802BR5913${merchantName || 'Demo'}6009SAO PAULO62070503***6304`,
      createdAt: new Date().toISOString(),
    },
  });
});

app.get('/pix/payment/:endToEndId', (req, res) => {
  const payment = pixPaymentCache[req.params.endToEndId];
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json({ data: payment });
});

// =============================================================================
// SPEI (Mexico) — Banxico-style payment simulator
// =============================================================================

const speiPaymentCache = {};

app.post('/spei/transfer', (req, res) => {
  const { clabe, amount, concept, beneficiaryName, referenceNumber } = req.body;
  if (!clabe || !amount) {
    return res.status(400).json({ error: 'Missing required fields: clabe, amount' });
  }
  if (!/^\d{18}$/.test(clabe)) {
    return res.status(400).json({ error: 'Invalid CLABE format. Must be 18 digits' });
  }
  const trackingId = `SPEI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cep = `CEP-${Math.random().toString(36).slice(2, 14).toUpperCase()}`;
  const payment = {
    trackingId,
    cep, // Comprobante Electronico de Pago
    status: 'liquidated',
    clabe: `******${clabe.slice(-4)}`,
    beneficiaryRfc: req.body.beneficiaryRfc || null,
    amount,
    currency: 'MXN',
    concept: concept || '',
    beneficiaryName: beneficiaryName || 'Beneficiary',
    referenceNumber: referenceNumber || String(Math.floor(Math.random() * 9999999)),
    createdAt: new Date().toISOString(),
    settledAt: new Date().toISOString(), // SPEI: near-instant during business hours
  };
  speiPaymentCache[trackingId] = payment;
  res.status(201).json({ data: payment });
});

app.get('/spei/cep/:trackingId', (req, res) => {
  const payment = speiPaymentCache[req.params.trackingId];
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json({
    data: {
      trackingId: payment.trackingId,
      cep: payment.cep,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      settledAt: payment.settledAt,
    },
  });
});

app.get('/spei/transfer/:trackingId', (req, res) => {
  const payment = speiPaymentCache[req.params.trackingId];
  if (!payment) return res.status(404).json({ error: 'Transfer not found' });
  res.json({ data: payment });
});

// =============================================================================
// ADMIN / CONTROL ENDPOINTS
// =============================================================================

// Dynamically adjust simulator settings
app.post('/admin/config', (req, res) => {
  if (req.body.latencyMs !== undefined) process.env.SIMULATED_LATENCY_MS = String(req.body.latencyMs);
  if (req.body.jitterMs !== undefined) process.env.LATENCY_JITTER_MS = String(req.body.jitterMs);
  if (req.body.errorRate !== undefined) process.env.ERROR_RATE = String(req.body.errorRate);
  if (req.body.coreBusyRate !== undefined) process.env.CORE_BUSY_RATE = String(req.body.coreBusyRate);

  res.json({
    message: 'Configuration updated',
    config: {
      latencyMs: process.env.SIMULATED_LATENCY_MS,
      jitterMs: process.env.LATENCY_JITTER_MS,
      errorRate: process.env.ERROR_RATE,
      coreBusyRate: process.env.CORE_BUSY_RATE,
    },
  });
});

// Reset transaction cache
app.post('/admin/reset', (_req, res) => {
  Object.keys(txnCache).forEach((k) => delete txnCache[k]);
  res.json({ message: 'Transaction cache cleared' });
});

// =============================================================================
// mTLS CONFIGURATION
// =============================================================================

const MTLS_ENABLED = process.env.MTLS_ENABLED === 'true';
const MTLS_CERT_DIR = process.env.MTLS_CERT_DIR || '/certs';
const MTLS_REJECT_UNAUTHORIZED = process.env.MTLS_REJECT_UNAUTHORIZED !== 'false';

// =============================================================================
// START
// =============================================================================

function startServer() {
  const protocol = MTLS_ENABLED ? 'https' : 'http';

  const banner = `
╔══════════════════════════════════════════════════════════════╗
║              Fiducia Core Banking Simulator                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  CU*Answers API:  ${protocol}://localhost:${PORT}/api/credit_unions/  ║
║  SymXchange API:  ${protocol}://localhost:${PORT}/symxchange/          ║
║  Fineract/Mifos:  ${protocol}://localhost:${PORT}/fineract-provider/   ║
║  Health:          ${protocol}://localhost:${PORT}/health               ║
║  Admin:           POST ${protocol}://localhost:${PORT}/admin/config    ║
║                                                              ║
║  Latency: ${BASE_LATENCY}ms + ${JITTER}ms jitter                              ║
║  Error rate: ${(ERROR_RATE * 100).toFixed(1)}%  |  Core busy rate: ${(CORE_BUSY_RATE * 100).toFixed(1)}%          ║
║  mTLS: ${MTLS_ENABLED ? 'ENABLED (reject unauthorized: ' + MTLS_REJECT_UNAUTHORIZED + ')' : 'disabled'}                                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

  if (MTLS_ENABLED) {
    const https = require('https');

    const caCert = path.join(MTLS_CERT_DIR, 'ca.crt');
    const serverCert = path.join(MTLS_CERT_DIR, 'server.crt');
    const serverKey = path.join(MTLS_CERT_DIR, 'server.key');

    // Validate that cert files exist before starting
    for (const f of [caCert, serverCert, serverKey]) {
      if (!fs.existsSync(f)) {
        console.error('mTLS error: required certificate file not found');
        console.error('Generate certs with: ./certs/generate-certs.sh /certs');
        process.exit(1);
      }
    }

    const tlsOptions = {
      ca: fs.readFileSync(caCert),
      cert: fs.readFileSync(serverCert),
      key: fs.readFileSync(serverKey),
      requestCert: true,
      rejectUnauthorized: MTLS_REJECT_UNAUTHORIZED,
    };

    https.createServer(tlsOptions, app).listen(PORT, '0.0.0.0', () => {
      console.log(banner);
    });
  } else {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(banner);
    });
  }
}

startServer();

/**
 * Shared demo data and transaction generators for the Core Banking Simulator.
 *
 * All plugins import their data from here so that a single source of truth
 * is maintained across CU*Answers, Symitar, and Fineract simulators.
 */

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

// Cache generated transactions per account
const txnCache = {};

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

module.exports = {
  CREDIT_UNION_ID,
  ROUTING_NUMBER,
  MEMBERS,
  ACCOUNTS,
  FIXED_DEPOSITS,
  RECURRING_DEPOSITS,
  SHARE_ACCOUNTS,
  LOAN_ACCOUNTS,
  GROUPS,
  CENTERS,
  GROUP_LOAN_ACCOUNTS,
  GROUP_SAVINGS_ACCOUNTS,
  txnCache,
  generateTransactions,
  generateLoanTransactions,
};

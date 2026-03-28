/**
 * Fineract / Mifos Simulator Plugin
 *
 * Routes: /fineract-provider/api/v1/...
 */

module.exports = function register(app, data) {
  const {
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
  } = data;

  // Savings accounts
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

  // Fixed deposit endpoints
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

  // Recurring deposit endpoints
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

  // Share account endpoints
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

  // Loan account endpoints
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

  // Client accounts (enhanced with loan accounts)
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

  // Client lookup by externalId
  app.get('/fineract-provider/api/v1/clients', (req, res) => {
    const externalId = req.query.externalId;
    if (externalId) {
      res.json({ totalFilteredRecords: 1, pageItems: [{ id: 1, displayName: 'John Doe', externalId }] });
    } else {
      res.json({ totalFilteredRecords: 0, pageItems: [] });
    }
  });

  // Group / Center Lending (JLG, SHG, VSLA)
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

  // Authentication endpoint (health check)
  app.get('/fineract-provider/api/v1/authentication', (_req, res) => {
    res.json({ authenticated: true, username: 'mifos', permissions: ['ALL_FUNCTIONS'] });
  });

  // Account transfer
  app.post('/fineract-provider/api/v1/accounttransfers', (req, res) => {
    res.status(200).json({
      savingsId: req.body.fromAccountId,
      resourceId: Date.now(),
    });
  });

  console.log('  [plugin] fineract — Fineract/Mifos routes loaded');
};

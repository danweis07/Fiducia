/**
 * Symitar / SymXchange Simulator Plugin
 *
 * Routes: /symxchange/...
 */

module.exports = function register(app, data) {
  const { ACCOUNTS, txnCache, generateTransactions } = data;

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

  console.log('  [plugin] symitar — SymXchange routes loaded');
};

/**
 * CU*Answers (It's Me 247 API) Simulator Plugin
 *
 * Routes: /api/credit_unions/:cuId/...
 */

module.exports = function register(app, data) {
  const { MEMBERS, ACCOUNTS, txnCache, generateTransactions } = data;

  // Credit union availability
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

  // UK Payment Schemes — Faster Payments / BACS / CHAPS
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
      settledAt: new Date().toISOString(),
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
    settlementDate.setDate(settlementDate.getDate() + 3);
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
    if (amount < 1000000) {
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
      settledAt: new Date().toISOString(),
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

  // SEPA Payment Schemes — SCT / SCT Inst / SDD
  const sepaPaymentCache = {};

  app.post('/sepa/sct/send', (req, res) => {
    const { iban, bic, amount, reference, debtorName, creditorName } = req.body;
    if (!iban || !amount) {
      return res.status(400).json({ error: 'Missing required fields: iban, amount' });
    }
    const paymentId = `SCT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const endToEndId = `E2E-${Math.random().toString(36).slice(2, 14).toUpperCase()}`;
    const settlementDate = new Date();
    settlementDate.setDate(settlementDate.getDate() + 1);
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
    if (amount > 10000000) {
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
      settledAt: new Date().toISOString(),
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
        scheme: sddScheme || 'core',
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
    settlementDate.setDate(settlementDate.getDate() + 2);
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

  // PIX (Brazil) — BCB-style payment simulator
  const pixPaymentCache = {};

  app.get('/pix/dict/:keyType/:key', (req, res) => {
    const { keyType, key } = req.params;
    const validTypes = ['cpf', 'cnpj', 'email', 'phone', 'evp'];
    if (!validTypes.includes(keyType)) {
      return res.status(400).json({ error: `Invalid key type. Must be one of: ${validTypes.join(', ')}` });
    }
    res.json({
      data: {
        keyType,
        key,
        account: {
          participant: '00416968',
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
      settledAt: new Date().toISOString(),
    };
    pixPaymentCache[endToEndId] = payment;
    res.status(201).json({ data: payment });
  });

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

  // SPEI (Mexico) — Banxico-style payment simulator
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
      cep,
      status: 'liquidated',
      clabe: `******${clabe.slice(-4)}`,
      beneficiaryRfc: req.body.beneficiaryRfc || null,
      amount,
      currency: 'MXN',
      concept: concept || '',
      beneficiaryName: beneficiaryName || 'Beneficiary',
      referenceNumber: referenceNumber || String(Math.floor(Math.random() * 9999999)),
      createdAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
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

  console.log('  [plugin] cuanswers — CU*Answers / UK / SEPA / PIX / SPEI routes loaded');
};

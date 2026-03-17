import '../models/banking.dart';
import '../models/financial_data.dart';
import '../models/notification_preferences.dart';
import '../models/savings_goal.dart';
import '../models/secure_message.dart';
import '../models/dispute.dart';
import 'backend_provider.dart';
import 'demo_data.dart';

/// Whether to use demo mode (always true for now — mirrors web behavior).
/// In production, this would check env vars or auth state.
bool _isDemoMode = true;

/// Demo account IDs for reference in demo gateway calls
const _checkingId = 'acct-demo-checking-001';
const _savingsId = 'acct-demo-savings-002';

void setDemoMode(bool value) => _isDemoMode = value;
bool get isDemoMode => _isDemoMode;

/// Typed API client — mirrors src/lib/gateway.ts
/// ALL data access goes through the configured [BackendProvider].
/// When demo mode is active, returns local demo data instead.
class GatewayClient {
  static GatewayClient? _instance;

  BackendProvider? _provider;

  GatewayClient._();

  static GatewayClient get instance {
    _instance ??= GatewayClient._();
    return _instance!;
  }

  /// Set the backend provider used for gateway calls and auth.
  /// Called from main.dart during app initialization.
  void setProvider(BackendProvider provider) {
    _provider = provider;
  }

  /// The current backend provider, if configured.
  BackendProvider? get provider => _provider;

  /// Core gateway call — delegates to the configured [BackendProvider].
  /// Throws [StateError] if no provider is set and demo mode is off.
  Future<Map<String, dynamic>> _call(
    String action, [
    Map<String, dynamic> params = const {},
  ]) async {
    if (_provider == null) {
      throw StateError(
        'No BackendProvider configured. '
        'Call GatewayClient.instance.setProvider() before making gateway calls.',
      );
    }

    return _provider!.invokeGateway(action, params);
  }

  // ---------------------------------------------------------------------------
  // ACCOUNTS
  // ---------------------------------------------------------------------------

  Future<List<Account>> getAccounts() async {
    if (_isDemoMode) return demoAccounts;
    final data = await _call('accounts.list');
    final list = data['accounts'] as List;
    return list.map((e) => Account.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Account> getAccount(String id) async {
    if (_isDemoMode) return demoAccounts.firstWhere((a) => a.id == id, orElse: () => demoAccounts.first);
    final data = await _call('accounts.get', {'id': id});
    return Account.fromJson(data['account'] as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // TRANSACTIONS
  // ---------------------------------------------------------------------------

  Future<List<Transaction>> getTransactions({
    String? accountId,
    int? limit,
    int? offset,
  }) async {
    if (_isDemoMode) {
      var txns = demoTransactions;
      if (accountId != null) txns = txns.where((t) => t.accountId == accountId).toList();
      if (limit != null) txns = txns.take(limit).toList();
      return txns;
    }
    final data = await _call('transactions.list', {
      if (accountId != null) 'accountId': accountId,
      if (limit != null) 'limit': limit,
      if (offset != null) 'offset': offset,
    });
    final list = data['transactions'] as List;
    return list.map((e) => Transaction.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ---------------------------------------------------------------------------
  // LOANS
  // ---------------------------------------------------------------------------

  Future<List<Loan>> getLoans({String? status}) async {
    if (_isDemoMode) {
      var loans = demoLoans;
      if (status != null) loans = loans.where((l) => l.status == status).toList();
      return loans;
    }
    final data = await _call('loans.list', {
      if (status != null) 'status': status,
    });
    final list = data['loans'] as List;
    return list.map((e) => Loan.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Loan> getLoan(String id) async {
    if (_isDemoMode) return demoLoans.firstWhere((l) => l.id == id, orElse: () => demoLoans.first);
    final data = await _call('loans.get', {'id': id});
    return Loan.fromJson(data['loan'] as Map<String, dynamic>);
  }

  Future<List<LoanScheduleItem>> getLoanSchedule(String loanId) async {
    if (_isDemoMode) {
      return List.generate(5, (i) => LoanScheduleItem(
        id: 'sched-${i + 1}',
        loanId: loanId,
        installmentNumber: i + 19,
        dueDate: _futureDate(30 * (i + 1)),
        principalCents: 41000 + i * 200,
        interestCents: 12482 - i * 200,
        feeCents: 0,
        totalCents: 53482,
        paidCents: 0,
        status: 'upcoming',
      ));
    }
    final data = await _call('loans.schedule', {'loanId': loanId});
    final list = data['schedule'] as List;
    return list.map((e) => LoanScheduleItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<LoanPayment>> getLoanPayments(String loanId) async {
    if (_isDemoMode) {
      return List.generate(5, (i) => LoanPayment(
        id: 'pmt-${i + 1}',
        loanId: loanId,
        amountCents: 53482,
        principalPortionCents: 38000 + i * 200,
        interestPortionCents: 15482 - i * 200,
        feePortionCents: 0,
        extraPrincipalCents: 0,
        fromAccountId: 'acct-demo-checking-001',
        paymentMethod: 'autopay',
        status: 'completed',
        processedAt: _isoDate(30 * (i + 1)),
        createdAt: _isoDate(30 * (i + 1)),
      ));
    }
    final data = await _call('loans.payments', {'loanId': loanId});
    final list = data['payments'] as List;
    return list.map((e) => LoanPayment.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> makeLoanPayment({
    required String loanId,
    required int amountCents,
    required String fromAccountId,
    int? extraPrincipalCents,
  }) async {
    if (_isDemoMode) return;
    await _call('loans.makePayment', {
      'loanId': loanId,
      'amountCents': amountCents,
      'fromAccountId': fromAccountId,
      if (extraPrincipalCents != null) 'extraPrincipalCents': extraPrincipalCents,
    });
  }

  // ---------------------------------------------------------------------------
  // TRANSFERS
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> createTransfer({
    required String fromAccountId,
    String? toAccountId,
    String? toBeneficiaryId,
    required String type,
    required int amountCents,
    String? memo,
  }) async {
    if (_isDemoMode) {
      return {
        'transfer': {
          'id': 'xfer-demo-${DateTime.now().millisecondsSinceEpoch}',
          'status': 'completed',
        },
      };
    }
    return _call('transfers.create', {
      'fromAccountId': fromAccountId,
      if (toAccountId != null) 'toAccountId': toAccountId,
      if (toBeneficiaryId != null) 'toBeneficiaryId': toBeneficiaryId,
      'type': type,
      'amountCents': amountCents,
      if (memo != null) 'memo': memo,
    });
  }

  // ---------------------------------------------------------------------------
  // BENEFICIARIES
  // ---------------------------------------------------------------------------

  Future<List<Beneficiary>> getBeneficiaries() async {
    if (_isDemoMode) return demoBeneficiaries;
    final data = await _call('beneficiaries.list');
    final list = data['beneficiaries'] as List;
    return list.map((e) => Beneficiary.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ---------------------------------------------------------------------------
  // CARDS
  // ---------------------------------------------------------------------------

  Future<List<BankCard>> getCards() async {
    if (_isDemoMode) return List.from(demoCards);
    final data = await _call('cards.list');
    final list = data['cards'] as List;
    return list.map((e) => BankCard.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> lockCard(String id) async {
    if (_isDemoMode) return;
    await _call('cards.lock', {'id': id});
  }

  Future<void> unlockCard(String id) async {
    if (_isDemoMode) return;
    await _call('cards.unlock', {'id': id});
  }

  Future<void> setCardLimit(String id, int dailyLimitCents) async {
    if (_isDemoMode) return;
    await _call('cards.setLimit', {'id': id, 'dailyLimitCents': dailyLimitCents});
  }

  // ---------------------------------------------------------------------------
  // BILLS
  // ---------------------------------------------------------------------------

  Future<List<Bill>> getBills() async {
    if (_isDemoMode) return demoBills;
    final data = await _call('bills.list');
    final list = data['bills'] as List;
    return list.map((e) => Bill.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> payBill(String id) async {
    if (_isDemoMode) return;
    await _call('bills.pay', {'id': id});
  }

  Future<void> createBill({
    required String payeeName,
    required String payeeAccountNumber,
    required int amountCents,
    required String dueDate,
    required String fromAccountId,
    bool autopay = false,
  }) async {
    if (_isDemoMode) return;
    await _call('bills.create', {
      'payeeName': payeeName,
      'payeeAccountNumber': payeeAccountNumber,
      'amountCents': amountCents,
      'dueDate': dueDate,
      'fromAccountId': fromAccountId,
      'autopay': autopay,
    });
  }

  // ---------------------------------------------------------------------------
  // RDC (REMOTE DEPOSIT CAPTURE)
  // ---------------------------------------------------------------------------

  Future<RDCDeposit> submitDeposit({
    required String accountId,
    required int amountCents,
    required String frontImageBase64,
    required String backImageBase64,
    String? checkNumber,
  }) async {
    if (_isDemoMode) {
      return RDCDeposit(
        id: 'rdc-demo-${DateTime.now().millisecondsSinceEpoch}',
        accountId: accountId,
        amountCents: amountCents,
        status: 'pending',
        checkNumber: checkNumber,
        createdAt: DateTime.now().toIso8601String(),
      );
    }
    final data = await _call('rdc.deposit', {
      'accountId': accountId,
      'amountCents': amountCents,
      'frontImageBase64': frontImageBase64,
      'backImageBase64': backImageBase64,
      if (checkNumber != null) 'checkNumber': checkNumber,
    });
    return RDCDeposit.fromJson(data['deposit'] as Map<String, dynamic>);
  }

  Future<List<RDCDeposit>> getDepositHistory() async {
    if (_isDemoMode) return demoRDCDeposits;
    final data = await _call('rdc.history');
    final list = data['deposits'] as List;
    return list.map((e) => RDCDeposit.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------

  Future<List<BankNotification>> getNotifications() async {
    if (_isDemoMode) return demoNotifications;
    final data = await _call('notifications.list');
    final list = data['notifications'] as List;
    return list.map((e) => BankNotification.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<int> getUnreadNotificationCount() async {
    if (_isDemoMode) return demoNotifications.where((n) => !n.isRead).length;
    final data = await _call('notifications.unreadCount');
    return data['count'] as int;
  }

  Future<void> markNotificationRead(String id) async {
    if (_isDemoMode) return;
    await _call('notifications.markRead', {'id': id});
  }

  Future<void> markAllNotificationsRead() async {
    if (_isDemoMode) return;
    await _call('notifications.markAllRead');
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATION PREFERENCES
  // ---------------------------------------------------------------------------

  Future<NotificationPreferences> getNotificationPreferences() async {
    if (_isDemoMode) return NotificationPreferences.defaults();
    final data = await _call('notifications.preferences.get');
    return NotificationPreferences.fromJson(data['preferences'] as Map<String, dynamic>);
  }

  Future<NotificationPreferences> updateNotificationPreferences({
    Map<String, bool>? channels,
    Map<String, Map<String, dynamic>>? categories,
  }) async {
    if (_isDemoMode) return NotificationPreferences.defaults();
    final data = await _call('notifications.preferences.update', {
      if (channels != null) 'channels': channels,
      if (categories != null) 'categories': categories,
    });
    return NotificationPreferences.fromJson(data['preferences'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> testNotification(String channel) async {
    if (_isDemoMode) return {'sent': true, 'channel': channel, 'message': 'Test notification sent'};
    return _call('notifications.test', {'channel': channel});
  }

  // ---------------------------------------------------------------------------
  // PUSH TOKEN MANAGEMENT
  // ---------------------------------------------------------------------------

  Future<void> registerPushToken({required String token, required String platform}) async {
    if (_isDemoMode) return;
    await _call('notifications.registerToken', {'token': token, 'platform': platform});
  }

  Future<void> unregisterPushToken({required String token}) async {
    if (_isDemoMode) return;
    await _call('notifications.unregisterToken', {'token': token});
  }

  // ---------------------------------------------------------------------------
  // TRANSACTION SEARCH
  // ---------------------------------------------------------------------------

  Future<List<Transaction>> searchTransactions({
    String? query,
    String? accountId,
    String? startDate,
    String? endDate,
    int? minAmountCents,
    int? maxAmountCents,
    String? type,
    int limit = 50,
    int offset = 0,
  }) async {
    if (_isDemoMode) {
      var txns = demoTransactions;
      if (accountId != null) txns = txns.where((t) => t.accountId == accountId).toList();
      if (query != null && query.isNotEmpty) {
        final q = query.toLowerCase();
        txns = txns.where((t) =>
          t.description.toLowerCase().contains(q) ||
          (t.merchantName?.toLowerCase().contains(q) ?? false) ||
          t.category.toLowerCase().contains(q)
        ).toList();
      }
      if (type != null) txns = txns.where((t) => t.type == type).toList();
      return txns.take(limit).toList();
    }
    final data = await _call('transactions.search', {
      if (query != null) 'query': query,
      if (accountId != null) 'accountId': accountId,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
      if (minAmountCents != null) 'minAmountCents': minAmountCents,
      if (maxAmountCents != null) 'maxAmountCents': maxAmountCents,
      if (type != null) 'type': type,
      'limit': limit,
      'offset': offset,
    });
    final list = data['transactions'] as List;
    return list.map((e) => Transaction.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ---------------------------------------------------------------------------
  // SCHEDULED / RECURRING TRANSFERS
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> scheduleTransfer({
    required String fromAccountId,
    String? toAccountId,
    String? toBeneficiaryId,
    required String type,
    required int amountCents,
    required String scheduledDate,
    String? recurrence,
    String? memo,
  }) async {
    if (_isDemoMode) {
      return {
        'scheduledTransfer': {
          'id': 'sxfer-demo-${DateTime.now().millisecondsSinceEpoch}',
          'status': 'scheduled',
        },
      };
    }
    return _call('transfers.schedule', {
      'fromAccountId': fromAccountId,
      if (toAccountId != null) 'toAccountId': toAccountId,
      if (toBeneficiaryId != null) 'toBeneficiaryId': toBeneficiaryId,
      'type': type,
      'amountCents': amountCents,
      'scheduledDate': scheduledDate,
      if (recurrence != null) 'recurrence': recurrence,
      if (memo != null) 'memo': memo,
    });
  }

  Future<List<Map<String, dynamic>>> getScheduledTransfers() async {
    if (_isDemoMode) return [];
    final data = await _call('transfers.scheduled.list');
    return (data['transfers'] as List).cast<Map<String, dynamic>>();
  }

  Future<void> cancelScheduledTransfer(String id) async {
    if (_isDemoMode) return;
    await _call('transfers.scheduled.cancel', {'id': id});
  }

  // ---------------------------------------------------------------------------
  // BILL PAYMENT HISTORY
  // ---------------------------------------------------------------------------

  Future<List<Map<String, dynamic>>> getBillPayments({String? status}) async {
    if (_isDemoMode) return [];
    final data = await _call('billpay.payments.list', {
      if (status != null) 'status': status,
    });
    return (data['payments'] as List).cast<Map<String, dynamic>>();
  }

  Future<void> cancelBillPayment(String id) async {
    if (_isDemoMode) return;
    await _call('billpay.payments.cancel', {'id': id});
  }

  // ---------------------------------------------------------------------------
  // SPENDING ALERTS
  // ---------------------------------------------------------------------------

  Future<List<Map<String, dynamic>>> getSpendingAlerts() async {
    if (_isDemoMode) return demoSpendingAlerts;
    final data = await _call('spendingAlerts.list');
    return (data['alerts'] as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> createSpendingAlert({
    required String name,
    required int thresholdCents,
    String? category,
    String? accountId,
    List<String> channels = const ['push', 'in_app'],
  }) async {
    if (_isDemoMode) {
      return {
        'id': 'alert-demo-${DateTime.now().millisecondsSinceEpoch}',
        'name': name,
        'thresholdCents': thresholdCents,
        'category': category,
        'accountId': accountId,
        'channels': channels,
        'enabled': true,
      };
    }
    return _call('spendingAlerts.create', {
      'name': name,
      'thresholdCents': thresholdCents,
      if (category != null) 'category': category,
      if (accountId != null) 'accountId': accountId,
      'channels': channels,
    });
  }

  Future<void> updateSpendingAlert(String id, {bool? enabled, int? thresholdCents}) async {
    if (_isDemoMode) return;
    await _call('spendingAlerts.update', {
      'id': id,
      if (enabled != null) 'enabled': enabled,
      if (thresholdCents != null) 'thresholdCents': thresholdCents,
    });
  }

  Future<void> deleteSpendingAlert(String id) async {
    if (_isDemoMode) return;
    await _call('spendingAlerts.delete', {'id': id});
  }

  // ---------------------------------------------------------------------------
  // SAVINGS GOALS
  // ---------------------------------------------------------------------------

  Future<List<SavingsGoal>> getSavingsGoals() async {
    if (_isDemoMode) return demoSavingsGoals;
    final data = await _call('savingsGoals.list');
    final list = data['goals'] as List;
    return list.map((e) => SavingsGoal.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<SavingsGoal> createSavingsGoal({
    required String name,
    required int targetCents,
    String? accountId,
    String? targetDate,
  }) async {
    if (_isDemoMode) {
      return SavingsGoal(
        id: 'goal-demo-${DateTime.now().millisecondsSinceEpoch}',
        name: name,
        targetCents: targetCents,
        currentCents: 0,
        accountId: accountId,
        targetDate: targetDate,
        createdAt: DateTime.now().toIso8601String(),
      );
    }
    final data = await _call('savingsGoals.create', {
      'name': name,
      'targetCents': targetCents,
      if (accountId != null) 'accountId': accountId,
      if (targetDate != null) 'targetDate': targetDate,
    });
    return SavingsGoal.fromJson(data['goal'] as Map<String, dynamic>);
  }

  Future<void> deleteSavingsGoal(String id) async {
    if (_isDemoMode) return;
    await _call('savingsGoals.delete', {'id': id});
  }

  Future<void> contributeToSavingsGoal({required String goalId, required int amountCents}) async {
    if (_isDemoMode) return;
    await _call('savingsGoals.contribute', {'goalId': goalId, 'amountCents': amountCents});
  }

  // ---------------------------------------------------------------------------
  // SECURE MESSAGING
  // ---------------------------------------------------------------------------

  Future<List<MessageThread>> getMessageThreads() async {
    if (_isDemoMode) return demoMessageThreads;
    final data = await _call('secureMessaging.threads.list');
    final list = data['threads'] as List;
    return list.map((e) => MessageThread.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<SecureMessage>> getMessages(String threadId) async {
    if (_isDemoMode) return demoMessages.where((m) => m.threadId == threadId).toList();
    final data = await _call('secureMessaging.messages.list', {'threadId': threadId});
    final list = data['messages'] as List;
    return list.map((e) => SecureMessage.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<SecureMessage> sendMessage({required String threadId, required String body}) async {
    if (_isDemoMode) {
      return SecureMessage(
        id: 'msg-demo-${DateTime.now().millisecondsSinceEpoch}',
        threadId: threadId,
        body: body,
        senderType: 'member',
        createdAt: DateTime.now().toIso8601String(),
      );
    }
    final data = await _call('secureMessaging.messages.send', {
      'threadId': threadId,
      'body': body,
    });
    return SecureMessage.fromJson(data['message'] as Map<String, dynamic>);
  }

  Future<MessageThread> createMessageThread({required String subject, required String body}) async {
    if (_isDemoMode) {
      return MessageThread(
        id: 'thread-demo-${DateTime.now().millisecondsSinceEpoch}',
        subject: subject,
        messageCount: 1,
        createdAt: DateTime.now().toIso8601String(),
      );
    }
    final data = await _call('secureMessaging.threads.create', {
      'subject': subject,
      'body': body,
    });
    return MessageThread.fromJson(data['thread'] as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // PROFILE MANAGEMENT
  // ---------------------------------------------------------------------------

  Future<BankingUser> updateProfile({
    String? firstName,
    String? lastName,
    String? email,
    String? phone,
  }) async {
    if (_isDemoMode) return demoUser;
    final data = await _call('auth.updateProfile', {
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
    });
    return BankingUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<void> updateAddress(String id, {
    String? line1,
    String? line2,
    String? city,
    String? state,
    String? zip,
  }) async {
    if (_isDemoMode) return;
    await _call('member.addresses.update', {
      'id': id,
      if (line1 != null) 'line1': line1,
      if (line2 != null) 'line2': line2,
      if (city != null) 'city': city,
      if (state != null) 'state': state,
      if (zip != null) 'zip': zip,
    });
  }

  Future<List<Map<String, dynamic>>> getSessions() async {
    if (_isDemoMode) return demoSessions;
    final data = await _call('sessions.list');
    return (data['sessions'] as List).cast<Map<String, dynamic>>();
  }

  Future<void> revokeSession(String id) async {
    if (_isDemoMode) return;
    await _call('sessions.revoke', {'id': id});
  }

  // ---------------------------------------------------------------------------
  // CARD SERVICES — TRAVEL NOTICES
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> createTravelNotice({
    required String cardId,
    required List<Map<String, String>> destinations,
    required String startDate,
    required String endDate,
    String? contactPhone,
  }) async {
    if (_isDemoMode) {
      return {
        'notice': {
          'id': 'tn-demo-${DateTime.now().millisecondsSinceEpoch}',
          'status': 'active',
        },
      };
    }
    return _call('cardServices.travelNotice.create', {
      'cardId': cardId,
      'destinations': destinations,
      'startDate': startDate,
      'endDate': endDate,
      if (contactPhone != null) 'contactPhone': contactPhone,
    });
  }

  Future<List<Map<String, dynamic>>> listTravelNotices() async {
    if (_isDemoMode) return [];
    final data = await _call('cardServices.travelNotice.list');
    return (data['notices'] as List).cast<Map<String, dynamic>>();
  }

  Future<void> cancelTravelNotice(String id) async {
    if (_isDemoMode) return;
    await _call('cardServices.travelNotice.cancel', {'id': id});
  }

  // ---------------------------------------------------------------------------
  // CARD PROVISIONING
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> getProvisioningConfig() async {
    if (_isDemoMode) {
      return {
        'supportedWallets': ['apple_pay', 'google_pay'],
        'enabled': true,
      };
    }
    final data = await _call('cardProvisioning.config');
    return data['config'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> checkProvisioningEligibility({
    required String cardId,
    required String walletProvider,
  }) async {
    if (_isDemoMode) {
      return {'eligible': true, 'reason': null};
    }
    final data = await _call('cardProvisioning.checkEligibility', {
      'cardId': cardId,
      'walletProvider': walletProvider,
    });
    return data['eligibility'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> initiateProvisioning({
    required String cardId,
    required String walletProvider,
    String? deviceId,
  }) async {
    if (_isDemoMode) {
      return {'provisioningId': 'prov-demo-${DateTime.now().millisecondsSinceEpoch}', 'status': 'initiated'};
    }
    return _call('cardProvisioning.initiate', {
      'cardId': cardId,
      'walletProvider': walletProvider,
      if (deviceId != null) 'deviceId': deviceId,
    });
  }

  Future<Map<String, dynamic>> completeProvisioning({
    required String provisioningId,
    required String cardId,
    required String walletProvider,
    required String walletToken,
  }) async {
    if (_isDemoMode) {
      return {'status': 'completed'};
    }
    return _call('cardProvisioning.complete', {
      'provisioningId': provisioningId,
      'cardId': cardId,
      'walletProvider': walletProvider,
      'walletToken': walletToken,
    });
  }

  Future<Map<String, dynamic>> reportReplaceCard({
    required String cardId,
    required String reason,
    bool digitalOnly = false,
  }) async {
    if (_isDemoMode) {
      return {'replacementId': 'rep-demo-${DateTime.now().millisecondsSinceEpoch}', 'status': 'processing'};
    }
    return _call('cardProvisioning.reportReplace', {
      'cardId': cardId,
      'reason': reason,
      'digitalOnly': digitalOnly,
    });
  }

  // ---------------------------------------------------------------------------
  // DISPUTES
  // ---------------------------------------------------------------------------

  Future<List<Dispute>> getDisputes() async {
    if (_isDemoMode) return demoDisputes;
    final data = await _call('disputes.list');
    final list = data['disputes'] as List;
    return list.map((e) => Dispute.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Dispute> createDispute({
    required String transactionId,
    required String reason,
    String? description,
    required int amountCents,
  }) async {
    if (_isDemoMode) {
      return Dispute(
        id: 'disp-demo-${DateTime.now().millisecondsSinceEpoch}',
        transactionId: transactionId,
        reason: reason,
        description: description,
        amountCents: amountCents,
        status: 'open',
        createdAt: DateTime.now().toIso8601String(),
      );
    }
    final data = await _call('disputes.create', {
      'transactionId': transactionId,
      'reason': reason,
      if (description != null) 'description': description,
      'amountCents': amountCents,
    });
    return Dispute.fromJson(data['dispute'] as Map<String, dynamic>);
  }

  Future<Dispute> getDisputeDetail(String id) async {
    if (_isDemoMode) {
      return demoDisputes.firstWhere((d) => d.id == id, orElse: () => demoDisputes.first);
    }
    final data = await _call('disputes.get', {'id': id});
    return Dispute.fromJson(data['dispute'] as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // WIRE TRANSFERS
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> createWireTransfer({
    required String fromAccountId,
    required String recipientName,
    required String recipientAccountNumber,
    required String recipientRoutingNumber,
    required int amountCents,
    String? memo,
  }) async {
    if (_isDemoMode) {
      return {
        'wire': {
          'id': 'wire-demo-${DateTime.now().millisecondsSinceEpoch}',
          'status': 'processing',
          'feeCents': 2500,
        },
      };
    }
    return _call('wireTransfers.create', {
      'fromAccountId': fromAccountId,
      'recipientName': recipientName,
      'recipientAccountNumber': recipientAccountNumber,
      'recipientRoutingNumber': recipientRoutingNumber,
      'amountCents': amountCents,
      if (memo != null) 'memo': memo,
    });
  }

  Future<Map<String, dynamic>> getWireFees() async {
    if (_isDemoMode) return {'domesticFeeCents': 2500, 'internationalFeeCents': 4500};
    return _call('wireTransfers.fees');
  }

  Future<Map<String, dynamic>> getWireLimits() async {
    if (_isDemoMode) return {'dailyLimitCents': 10000000, 'perTransactionLimitCents': 5000000};
    return _call('wireTransfers.limits');
  }

  // ---------------------------------------------------------------------------
  // DIRECT DEPOSIT
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> getDirectDeposit() async {
    if (_isDemoMode) {
      return {
        'accountId': _checkingId,
        'routingNumber': '021000021',
        'accountNumber': '****4521',
        'status': 'active',
      };
    }
    return _call('directDeposit.get');
  }

  Future<void> updateDirectDeposit({required String accountId}) async {
    if (_isDemoMode) return;
    await _call('directDeposit.update', {'accountId': accountId});
  }

  // ---------------------------------------------------------------------------
  // STOP PAYMENTS
  // ---------------------------------------------------------------------------

  Future<List<Map<String, dynamic>>> getStopPayments() async {
    if (_isDemoMode) return [];
    final data = await _call('stopPayments.list');
    return (data['stopPayments'] as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> createStopPayment({
    required String accountId,
    required String payeeName,
    int? amountCents,
    String? checkNumber,
    String? reason,
  }) async {
    if (_isDemoMode) {
      return {
        'id': 'sp-demo-${DateTime.now().millisecondsSinceEpoch}',
        'status': 'active',
        'feeCents': 3000,
      };
    }
    return _call('stopPayments.create', {
      'accountId': accountId,
      'payeeName': payeeName,
      if (amountCents != null) 'amountCents': amountCents,
      if (checkNumber != null) 'checkNumber': checkNumber,
      if (reason != null) 'reason': reason,
    });
  }

  Future<void> cancelStopPayment(String id) async {
    if (_isDemoMode) return;
    await _call('stopPayments.cancel', {'id': id});
  }

  // ---------------------------------------------------------------------------
  // OVERDRAFT PROTECTION
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> getOverdraftSettings() async {
    if (_isDemoMode) {
      return {
        'enabled': true,
        'sourceAccountId': _savingsId,
        'transferLimitCents': 100000,
      };
    }
    return _call('overdraft.get');
  }

  Future<void> updateOverdraftSettings({
    bool? enabled,
    String? sourceAccountId,
    int? transferLimitCents,
  }) async {
    if (_isDemoMode) return;
    await _call('overdraft.update', {
      if (enabled != null) 'enabled': enabled,
      if (sourceAccountId != null) 'sourceAccountId': sourceAccountId,
      if (transferLimitCents != null) 'transferLimitCents': transferLimitCents,
    });
  }

  // ---------------------------------------------------------------------------
  // STATEMENTS
  // ---------------------------------------------------------------------------

  Future<List<AccountStatement>> getStatements(String accountId) async {
    if (_isDemoMode) return generateDemoStatements(accountId);
    final data = await _call('statements.list', {'accountId': accountId});
    final list = data['statements'] as List;
    return list.map((e) => AccountStatement.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ---------------------------------------------------------------------------
  // STANDING INSTRUCTIONS
  // ---------------------------------------------------------------------------

  Future<List<StandingInstruction>> getStandingInstructions() async {
    if (_isDemoMode) return demoStandingInstructions;
    final data = await _call('standingInstructions.list');
    final list = data['instructions'] as List;
    return list.map((e) => StandingInstruction.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> updateStandingInstruction(String id, {String? status}) async {
    if (_isDemoMode) return;
    await _call('standingInstructions.update', {
      'id': id,
      if (status != null) 'status': status,
    });
  }

  // ---------------------------------------------------------------------------
  // MEMBER PROFILE
  // ---------------------------------------------------------------------------

  Future<BankingUser> getProfile() async {
    if (_isDemoMode) return demoUser;
    final data = await _call('auth.profile');
    return BankingUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<List<MemberAddress>> getMemberAddresses() async {
    if (_isDemoMode) return demoAddresses;
    final data = await _call('member.addresses');
    final list = data['addresses'] as List;
    return list.map((e) => MemberAddress.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<MemberDocument>> getMemberDocuments() async {
    if (_isDemoMode) return demoDocuments;
    final data = await _call('member.documents');
    final list = data['documents'] as List;
    return list.map((e) => MemberDocument.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<MemberIdentifier>> getMemberIdentifiers() async {
    if (_isDemoMode) return demoIdentifiers;
    final data = await _call('member.identifiers');
    final list = data['identifiers'] as List;
    return list.map((e) => MemberIdentifier.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ---------------------------------------------------------------------------
  // ATM / BRANCH LOCATOR
  // ---------------------------------------------------------------------------

  Future<List<BranchLocation>> findLocations({
    required double latitude,
    required double longitude,
    double radiusMiles = 25,
    String? type,
  }) async {
    if (_isDemoMode) {
      var locs = demoLocations;
      if (type != null) locs = locs.where((l) => l.type == type).toList();
      return locs;
    }
    final data = await _call('locations.search', {
      'latitude': latitude,
      'longitude': longitude,
      'radiusMiles': radiusMiles,
      if (type != null) 'type': type,
    });
    final list = data['locations'] as List;
    return list.map((e) => BranchLocation.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ---------------------------------------------------------------------------
  // CMS CONTENT
  // ---------------------------------------------------------------------------

  Future<List<CMSContent>> getCMSContent({
    String channel = 'mobile_app',
    String? contentType,
    int limit = 10,
  }) async {
    if (_isDemoMode) {
      var items = demoCMSContent
          .where((c) => c.channels.contains(channel) && c.status == 'published')
          .toList();
      if (contentType != null) {
        items = items.where((c) => c.contentType == contentType).toList();
      }
      return items.take(limit).toList();
    }
    final data = await _call('cms.content.list', {
      'channel': channel,
      'status': 'published',
      if (contentType != null) 'contentType': contentType,
      'limit': limit,
    });
    final list = data['content'] as List;
    return list.map((e) => CMSContent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<CMSContent>> getCMSBanners({String channel = 'mobile_app'}) {
    return getCMSContent(channel: channel, contentType: 'banner', limit: 5);
  }

  Future<List<CMSContent>> getCMSAnnouncements({String channel = 'mobile_app'}) {
    return getCMSContent(channel: channel, contentType: 'announcement', limit: 5);
  }

  // ---------------------------------------------------------------------------
  // FINANCIAL DATA & INSIGHTS
  // ---------------------------------------------------------------------------

  Future<SpendingSummary> getSpendingSummary({String? periodStart, String? periodEnd}) async {
    if (_isDemoMode) return demoSpendingSummary;
    final data = await _call('financial.spending', {
      if (periodStart != null) 'periodStart': periodStart,
      if (periodEnd != null) 'periodEnd': periodEnd,
    });
    return SpendingSummary.fromJson(data as Map<String, dynamic>);
  }

  Future<List<MonthlyTrend>> getMonthlyTrends({int months = 6}) async {
    if (_isDemoMode) return demoMonthlyTrends;
    final data = await _call('financial.trends', {'months': months});
    final list = data['trends'] as List;
    return list.map((e) => MonthlyTrend.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<BudgetSummary> getBudgets() async {
    if (_isDemoMode) return demoBudgetSummary;
    final data = await _call('financial.budgets.list');
    return BudgetSummary.fromJson(data as Map<String, dynamic>);
  }

  Future<Budget> setBudget({required String category, required int limitCents}) async {
    if (_isDemoMode) {
      return Budget(budgetId: 'bgt-new', category: category, limitCents: limitCents, spentCents: 0, remainingCents: limitCents, percentUsed: 0, isOverBudget: false, projectedCents: 0);
    }
    final data = await _call('financial.budgets.set', {'category': category, 'limitCents': limitCents});
    return Budget.fromJson(data as Map<String, dynamic>);
  }

  Future<NetWorthSnapshot> getNetWorth() async {
    if (_isDemoMode) return demoNetWorth;
    final data = await _call('financial.networth');
    return NetWorthSnapshot.fromJson(data as Map<String, dynamic>);
  }

  Future<RecurringSummary> getRecurringTransactions() async {
    if (_isDemoMode) return demoRecurringSummary;
    final data = await _call('financial.recurring');
    return RecurringSummary.fromJson(data as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // CARD-LINKED OFFERS
  // ---------------------------------------------------------------------------

  Future<List<MerchantOffer>> getOffers({String? status, String? category}) async {
    if (_isDemoMode) {
      var offers = List<MerchantOffer>.from(demoOffers);
      if (status != null) offers = offers.where((o) => o.status == status).toList();
      if (category != null) offers = offers.where((o) => o.merchant.category == category).toList();
      return offers;
    }
    final data = await _call('offers.list', {
      if (status != null) 'status': status,
      if (category != null) 'category': category,
    });
    final list = (data['offers'] as List?) ?? [];
    return list.map((e) => MerchantOffer.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> activateOffer({required String offerId, required String cardId}) async {
    if (_isDemoMode) return;
    await _call('offers.activate', {'offerId': offerId, 'cardId': cardId});
  }

  Future<void> deactivateOffer(String offerId) async {
    if (_isDemoMode) return;
    await _call('offers.deactivate', {'offerId': offerId});
  }

  Future<List<OfferRedemption>> getOfferRedemptions() async {
    if (_isDemoMode) return demoRedemptions;
    final data = await _call('offers.redemptions');
    final list = (data['redemptions'] as List?) ?? [];
    return list.map((e) => OfferRedemption.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<OfferSummary> getOfferSummary() async {
    if (_isDemoMode) return demoOfferSummary;
    final data = await _call('offers.summary');
    return OfferSummary.fromJson(data as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // EXPERIMENTS
  // ---------------------------------------------------------------------------

  Future<ExperimentAssignment> getExperimentAssignment(String experimentId) async {
    if (_isDemoMode) {
      return ExperimentAssignment(
        id: 'assign-demo-${DateTime.now().millisecondsSinceEpoch}',
        experimentId: experimentId,
        userId: 'demo-user',
        variantId: 'var-001',
        assignedAt: DateTime.now().toIso8601String(),
      );
    }
    final data = await _call('experiments.assign', {'experimentId': experimentId});
    return ExperimentAssignment.fromJson(data as Map<String, dynamic>);
  }

  Future<void> trackExperimentEvent({
    required String experimentId,
    required String variantId,
    required String eventType,
    Map<String, dynamic>? metadata,
  }) async {
    if (_isDemoMode) return;
    await _call('experiments.track', {
      'experimentId': experimentId,
      'variantId': variantId,
      'eventType': eventType,
      if (metadata != null) 'metadata': metadata,
    });
  }
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

String _isoDate(int daysAgo) {
  return DateTime.now().subtract(Duration(days: daysAgo)).toIso8601String();
}

String _futureDate(int daysAhead) {
  return DateTime.now().add(Duration(days: daysAhead)).toIso8601String();
}

class GatewayException implements Exception {
  final String code;
  final String message;

  const GatewayException({required this.code, required this.message});

  @override
  String toString() => 'GatewayException($code): $message';
}

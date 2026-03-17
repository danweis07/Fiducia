import 'package:flutter_test/flutter_test.dart';
import 'package:digital_banking/models/banking.dart';
import 'package:digital_banking/models/financial_data.dart';

void main() {
  group('Account', () {
    test('fromJson should deserialize all fields correctly', () {
      final json = {
        'id': 'acc-1',
        'type': 'checking',
        'nickname': 'Primary Checking',
        'accountNumberMasked': '****4521',
        'routingNumber': '021000021',
        'balanceCents': 1254783,
        'availableBalanceCents': 1254783,
        'status': 'active',
        'interestRateBps': 25,
        'openedAt': '2023-01-15T00:00:00Z',
        'closedAt': null,
      };

      final account = Account.fromJson(json);

      expect(account.id, 'acc-1');
      expect(account.type, 'checking');
      expect(account.nickname, 'Primary Checking');
      expect(account.accountNumberMasked, '****4521');
      expect(account.routingNumber, '021000021');
      expect(account.balanceCents, 1254783);
      expect(account.availableBalanceCents, 1254783);
      expect(account.status, 'active');
      expect(account.interestRateBps, 25);
      expect(account.openedAt, '2023-01-15T00:00:00Z');
      expect(account.closedAt, isNull);
    });

    test('displayName should prefer nickname over type', () {
      final withNickname = Account(
        id: '1', type: 'checking', nickname: 'My Checking',
        accountNumberMasked: '****1234', routingNumber: '021000021',
        balanceCents: 100, availableBalanceCents: 100,
        status: 'active', interestRateBps: 0, openedAt: '2023-01-01',
      );
      expect(withNickname.displayName, 'My Checking');

      final withoutNickname = Account(
        id: '1', type: 'savings',
        accountNumberMasked: '****1234', routingNumber: '021000021',
        balanceCents: 100, availableBalanceCents: 100,
        status: 'active', interestRateBps: 0, openedAt: '2023-01-01',
      );
      expect(withoutNickname.displayName, 'Savings Account');
    });

    test('monetary values must be integer cents, not floating-point', () {
      final account = Account(
        id: '1', type: 'checking',
        accountNumberMasked: '****1234', routingNumber: '021000021',
        balanceCents: 123456, availableBalanceCents: 123400,
        status: 'active', interestRateBps: 50, openedAt: '2023-01-01',
      );

      expect(account.balanceCents, isA<int>());
      expect(account.availableBalanceCents, isA<int>());
      expect(account.interestRateBps, isA<int>());
    });
  });

  group('Transaction', () {
    test('fromJson should deserialize correctly', () {
      final json = {
        'id': 'txn-1',
        'accountId': 'acc-1',
        'type': 'debit',
        'amountCents': -4299,
        'description': 'Whole Foods Market',
        'category': 'groceries',
        'status': 'posted',
        'merchantName': 'Whole Foods',
        'runningBalanceCents': 1254783,
        'postedAt': '2026-03-14T10:30:00Z',
        'createdAt': '2026-03-14T10:30:00Z',
      };

      final txn = Transaction.fromJson(json);

      expect(txn.id, 'txn-1');
      expect(txn.amountCents, -4299);
      expect(txn.description, 'Whole Foods Market');
      expect(txn.category, 'groceries');
      expect(txn.merchantName, 'Whole Foods');
    });

    test('isCredit should be true for positive amounts', () {
      final credit = Transaction(
        id: '1', accountId: '1', type: 'credit',
        amountCents: 350000, description: 'Payroll',
        category: 'income', status: 'posted',
        runningBalanceCents: 1000000, createdAt: '2026-01-01',
      );
      expect(credit.isCredit, isTrue);

      final debit = Transaction(
        id: '2', accountId: '1', type: 'debit',
        amountCents: -4299, description: 'Coffee',
        category: 'dining', status: 'posted',
        runningBalanceCents: 1000000, createdAt: '2026-01-01',
      );
      expect(debit.isCredit, isFalse);
    });

    test('zero amount should be treated as credit', () {
      final zero = Transaction(
        id: '3', accountId: '1', type: 'fee_reversal',
        amountCents: 0, description: 'Fee Reversal',
        category: 'other', status: 'posted',
        runningBalanceCents: 1000000, createdAt: '2026-01-01',
      );
      expect(zero.isCredit, isTrue);
    });
  });

  group('Loan', () {
    test('progressPercent should calculate correctly', () {
      final loan = Loan(
        id: '1', loanNumberMasked: '****3291',
        principalCents: 2800000, interestRateBps: 549,
        termMonths: 60, outstandingBalanceCents: 2245000,
        principalPaidCents: 555000, interestPaidCents: 128000,
        status: 'active', daysPastDue: 0, createdAt: '2024-01-15',
      );

      // (2800000 - 2245000) / 2800000 * 100 = 19.82 -> 20
      expect(loan.progressPercent, 20);
    });

    test('progressPercent should be 0 when principal is 0', () {
      final loan = Loan(
        id: '1', loanNumberMasked: '****0000',
        principalCents: 0, interestRateBps: 0,
        termMonths: 0, outstandingBalanceCents: 0,
        principalPaidCents: 0, interestPaidCents: 0,
        status: 'closed', daysPastDue: 0, createdAt: '2024-01-15',
      );

      expect(loan.progressPercent, 0);
    });
  });

  group('BankCard', () {
    test('isLocked should check status correctly', () {
      final active = BankCard(
        id: '1', accountId: '1', type: 'debit', lastFour: '4521',
        cardholderName: 'TEST', status: 'active',
        dailyLimitCents: 500000, singleTransactionLimitCents: 250000,
        expirationDate: '12/28', isContactless: true, isVirtual: false,
      );
      expect(active.isLocked, isFalse);
      expect(active.isActive, isTrue);

      final locked = BankCard(
        id: '2', accountId: '1', type: 'credit', lastFour: '9832',
        cardholderName: 'TEST', status: 'locked',
        dailyLimitCents: 1000000, singleTransactionLimitCents: 500000,
        expirationDate: '03/27', isContactless: true, isVirtual: false,
      );
      expect(locked.isLocked, isTrue);
      expect(locked.isActive, isFalse);
    });
  });

  group('Bill', () {
    test('isPaid and isUpcoming should check status correctly', () {
      final paid = Bill(
        id: '1', payeeName: 'Electric', payeeAccountNumberMasked: '****1234',
        amountCents: 15000, dueDate: '2026-03-15', status: 'paid',
        autopay: false, fromAccountId: 'acc-1', createdAt: '2026-03-01',
      );
      expect(paid.isPaid, isTrue);
      expect(paid.isUpcoming, isFalse);

      final scheduled = Bill(
        id: '2', payeeName: 'Phone', payeeAccountNumberMasked: '****5678',
        amountCents: 8999, dueDate: '2026-04-01', status: 'scheduled',
        autopay: true, fromAccountId: 'acc-1', createdAt: '2026-03-01',
      );
      expect(scheduled.isPaid, isFalse);
      expect(scheduled.isUpcoming, isTrue);
    });
  });

  group('BankingUser', () {
    test('fullName and initials should generate correctly', () {
      final user = BankingUser(
        id: '1', email: 'test@example.com',
        firstName: 'John', lastName: 'Doe',
        kycStatus: 'approved', mfaEnabled: true,
      );

      expect(user.fullName, 'John Doe');
      expect(user.initials, 'JD');
    });
  });

  group('SpendingSummary', () {
    test('fromJson should deserialize with nested categories', () {
      final json = {
        'totalSpendingCents': 385200,
        'totalIncomeCents': 650000,
        'netCashFlowCents': 264800,
        'avgDailySpendingCents': 12840,
        'periodStart': '2026-02-14',
        'periodEnd': '2026-03-14',
        'byCategory': [
          {
            'category': 'housing',
            'totalCents': 150000,
            'transactionCount': 1,
            'percentOfTotal': 38.9,
            'trend': 'stable',
            'changeFromPreviousCents': 0,
            'topMerchants': [],
          },
        ],
      };

      final summary = SpendingSummary.fromJson(json);

      expect(summary.totalSpendingCents, 385200);
      expect(summary.netCashFlowCents, 264800);
      expect(summary.byCategory.length, 1);
      expect(summary.byCategory.first.category, 'housing');
      expect(summary.byCategory.first.percentOfTotal, 38.9);
    });
  });

  group('RDCDeposit', () {
    test('fromJson should deserialize correctly', () {
      final json = {
        'id': 'rdc-001',
        'accountId': 'acc-1',
        'amountCents': 125000,
        'status': 'cleared',
        'checkNumber': '1042',
        'rejectionReason': null,
        'clearedAt': '2026-03-07T00:00:00Z',
        'createdAt': '2026-03-05T00:00:00Z',
      };

      final deposit = RDCDeposit.fromJson(json);

      expect(deposit.id, 'rdc-001');
      expect(deposit.amountCents, 125000);
      expect(deposit.status, 'cleared');
      expect(deposit.checkNumber, '1042');
      expect(deposit.rejectionReason, isNull);
    });
  });
}

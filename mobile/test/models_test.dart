import 'package:flutter_test/flutter_test.dart';
import 'package:digital_banking/models/banking.dart';

void main() {
  group('Account', () {
    test('should deserialize from JSON', () {
      final json = {
        'id': 'acc-1',
        'type': 'checking',
        'nickname': 'Primary',
        'accountNumberMasked': '****4521',
        'routingNumber': '021000021',
        'balanceCents': 542310,
        'availableBalanceCents': 537810,
        'status': 'active',
        'interestRateBps': 10,
        'openedAt': '2023-01-15T00:00:00Z',
        'closedAt': null,
      };

      final account = Account.fromJson(json);

      expect(account.id, 'acc-1');
      expect(account.type, 'checking');
      expect(account.nickname, 'Primary');
      expect(account.accountNumberMasked, '****4521');
      expect(account.balanceCents, 542310);
      expect(account.availableBalanceCents, 537810);
      expect(account.status, 'active');
      expect(account.interestRateBps, 10);
      expect(account.closedAt, isNull);
    });

    test('displayName should use nickname when available', () {
      final account = Account(
        id: 'acc-1',
        type: 'checking',
        nickname: 'My Checking',
        accountNumberMasked: '****4521',
        routingNumber: '021000021',
        balanceCents: 100000,
        availableBalanceCents: 100000,
        status: 'active',
        interestRateBps: 0,
        openedAt: '2023-01-01T00:00:00Z',
      );

      expect(account.displayName, 'My Checking');
    });

    test('displayName should fall back to type when no nickname', () {
      final account = Account(
        id: 'acc-1',
        type: 'savings',
        accountNumberMasked: '****8903',
        routingNumber: '021000021',
        balanceCents: 500000,
        availableBalanceCents: 500000,
        status: 'active',
        interestRateBps: 425,
        openedAt: '2023-01-01T00:00:00Z',
      );

      expect(account.displayName, 'Savings Account');
    });

    test('should handle all monetary values as integer cents', () {
      final account = Account(
        id: 'acc-1',
        type: 'checking',
        accountNumberMasked: '****1234',
        routingNumber: '021000021',
        balanceCents: 123456,
        availableBalanceCents: 123400,
        status: 'active',
        interestRateBps: 50,
        openedAt: '2023-01-01T00:00:00Z',
      );

      // Verify cents values (no floating point)
      expect(account.balanceCents, isA<int>());
      expect(account.availableBalanceCents, isA<int>());
      expect(account.interestRateBps, isA<int>());
    });
  });

  group('Transaction', () {
    test('should deserialize from JSON', () {
      final json = {
        'id': 'txn-1',
        'accountId': 'acc-1',
        'type': 'debit',
        'amountCents': -2500,
        'description': 'Coffee Shop',
        'category': 'dining',
        'status': 'posted',
        'merchantName': 'Starbucks',
        'merchantCategory': null,
        'runningBalanceCents': 539810,
        'postedAt': '2026-03-14T10:30:00Z',
        'createdAt': '2026-03-14T10:30:00Z',
      };

      final txn = Transaction.fromJson(json);

      expect(txn.id, 'txn-1');
      expect(txn.accountId, 'acc-1');
      expect(txn.type, 'debit');
      expect(txn.amountCents, -2500);
      expect(txn.description, 'Coffee Shop');
      expect(txn.merchantName, 'Starbucks');
    });
  });

  group('Transfer', () {
    test('should deserialize from JSON', () {
      final json = {
        'id': 'xfer-1',
        'fromAccountId': 'acc-1',
        'toAccountId': 'acc-2',
        'toBeneficiaryId': null,
        'type': 'internal',
        'amountCents': 50000,
        'memo': 'Savings transfer',
        'status': 'completed',
        'scheduledDate': null,
        'recurringRule': null,
        'processedAt': '2026-03-14T12:00:00Z',
        'createdAt': '2026-03-14T11:00:00Z',
      };

      final transfer = Transfer.fromJson(json);

      expect(transfer.id, 'xfer-1');
      expect(transfer.amountCents, 50000);
      expect(transfer.status, 'completed');
      expect(transfer.memo, 'Savings transfer');
    });
  });

  group('Card', () {
    test('should deserialize from JSON', () {
      final json = {
        'id': 'card-1',
        'accountId': 'acc-1',
        'type': 'debit',
        'lastFour': '4521',
        'cardholderName': 'JOHN DOE',
        'status': 'active',
        'dailyLimitCents': 250000,
        'singleTransactionLimitCents': 100000,
        'expirationDate': '12/27',
        'isContactless': true,
        'isVirtual': false,
      };

      final card = BankingCard.fromJson(json);

      expect(card.id, 'card-1');
      expect(card.lastFour, '4521');
      expect(card.status, 'active');
      expect(card.dailyLimitCents, 250000);
      expect(card.isContactless, true);
    });
  });

  group('Bill', () {
    test('should deserialize from JSON', () {
      final json = {
        'id': 'bill-1',
        'payeeName': 'Electric Company',
        'payeeAccountNumberMasked': '****5678',
        'amountCents': 15000,
        'dueDate': '2026-03-20',
        'status': 'scheduled',
        'autopay': true,
        'fromAccountId': 'acc-1',
        'paidAt': null,
        'createdAt': '2026-03-01T00:00:00Z',
      };

      final bill = Bill.fromJson(json);

      expect(bill.id, 'bill-1');
      expect(bill.payeeName, 'Electric Company');
      expect(bill.amountCents, 15000);
      expect(bill.autopay, true);
      expect(bill.status, 'scheduled');
    });
  });
}

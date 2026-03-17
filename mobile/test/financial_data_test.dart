import 'package:flutter_test/flutter_test.dart';
import 'package:digital_banking/models/financial_data.dart';

void main() {
  group('SpendingCategory', () {
    test('should have expected categories', () {
      // Verify core spending categories exist
      expect(SpendingCategory.values, isNotEmpty);
      expect(SpendingCategory.values.contains(SpendingCategory.housing), true);
      expect(SpendingCategory.values.contains(SpendingCategory.groceries), true);
      expect(SpendingCategory.values.contains(SpendingCategory.transportation), true);
    });
  });

  group('SpendingByCategory', () {
    test('should deserialize from JSON', () {
      final json = {
        'category': 'food_dining',
        'totalCents': 62000,
        'transactionCount': 28,
        'percentOfTotal': 11.0,
        'trend': 'up',
        'changeFromPreviousCents': 5200,
        'topMerchants': [
          {'name': 'Starbucks', 'totalCents': 18000},
        ],
      };

      final spending = SpendingByCategory.fromJson(json);

      expect(spending.totalCents, 62000);
      expect(spending.transactionCount, 28);
      expect(spending.trend, 'up');
      expect(spending.topMerchants, isNotEmpty);
    });
  });

  group('Budget', () {
    test('should deserialize from JSON', () {
      final json = {
        'budgetId': 'bgt_food',
        'category': 'food_dining',
        'limitCents': 60000,
        'spentCents': 52000,
        'remainingCents': 8000,
        'percentUsed': 87.0,
        'isOverBudget': false,
        'projectedCents': 65000,
      };

      final budget = Budget.fromJson(json);

      expect(budget.budgetId, 'bgt_food');
      expect(budget.limitCents, 60000);
      expect(budget.spentCents, 52000);
      expect(budget.isOverBudget, false);
      expect(budget.percentUsed, 87.0);
    });

    test('should detect over-budget state', () {
      final json = {
        'budgetId': 'bgt_shopping',
        'category': 'shopping',
        'limitCents': 30000,
        'spentCents': 42000,
        'remainingCents': -12000,
        'percentUsed': 140.0,
        'isOverBudget': true,
        'projectedCents': 52000,
      };

      final budget = Budget.fromJson(json);
      expect(budget.isOverBudget, true);
      expect(budget.remainingCents, -12000);
    });
  });

  group('RecurringTransaction', () {
    test('should deserialize from JSON', () {
      final json = {
        'recurringId': 'rec_1',
        'merchantName': 'Netflix',
        'merchantLogoUrl': 'https://logo.clearbit.com/netflix.com',
        'category': 'subscriptions',
        'averageAmountCents': 1599,
        'lastAmountCents': 1599,
        'frequency': 'monthly',
        'nextExpectedDate': '2026-04-01',
        'isActive': true,
        'lastChargeDate': '2026-03-01',
        'chargeCount': 24,
      };

      final recurring = RecurringTransaction.fromJson(json);

      expect(recurring.merchantName, 'Netflix');
      expect(recurring.averageAmountCents, 1599);
      expect(recurring.frequency, 'monthly');
      expect(recurring.isActive, true);
      expect(recurring.chargeCount, 24);
    });
  });

  group('NetWorthSnapshot', () {
    test('should deserialize from JSON', () {
      final json = {
        'date': '2026-03-14',
        'totalAssetsCents': 8274883,
        'totalLiabilitiesCents': 35695000,
        'netWorthCents': -27420117,
        'accounts': [
          {
            'accountId': 'acc-checking',
            'name': 'Primary Checking',
            'type': 'asset',
            'balanceCents': 1254783,
            'institution': 'Digital Bank',
          },
        ],
      };

      final snapshot = NetWorthSnapshot.fromJson(json);

      expect(snapshot.totalAssetsCents, 8274883);
      expect(snapshot.totalLiabilitiesCents, 35695000);
      expect(snapshot.netWorthCents, -27420117);
      expect(snapshot.accounts, isNotEmpty);
    });

    test('net worth should equal assets minus liabilities', () {
      final json = {
        'date': '2026-03-14',
        'totalAssetsCents': 8274883,
        'totalLiabilitiesCents': 35695000,
        'netWorthCents': 8274883 - 35695000,
        'accounts': [],
      };

      final snapshot = NetWorthSnapshot.fromJson(json);
      expect(
        snapshot.netWorthCents,
        snapshot.totalAssetsCents - snapshot.totalLiabilitiesCents,
      );
    });
  });
}

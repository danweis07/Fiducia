import 'package:flutter_test/flutter_test.dart';
import 'package:digital_banking/utils/currency.dart';

void main() {
  group('formatCurrency', () {
    test('should format positive cents correctly', () {
      expect(formatCurrency(0), '\$0.00');
      expect(formatCurrency(1), '\$0.01');
      expect(formatCurrency(99), '\$0.99');
      expect(formatCurrency(100), '\$1.00');
      expect(formatCurrency(1234), '\$12.34');
      expect(formatCurrency(123456), '\$1,234.56');
      expect(formatCurrency(1254783), '\$12,547.83');
    });

    test('should format negative cents correctly', () {
      expect(formatCurrency(-100), '-\$1.00');
      expect(formatCurrency(-4299), '-\$42.99');
      expect(formatCurrency(-125000), '-\$1,250.00');
    });

    test('should format zero correctly', () {
      expect(formatCurrency(0), '\$0.00');
    });

    test('should format large amounts with commas', () {
      expect(formatCurrency(100000000), '\$1,000,000.00');
      expect(formatCurrency(35000000), '\$350,000.00');
    });
  });

  group('formatInterestRate', () {
    test('should format basis points to percentage', () {
      expect(formatInterestRate(0), '0.00%');
      expect(formatInterestRate(25), '0.25%');
      expect(formatInterestRate(425), '4.25%');
      expect(formatInterestRate(500), '5.00%');
      expect(formatInterestRate(549), '5.49%');
      expect(formatInterestRate(689), '6.89%');
      expect(formatInterestRate(1000), '10.00%');
    });
  });

  group('parseToCents', () {
    test('should parse dollar strings to cents', () {
      expect(parseToCents('0'), 0);
      expect(parseToCents('1'), 100);
      expect(parseToCents('0.01'), 1);
      expect(parseToCents('12.34'), 1234);
      expect(parseToCents('1250.00'), 125000);
    });

    test('should handle dollar sign and commas', () {
      expect(parseToCents('\$12.34'), 1234);
      expect(parseToCents('\$1,250.00'), 125000);
      expect(parseToCents('1,000'), 100000);
    });

    test('should return 0 for invalid input', () {
      expect(parseToCents(''), 0);
      expect(parseToCents('abc'), 0);
      expect(parseToCents('not a number'), 0);
    });

    test('should handle edge cases', () {
      expect(parseToCents('0.005'), 1); // Rounds 0.5 cents up
      expect(parseToCents('.99'), 99);
      expect(parseToCents('100'), 10000);
    });

    test('should round correctly to nearest cent', () {
      expect(parseToCents('10.999'), 1100);
      expect(parseToCents('10.994'), 1099);
    });
  });
}

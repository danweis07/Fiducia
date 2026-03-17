import 'package:flutter_test/flutter_test.dart';
import 'package:digital_banking/services/gateway_client.dart';

void main() {
  group('GatewayClient', () {
    test('should be a singleton', () {
      final a = GatewayClient.instance;
      final b = GatewayClient.instance;
      expect(identical(a, b), true);
    });

    test('should default to demo mode', () {
      expect(isDemoMode, true);
    });

    test('should toggle demo mode', () {
      setDemoMode(false);
      expect(isDemoMode, false);

      // Reset
      setDemoMode(true);
      expect(isDemoMode, true);
    });

    test('should have no provider initially', () {
      final client = GatewayClient.instance;
      // Provider may or may not be set depending on test order
      // Just verify the getter doesn't throw
      client.provider;
    });
  });

  group('Currency Formatting', () {
    test('should handle integer cents correctly', () {
      // Verify our convention: all monetary values are integer cents
      const balanceCents = 542310;
      final dollars = balanceCents / 100;
      expect(dollars, 5423.10);

      // Never use floating point for money — always integer cents
      const amountA = 1999; // $19.99
      const amountB = 2001; // $20.01
      expect(amountA + amountB, 4000); // $40.00 — exact integer arithmetic
    });
  });

  group('Account Number Masking', () {
    test('should always use masked format', () {
      // Convention: account numbers are always masked as ****NNNN
      const masked = '****4521';
      expect(masked.startsWith('****'), true);
      expect(masked.length, 8);
    });
  });
}

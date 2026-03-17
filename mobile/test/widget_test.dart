import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:digital_banking/main.dart';

void main() {
  group('App Smoke Tests', () {
    testWidgets('app should launch in demo mode without crashing', (tester) async {
      await tester.pumpWidget(const DigitalBankingApp(demoMode: true));
      await tester.pumpAndSettle();

      // Verify the app renders with the correct title
      expect(find.text('Digital Banking'), findsOneWidget);
    });

    testWidgets('bottom navigation should have 4 destinations', (tester) async {
      await tester.pumpWidget(const DigitalBankingApp(demoMode: true));
      await tester.pumpAndSettle();

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Accounts'), findsOneWidget);
      expect(find.text('Move Money'), findsOneWidget);
      expect(find.text('More'), findsOneWidget);
    });

    testWidgets('dashboard should show welcome text', (tester) async {
      await tester.pumpWidget(const DigitalBankingApp(demoMode: true));
      await tester.pumpAndSettle();

      expect(find.text('Welcome back'), findsOneWidget);
    });

    testWidgets('dashboard should display account cards', (tester) async {
      await tester.pumpWidget(const DigitalBankingApp(demoMode: true));
      await tester.pumpAndSettle();

      // Demo mode should show the Primary Checking account
      expect(find.text('Primary Checking'), findsOneWidget);
    });

    testWidgets('dashboard should show quick action buttons', (tester) async {
      await tester.pumpWidget(const DigitalBankingApp(demoMode: true));
      await tester.pumpAndSettle();

      expect(find.text('Transfer'), findsOneWidget);
      expect(find.text('Pay Bills'), findsOneWidget);
      expect(find.text('Deposit'), findsOneWidget);
      expect(find.text('Cards'), findsOneWidget);
    });

    testWidgets('tapping Accounts tab navigates to accounts screen', (tester) async {
      await tester.pumpWidget(const DigitalBankingApp(demoMode: true));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Accounts'));
      await tester.pumpAndSettle();

      // Should show Deposit Accounts header
      expect(find.text('Deposit Accounts'), findsOneWidget);
    });
  });
}

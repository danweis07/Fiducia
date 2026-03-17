import 'package:intl/intl.dart';

/// Currency formatting — mirrors src/lib/common/currency.ts
/// All amounts are stored as integer cents.

final _currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
final _percentFormat = NumberFormat.decimalPercentPattern(decimalDigits: 2);

/// Format cents to display string: 123456 → "\$1,234.56"
String formatCurrency(int cents) {
  return _currencyFormat.format(cents / 100);
}

/// Format basis points to percentage: 425 → "4.25%"
String formatInterestRate(int bps) {
  return _percentFormat.format(bps / 10000);
}

/// Parse dollar string to cents: "12.34" → 1234
int parseToCents(String input) {
  final value = double.tryParse(input.replaceAll(RegExp(r'[^0-9.]'), ''));
  if (value == null) return 0;
  return (value * 100).round();
}

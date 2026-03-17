import 'package:flutter/material.dart';
import '../utils/currency.dart';

/// Formatted currency display — configurable size, color, and sign visibility.
/// All values are integer cents, mirroring the web CurrencyDisplay component.
class AmountDisplay extends StatelessWidget {
  final int cents;
  final TextStyle? style;
  final bool showSign;
  final bool colorize;
  final MainAxisAlignment alignment;

  const AmountDisplay({
    super.key,
    required this.cents,
    this.style,
    this.showSign = false,
    this.colorize = false,
    this.alignment = MainAxisAlignment.start,
  });

  @override
  Widget build(BuildContext context) {
    final isPositive = cents >= 0;
    final prefix = showSign ? (isPositive ? '+' : '') : '';
    final text = '$prefix${formatCurrency(cents)}';

    Color? color;
    if (colorize) {
      color = isPositive ? Colors.green.shade700 : Colors.red.shade700;
    }

    final effectiveStyle = (style ?? Theme.of(context).textTheme.bodyLarge)
        ?.copyWith(color: color);

    return Text(text, style: effectiveStyle);
  }
}

/// Large hero-style amount display for account balances.
class HeroAmountDisplay extends StatelessWidget {
  final int cents;
  final String? label;
  final String? sublabel;

  const HeroAmountDisplay({
    super.key,
    required this.cents,
    this.label,
    this.sublabel,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null)
          Text(
            label!,
            style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
          ),
        if (label != null) const SizedBox(height: 4),
        Text(
          formatCurrency(cents),
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        if (sublabel != null) ...[
          const SizedBox(height: 2),
          Text(
            sublabel!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ],
    );
  }
}

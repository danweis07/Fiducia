import 'package:flutter/material.dart';
import '../../widgets/empty_state.dart';

/// Stub "Coming Soon" screen for financial calculators.
class CalculatorsScreen extends StatelessWidget {
  const CalculatorsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Calculators')),
      body: const EmptyState(
        icon: Icons.calculate_outlined,
        title: 'Coming Soon',
        description:
            'Financial calculators will be available in a future update.',
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../../widgets/empty_state.dart';

/// Stub "Coming Soon" screen for financial education / literacy resources.
class LearnScreen extends StatelessWidget {
  const LearnScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Financial Education')),
      body: const EmptyState(
        icon: Icons.school_outlined,
        title: 'Coming Soon',
        description:
            'Financial literacy resources will be available in a future update.',
      ),
    );
  }
}

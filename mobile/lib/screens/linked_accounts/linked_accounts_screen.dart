import 'package:flutter/material.dart';
import '../../utils/currency.dart';

/// Linked Accounts screen — mirrors web LinkedAccounts.tsx
/// Shows external accounts linked via Plaid (demo data).
class LinkedAccountsScreen extends StatelessWidget {
  const LinkedAccountsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Demo linked accounts (Plaid integration not connected)
    final linkedAccounts = [
      _LinkedAccount(
        institutionName: 'Chase Bank',
        accountName: 'Chase Checking',
        accountNumberMasked: '****6789',
        type: 'checking',
        balanceCents: 325480,
        lastSynced: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      _LinkedAccount(
        institutionName: 'Bank of America',
        accountName: 'BofA Savings',
        accountNumberMasked: '****3456',
        type: 'savings',
        balanceCents: 1250000,
        lastSynced: DateTime.now().subtract(const Duration(hours: 5)),
      ),
    ];

    final totalExternal = linkedAccounts.fold<int>(0, (sum, a) => sum + a.balanceCents);

    return Scaffold(
      appBar: AppBar(title: const Text('Linked Accounts')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Total balance
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Total External Balance', style: theme.textTheme.titleSmall?.copyWith(color: Colors.grey)),
                  const SizedBox(height: 4),
                  Text(
                    formatCurrency(totalExternal),
                    style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text('${linkedAccounts.length} linked account${linkedAccounts.length == 1 ? '' : 's'}',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Linked accounts
          ...linkedAccounts.map((acct) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.teal.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.account_balance, size: 22, color: Colors.teal.shade700),
              ),
              title: Text(acct.accountName, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${acct.institutionName} \u00B7 ${acct.accountNumberMasked}'),
                  Text('Last synced ${_timeAgo(acct.lastSynced)}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                ],
              ),
              trailing: Text(formatCurrency(acct.balanceCents), style: const TextStyle(fontWeight: FontWeight.w600)),
              isThreeLine: true,
            ),
          )),

          const SizedBox(height: 24),

          // Link new account button
          OutlinedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Plaid integration coming soon')),
              );
            },
            icon: const Icon(Icons.add),
            label: const Text('Link Another Account'),
          ),

          const SizedBox(height: 16),
          Card(
            color: Colors.blue.shade50,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 18, color: Colors.blue.shade700),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Linked accounts are read-only. You can view balances and transactions but cannot make transfers from external accounts.',
                      style: TextStyle(fontSize: 12, color: Colors.blue.shade800),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

class _LinkedAccount {
  final String institutionName;
  final String accountName;
  final String accountNumberMasked;
  final String type;
  final int balanceCents;
  final DateTime lastSynced;

  const _LinkedAccount({
    required this.institutionName,
    required this.accountName,
    required this.accountNumberMasked,
    required this.type,
    required this.balanceCents,
    required this.lastSynced,
  });
}

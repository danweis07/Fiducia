import 'package:flutter/material.dart';
import '../../models/banking.dart';
import '../../services/gateway_client.dart';
import '../../utils/currency.dart';

/// Statements screen — mirrors web Statements.tsx
/// Lists account statements with period, balances, and download option.
class StatementsScreen extends StatefulWidget {
  const StatementsScreen({super.key});

  @override
  State<StatementsScreen> createState() => _StatementsScreenState();
}

class _StatementsScreenState extends State<StatementsScreen> {
  List<Account> _accounts = [];
  List<AccountStatement> _statements = [];
  String? _selectedAccountId;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAccounts();
  }

  Future<void> _loadAccounts() async {
    try {
      final accounts = await GatewayClient.instance.getAccounts();
      if (mounted) {
        setState(() {
          _accounts = accounts;
          _selectedAccountId = accounts.isNotEmpty ? accounts.first.id : null;
        });
        if (_selectedAccountId != null) _loadStatements();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadStatements() async {
    if (_selectedAccountId == null) return;
    setState(() => _isLoading = true);
    try {
      final stmts = await GatewayClient.instance.getStatements(_selectedAccountId!);
      if (mounted) setState(() { _statements = stmts; _isLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Statements')),
      body: Column(
        children: [
          // Account selector
          if (_accounts.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: DropdownButtonFormField<String>(
                value: _selectedAccountId,
                decoration: const InputDecoration(
                  labelText: 'Account',
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
                items: _accounts.map((a) => DropdownMenuItem(
                  value: a.id,
                  child: Text('${a.displayName} (${a.accountNumberMasked})'),
                )).toList(),
                onChanged: (id) {
                  setState(() => _selectedAccountId = id);
                  _loadStatements();
                },
              ),
            ),

          // eStatements info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Card(
              color: Colors.green.shade50,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(Icons.eco, size: 18, color: Colors.green.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'eStatements are enabled. Statements are retained for 24 months.',
                        style: TextStyle(fontSize: 12, color: Colors.green.shade800),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Statement list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _statements.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.description, size: 48, color: Colors.grey.shade300),
                            const SizedBox(height: 16),
                            Text('No statements available', style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _statements.length,
                        itemBuilder: (context, index) {
                          final stmt = _statements[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(stmt.periodLabel, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.indigo.shade50,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(stmt.format.toUpperCase(), style: TextStyle(fontSize: 10, color: Colors.indigo.shade700, fontWeight: FontWeight.w500)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text('Opening', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                            Text(formatCurrency(stmt.openingBalanceCents), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                          ],
                                        ),
                                      ),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text('Closing', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                            Text(formatCurrency(stmt.closingBalanceCents), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                          ],
                                        ),
                                      ),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            Text('Transactions', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                            Text('${stmt.transactionCount}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Text(
                                        'Credits: ${formatCurrency(stmt.totalCreditsCents)}',
                                        style: TextStyle(fontSize: 12, color: Colors.green.shade600),
                                      ),
                                      const SizedBox(width: 16),
                                      Text(
                                        'Debits: ${formatCurrency(stmt.totalDebitsCents)}',
                                        style: TextStyle(fontSize: 12, color: Colors.red.shade600),
                                      ),
                                      const Spacer(),
                                      IconButton(
                                        icon: const Icon(Icons.download, size: 20),
                                        onPressed: () {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(content: Text('Statement download started')),
                                          );
                                        },
                                        tooltip: 'Download',
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/gateway_client.dart';
import '../../models/banking.dart';

class DirectDepositScreen extends StatefulWidget {
  const DirectDepositScreen({super.key});

  @override
  State<DirectDepositScreen> createState() => _DirectDepositScreenState();
}

class _DirectDepositScreenState extends State<DirectDepositScreen> {
  Map<String, dynamic>? _depositInfo;
  List<Account> _accounts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        GatewayClient.instance.getDirectDeposit(),
        GatewayClient.instance.getAccounts(),
      ]);
      if (mounted) {
        setState(() {
          _depositInfo = results[0] as Map<String, dynamic>;
          _accounts = results[1] as List<Account>;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _copyToClipboard(String label, String value) {
    Clipboard.setData(ClipboardData(text: value));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label copied to clipboard')),
    );
  }

  Future<void> _switchAccount(String accountId) async {
    try {
      await GatewayClient.instance.updateDirectDeposit(accountId: accountId);
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Direct deposit account updated')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update account')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Direct Deposit')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _depositInfo == null
              ? const Center(child: Text('Unable to load direct deposit info'))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Account selector
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Deposit Account',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey.shade600,
                              ),
                            ),
                            const SizedBox(height: 8),
                            DropdownButtonFormField<String>(
                              value: _depositInfo!['accountId'] as String?,
                              decoration: const InputDecoration(
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                              items: _accounts.map((acct) {
                                return DropdownMenuItem(
                                  value: acct.id,
                                  child: Text(
                                    '${acct.displayName} (${acct.accountNumberMasked})',
                                    style: const TextStyle(fontSize: 14),
                                  ),
                                );
                              }).toList(),
                              onChanged: (id) {
                                if (id != null) _switchAccount(id);
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Routing number
                    Card(
                      child: ListTile(
                        title: Text(
                          'Routing Number',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                        ),
                        subtitle: Text(
                          _depositInfo!['routingNumber'] as String? ?? '',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.5,
                          ),
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.copy, size: 20),
                          onPressed: () => _copyToClipboard(
                            'Routing number',
                            _depositInfo!['routingNumber'] as String? ?? '',
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Account number
                    Card(
                      child: ListTile(
                        title: Text(
                          'Account Number',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                        ),
                        subtitle: Text(
                          _depositInfo!['accountNumber'] as String? ?? '',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.5,
                          ),
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.copy, size: 20),
                          onPressed: () => _copyToClipboard(
                            'Account number',
                            _depositInfo!['accountNumber'] as String? ?? '',
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Status
                    Card(
                      child: ListTile(
                        leading: Icon(
                          _depositInfo!['status'] == 'active'
                              ? Icons.check_circle
                              : Icons.pending,
                          color: _depositInfo!['status'] == 'active'
                              ? Colors.green
                              : Colors.orange,
                        ),
                        title: const Text('Status', style: TextStyle(fontSize: 12)),
                        subtitle: Text(
                          (_depositInfo!['status'] as String? ?? 'unknown').toUpperCase(),
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: _depositInfo!['status'] == 'active'
                                ? Colors.green
                                : Colors.orange,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // QR code placeholder
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          children: [
                            Container(
                              width: 160,
                              height: 160,
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.grey.shade300),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Center(
                                child: Icon(
                                  Icons.qr_code_2,
                                  size: 100,
                                  color: theme.colorScheme.primary.withAlpha(80),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Scan to set up direct deposit',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade600,
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
}

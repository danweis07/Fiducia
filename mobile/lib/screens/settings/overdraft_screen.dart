import 'package:flutter/material.dart';
import '../../services/gateway_client.dart';
import '../../models/banking.dart';

class OverdraftScreen extends StatefulWidget {
  const OverdraftScreen({super.key});

  @override
  State<OverdraftScreen> createState() => _OverdraftScreenState();
}

class _OverdraftScreenState extends State<OverdraftScreen> {
  bool _isLoading = true;
  bool _isSaving = false;

  bool _enabled = false;
  String? _sourceAccountId;
  int _transferLimitCents = 50000;
  List<Account> _accounts = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        GatewayClient.instance.getOverdraftSettings(),
        GatewayClient.instance.getAccounts(),
      ]);
      final settings = results[0] as Map<String, dynamic>;
      final accounts = results[1] as List<Account>;
      if (mounted) {
        setState(() {
          _enabled = settings['enabled'] as bool? ?? false;
          _sourceAccountId = settings['sourceAccountId'] as String?;
          _transferLimitCents = settings['transferLimitCents'] as int? ?? 50000;
          _accounts = accounts;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      await GatewayClient.instance.updateOverdraftSettings(
        enabled: _enabled,
        sourceAccountId: _sourceAccountId,
        transferLimitCents: _transferLimitCents,
      );
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Overdraft settings saved')),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save settings')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Overdraft Protection')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Enable toggle
                Card(
                  child: SwitchListTile(
                    title: const Text('Overdraft Protection', style: TextStyle(fontSize: 14)),
                    subtitle: Text(
                      _enabled
                          ? 'Automatic transfers to cover overdrafts'
                          : 'Disabled',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                    ),
                    value: _enabled,
                    onChanged: (v) => setState(() => _enabled = v),
                  ),
                ),
                const SizedBox(height: 16),

                // Source account
                if (_enabled) ...[
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Source Account',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Funds will be transferred from this account',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            value: _sourceAccountId,
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
                            onChanged: (id) => setState(() => _sourceAccountId = id),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Transfer limit slider
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Transfer Limit',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              Text(
                                '\$${(_transferLimitCents / 100).toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Slider(
                            value: _transferLimitCents.toDouble(),
                            min: 10000,
                            max: 500000,
                            divisions: 49,
                            label: '\$${(_transferLimitCents / 100).toStringAsFixed(0)}',
                            onChanged: (v) => setState(() => _transferLimitCents = v.round()),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('\$100', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                              Text('\$5,000', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 24),

                // Save button
                FilledButton(
                  onPressed: _isSaving ? null : _save,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 48),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Save Settings'),
                ),
              ],
            ),
    );
  }
}

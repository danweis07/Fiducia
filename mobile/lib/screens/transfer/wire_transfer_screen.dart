import 'package:flutter/material.dart';
import '../../models/banking.dart';
import '../../services/gateway_client.dart';

/// Wire Transfer screen — form to send a domestic wire transfer.
class WireTransferScreen extends StatefulWidget {
  const WireTransferScreen({super.key});

  @override
  State<WireTransferScreen> createState() => _WireTransferScreenState();
}

class _WireTransferScreenState extends State<WireTransferScreen> {
  List<Account> _accounts = [];
  Map<String, dynamic> _fees = {};
  Map<String, dynamic> _limits = {};
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;
  bool _success = false;
  String? _wireId;

  String? _fromAccountId;
  final _recipientNameController = TextEditingController();
  final _accountNumberController = TextEditingController();
  final _routingNumberController = TextEditingController();
  final _amountController = TextEditingController();
  final _memoController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        GatewayClient.instance.getAccounts(),
        GatewayClient.instance.getWireFees(),
        GatewayClient.instance.getWireLimits(),
      ]);
      if (mounted) {
        setState(() {
          _accounts = results[0] as List<Account>;
          _fees = results[1] as Map<String, dynamic>;
          _limits = results[2] as Map<String, dynamic>;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatCurrency(int cents) {
    return '\$${(cents / 100).toStringAsFixed(2)}';
  }

  int get _domesticFeeCents => _fees['domesticFeeCents'] as int? ?? 0;
  int get _dailyLimitCents => _limits['dailyLimitCents'] as int? ?? 0;
  int get _perTransactionLimitCents => _limits['perTransactionLimitCents'] as int? ?? 0;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_fromAccountId == null) {
      setState(() => _error = 'Please select a source account');
      return;
    }

    final dollars = double.tryParse(
      _amountController.text.replaceAll(RegExp(r'[^0-9.]'), ''),
    );
    if (dollars == null || dollars <= 0) {
      setState(() => _error = 'Please enter a valid amount');
      return;
    }
    final amountCents = (dollars * 100).round();

    if (_perTransactionLimitCents > 0 && amountCents > _perTransactionLimitCents) {
      setState(() => _error = 'Amount exceeds per-transaction limit of ${_formatCurrency(_perTransactionLimitCents)}');
      return;
    }

    setState(() { _isSubmitting = true; _error = null; });
    try {
      final result = await GatewayClient.instance.createWireTransfer(
        fromAccountId: _fromAccountId!,
        recipientName: _recipientNameController.text,
        recipientAccountNumber: _accountNumberController.text,
        recipientRoutingNumber: _routingNumberController.text,
        amountCents: amountCents,
        memo: _memoController.text.isEmpty ? null : _memoController.text,
      );
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _success = true;
          _wireId = (result['wire'] as Map?)?['id'] as String?;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() { _isSubmitting = false; _error = e.toString(); });
      }
    }
  }

  void _reset() {
    setState(() {
      _success = false;
      _wireId = null;
      _fromAccountId = null;
      _recipientNameController.clear();
      _accountNumberController.clear();
      _routingNumberController.clear();
      _amountController.clear();
      _memoController.clear();
      _error = null;
    });
  }

  @override
  void dispose() {
    _recipientNameController.dispose();
    _accountNumberController.dispose();
    _routingNumberController.dispose();
    _amountController.dispose();
    _memoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Wire Transfer')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _success
              ? _buildSuccess()
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Fee info
                        Card(
                          color: Colors.blue.shade50,
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Icon(Icons.info_outline, color: Colors.blue.shade700),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Wire Transfer Fee: ${_formatCurrency(_domesticFeeCents)}',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                          color: Colors.blue.shade900,
                                        ),
                                      ),
                                      if (_dailyLimitCents > 0)
                                        Text(
                                          'Daily limit: ${_formatCurrency(_dailyLimitCents)}',
                                          style: TextStyle(fontSize: 12, color: Colors.blue.shade700),
                                        ),
                                      if (_perTransactionLimitCents > 0)
                                        Text(
                                          'Per-transaction limit: ${_formatCurrency(_perTransactionLimitCents)}',
                                          style: TextStyle(fontSize: 12, color: Colors.blue.shade700),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // From account
                        const Text('From Account', style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: _fromAccountId,
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                            hintText: 'Select account',
                          ),
                          items: _accounts
                              .map((a) => DropdownMenuItem(
                                    value: a.id,
                                    child: Text(
                                      '${a.displayName} (${_formatCurrency(a.availableBalanceCents)})',
                                    ),
                                  ))
                              .toList(),
                          onChanged: (v) => setState(() => _fromAccountId = v),
                          validator: (v) => v == null ? 'Required' : null,
                        ),
                        const SizedBox(height: 16),

                        // Recipient info
                        const Text('Recipient Information', style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _recipientNameController,
                          decoration: const InputDecoration(
                            labelText: 'Recipient Name',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _accountNumberController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Account Number',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _routingNumberController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Routing Number',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) {
                            if (v == null || v.isEmpty) return 'Required';
                            if (v.length != 9) return 'Must be 9 digits';
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        // Amount
                        const Text('Amount', style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _amountController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(
                            labelText: 'Amount (\$)',
                            prefixText: '\$ ',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) {
                            if (v == null || v.isEmpty) return 'Required';
                            final d = double.tryParse(v.replaceAll(RegExp(r'[^0-9.]'), ''));
                            if (d == null || d <= 0) return 'Enter a valid amount';
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _memoController,
                          decoration: const InputDecoration(
                            labelText: 'Memo (optional)',
                            border: OutlineInputBorder(),
                          ),
                        ),

                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                        ],

                        const SizedBox(height: 24),
                        FilledButton(
                          onPressed: _isSubmitting ? null : _submit,
                          child: _isSubmitting
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('Send Wire Transfer'),
                        ),
                        const SizedBox(height: 80),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildSuccess() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle, size: 64, color: Colors.green),
            const SizedBox(height: 16),
            const Text(
              'Wire Transfer Submitted',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Your wire transfer is being processed.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
            if (_wireId != null) ...[
              const SizedBox(height: 8),
              Text(
                'Reference: $_wireId',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              'Fee charged: ${_formatCurrency(_domesticFeeCents)}',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _reset,
              child: const Text('Send Another Wire'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../../services/gateway_client.dart';
import '../../models/banking.dart';

class StopPaymentsScreen extends StatefulWidget {
  const StopPaymentsScreen({super.key});

  @override
  State<StopPaymentsScreen> createState() => _StopPaymentsScreenState();
}

class _StopPaymentsScreenState extends State<StopPaymentsScreen> {
  List<Map<String, dynamic>> _stopPayments = [];
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
        GatewayClient.instance.getStopPayments(),
        GatewayClient.instance.getAccounts(),
      ]);
      if (mounted) {
        setState(() {
          _stopPayments = results[0] as List<Map<String, dynamic>>;
          _accounts = results[1] as List<Account>;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _cancelStopPayment(int index) async {
    final sp = _stopPayments[index];
    final id = sp['id'] as String;
    try {
      await GatewayClient.instance.cancelStopPayment(id);
      setState(() => _stopPayments.removeAt(index));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Stop payment cancelled')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to cancel stop payment')),
        );
      }
    }
  }

  void _showCreateDialog() {
    String? selectedAccountId = _accounts.isNotEmpty ? _accounts.first.id : null;
    final payeeController = TextEditingController();
    final amountController = TextEditingController();
    final checkNumberController = TextEditingController();
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('New Stop Payment'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: selectedAccountId,
                  decoration: const InputDecoration(labelText: 'Account'),
                  items: _accounts.map((acct) {
                    return DropdownMenuItem(
                      value: acct.id,
                      child: Text(
                        '${acct.displayName} (${acct.accountNumberMasked})',
                        style: const TextStyle(fontSize: 14),
                      ),
                    );
                  }).toList(),
                  onChanged: (id) => setDialogState(() => selectedAccountId = id),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: payeeController,
                  decoration: const InputDecoration(labelText: 'Payee Name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Amount (optional)',
                    prefixText: '\$ ',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: checkNumberController,
                  decoration: const InputDecoration(labelText: 'Check Number (optional)'),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reasonController,
                  decoration: const InputDecoration(labelText: 'Reason'),
                  maxLines: 2,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                final payee = payeeController.text.trim();
                if (payee.isEmpty || selectedAccountId == null) return;

                int? amountCents;
                final amountText = amountController.text.trim();
                if (amountText.isNotEmpty) {
                  final dollars = double.tryParse(amountText);
                  if (dollars != null) amountCents = (dollars * 100).round();
                }

                final checkNumber = checkNumberController.text.trim();
                final reason = reasonController.text.trim();

                Navigator.pop(ctx);
                try {
                  final result = await GatewayClient.instance.createStopPayment(
                    accountId: selectedAccountId!,
                    payeeName: payee,
                    amountCents: amountCents,
                    checkNumber: checkNumber.isNotEmpty ? checkNumber : null,
                    reason: reason.isNotEmpty ? reason : null,
                  );
                  setState(() => _stopPayments.add({
                    ...result,
                    'accountId': selectedAccountId,
                    'payeeName': payee,
                    if (amountCents != null) 'amountCents': amountCents,
                    if (checkNumber.isNotEmpty) 'checkNumber': checkNumber,
                    if (reason.isNotEmpty) 'reason': reason,
                  }));
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Stop payment created'
                          '${result['feeCents'] != null ? ' (fee: \$${(result['feeCents'] as int) / 100})' : ''}',
                        ),
                      ),
                    );
                  }
                } catch (_) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Failed to create stop payment')),
                    );
                  }
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Stop Payments')),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateDialog,
        child: const Icon(Icons.add),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _stopPayments.isEmpty
              ? const Center(child: Text('No stop payments'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _stopPayments.length,
                  itemBuilder: (context, index) {
                    final sp = _stopPayments[index];
                    final payee = sp['payeeName'] as String? ?? 'Unknown';
                    final status = sp['status'] as String? ?? 'active';
                    final amountCents = sp['amountCents'] as int?;
                    final checkNumber = sp['checkNumber'] as String?;
                    final reason = sp['reason'] as String?;

                    return Dismissible(
                      key: Key(sp['id'] as String? ?? index.toString()),
                      direction: DismissDirection.endToStart,
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        color: Colors.red,
                        child: const Icon(Icons.cancel, color: Colors.white),
                      ),
                      onDismissed: (_) => _cancelStopPayment(index),
                      child: Card(
                        child: ListTile(
                          leading: const Icon(Icons.block, size: 22, color: Colors.red),
                          title: Text(payee, style: const TextStyle(fontSize: 14)),
                          subtitle: Text(
                            [
                              if (amountCents != null) '\$${(amountCents / 100).toStringAsFixed(2)}',
                              if (checkNumber != null) 'Check #$checkNumber',
                              if (reason != null) reason,
                              status.toUpperCase(),
                            ].join(' \u00B7 '),
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.cancel_outlined, size: 20, color: Colors.red),
                            onPressed: () => _cancelStopPayment(index),
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

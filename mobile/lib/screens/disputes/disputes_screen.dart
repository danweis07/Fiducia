import 'package:flutter/material.dart';
import '../../models/dispute.dart';
import '../../services/gateway_client.dart';
import 'dispute_detail_screen.dart';

/// Disputes screen — list existing disputes and file new ones.
class DisputesScreen extends StatefulWidget {
  const DisputesScreen({super.key});

  @override
  State<DisputesScreen> createState() => _DisputesScreenState();
}

class _DisputesScreenState extends State<DisputesScreen> {
  List<Dispute> _disputes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDisputes();
  }

  Future<void> _loadDisputes() async {
    setState(() => _isLoading = true);
    try {
      final disputes = await GatewayClient.instance.getDisputes();
      if (mounted) setState(() { _disputes = disputes; _isLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatCurrency(int cents) {
    return '\$${(cents / 100).toStringAsFixed(2)}';
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${months[d.month - 1]} ${d.day}, ${d.year}';
    } catch (_) {
      return iso;
    }
  }

  String _reasonLabel(String reason) {
    switch (reason) {
      case 'unauthorized': return 'Unauthorized';
      case 'duplicate_charge': return 'Duplicate Charge';
      case 'wrong_amount': return 'Wrong Amount';
      case 'not_received': return 'Not Received';
      case 'other': return 'Other';
      default: return reason.replaceAll('_', ' ');
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'open': return Colors.blue;
      case 'investigating': return Colors.orange;
      case 'resolved': return Colors.green;
      case 'denied': return Colors.red;
      default: return Colors.grey;
    }
  }

  Future<void> _showCreateDialog() async {
    final transactionIdController = TextEditingController();
    final descriptionController = TextEditingController();
    final amountController = TextEditingController();
    String selectedReason = 'unauthorized';

    final reasons = [
      'unauthorized',
      'duplicate_charge',
      'wrong_amount',
      'not_received',
      'other',
    ];

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => Dialog.fullscreen(
          child: Scaffold(
            appBar: AppBar(
              title: const Text('File a Dispute'),
              leading: IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context, false),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Submit'),
                ),
              ],
            ),
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: transactionIdController,
                    decoration: const InputDecoration(
                      labelText: 'Transaction ID',
                      helperText: 'Enter the transaction ID to dispute',
                    ),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: selectedReason,
                    decoration: const InputDecoration(labelText: 'Reason'),
                    items: reasons
                        .map((r) => DropdownMenuItem(
                              value: r,
                              child: Text(_reasonLabel(r)),
                            ))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setDialogState(() => selectedReason = v);
                    },
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: descriptionController,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      helperText: 'Provide details about the dispute',
                      alignLabelWithHint: true,
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Dispute Amount (\$)',
                      prefixText: '\$ ',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    if (result == true &&
        transactionIdController.text.isNotEmpty &&
        amountController.text.isNotEmpty) {
      try {
        final dollars = double.tryParse(
          amountController.text.replaceAll(RegExp(r'[^0-9.]'), ''),
        );
        if (dollars == null || dollars <= 0) return;
        final dispute = await GatewayClient.instance.createDispute(
          transactionId: transactionIdController.text,
          reason: selectedReason,
          description: descriptionController.text.isEmpty
              ? null
              : descriptionController.text,
          amountCents: (dollars * 100).round(),
        );
        setState(() => _disputes.insert(0, dispute));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Dispute filed successfully')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to file dispute: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Disputes')),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateDialog,
        child: const Icon(Icons.add),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadDisputes,
              child: _disputes.isEmpty
                  ? ListView(
                      children: [
                        const SizedBox(height: 120),
                        Icon(Icons.gavel, size: 48, color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        Text(
                          'No disputes',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Tap + to file a new dispute.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 14, color: Colors.grey.shade400),
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _disputes.length,
                      itemBuilder: (context, index) {
                        final dispute = _disputes[index];
                        final statusColor = _statusColor(dispute.status);

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            title: Text(
                              _reasonLabel(dispute.reason),
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                Text(
                                  '${_formatCurrency(dispute.amountCents)} \u00B7 ${_formatDate(dispute.createdAt)}',
                                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                dispute.status[0].toUpperCase() + dispute.status.substring(1),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: statusColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => DisputeDetailScreen(disputeId: dispute.id),
                              ),
                            ).then((_) => _loadDisputes()),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

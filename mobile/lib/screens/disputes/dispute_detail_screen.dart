import 'package:flutter/material.dart';
import '../../models/dispute.dart';
import '../../services/gateway_client.dart';

/// Dispute detail screen — shows status timeline, transaction details,
/// reason, description, resolution, and assigned agent.
class DisputeDetailScreen extends StatefulWidget {
  final String disputeId;

  const DisputeDetailScreen({super.key, required this.disputeId});

  @override
  State<DisputeDetailScreen> createState() => _DisputeDetailScreenState();
}

class _DisputeDetailScreenState extends State<DisputeDetailScreen> {
  Dispute? _dispute;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() => _isLoading = true);
    try {
      final dispute = await GatewayClient.instance.getDisputeDetail(widget.disputeId);
      if (mounted) setState(() { _dispute = dispute; _isLoading = false; });
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dispute Details')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _dispute == null
              ? const Center(child: Text('Dispute not found'))
              : RefreshIndicator(
                  onRefresh: _loadDetail,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Status header
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
                                    _reasonLabel(_dispute!.reason),
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: _statusColor(_dispute!.status).withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      _dispute!.status[0].toUpperCase() + _dispute!.status.substring(1),
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: _statusColor(_dispute!.status),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _formatCurrency(_dispute!.amountCents),
                                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Status timeline
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Status Timeline',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 16),
                              _buildTimelineStep(
                                label: 'Created',
                                date: _formatDate(_dispute!.createdAt),
                                isComplete: true,
                                isFirst: true,
                              ),
                              _buildTimelineStep(
                                label: 'Investigating',
                                date: _dispute!.status == 'investigating' ||
                                        _dispute!.status == 'resolved' ||
                                        _dispute!.status == 'denied'
                                    ? 'In progress'
                                    : 'Pending',
                                isComplete: _dispute!.status == 'investigating' ||
                                    _dispute!.status == 'resolved' ||
                                    _dispute!.status == 'denied',
                                isFirst: false,
                              ),
                              _buildTimelineStep(
                                label: _dispute!.status == 'denied' ? 'Denied' : 'Resolved',
                                date: _dispute!.resolvedAt != null
                                    ? _formatDate(_dispute!.resolvedAt!)
                                    : 'Pending',
                                isComplete: _dispute!.status == 'resolved' ||
                                    _dispute!.status == 'denied',
                                isFirst: false,
                                isLast: true,
                                isDenied: _dispute!.status == 'denied',
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Transaction details
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Transaction Details',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 12),
                              _DetailRow('Transaction ID', _dispute!.transactionId),
                              const Divider(height: 20),
                              _DetailRow('Amount', _formatCurrency(_dispute!.amountCents)),
                              const Divider(height: 20),
                              _DetailRow('Reason', _reasonLabel(_dispute!.reason)),
                              if (_dispute!.description != null && _dispute!.description!.isNotEmpty) ...[
                                const Divider(height: 20),
                                _DetailRow('Description', _dispute!.description!),
                              ],
                              const Divider(height: 20),
                              _DetailRow('Filed', _formatDate(_dispute!.createdAt)),
                            ],
                          ),
                        ),
                      ),

                      // Resolution
                      if (_dispute!.resolution != null) ...[
                        const SizedBox(height: 16),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Resolution',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  _dispute!.resolution!,
                                  style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
                                ),
                                if (_dispute!.resolvedAt != null) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    'Resolved on ${_formatDate(_dispute!.resolvedAt!)}',
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],

                      // Assigned agent
                      if (_dispute!.assignedTo != null) ...[
                        const SizedBox(height: 16),
                        Card(
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: Colors.grey.shade200,
                              child: const Icon(Icons.person, color: Colors.grey),
                            ),
                            title: const Text('Assigned Agent'),
                            subtitle: Text(_dispute!.assignedTo!),
                          ),
                        ),
                      ],

                      const SizedBox(height: 80),
                    ],
                  ),
                ),
    );
  }

  Widget _buildTimelineStep({
    required String label,
    required String date,
    required bool isComplete,
    required bool isFirst,
    bool isLast = false,
    bool isDenied = false,
  }) {
    final color = isComplete
        ? (isDenied ? Colors.red : Colors.green)
        : Colors.grey.shade300;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            if (!isFirst)
              Container(width: 2, height: 16, color: isComplete ? color : Colors.grey.shade300),
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: isComplete ? color : Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: color, width: 2),
              ),
              child: isComplete
                  ? Icon(
                      isDenied ? Icons.close : Icons.check,
                      size: 14,
                      color: Colors.white,
                    )
                  : null,
            ),
            if (!isLast)
              Container(width: 2, height: 16, color: Colors.grey.shade300),
          ],
        ),
        const SizedBox(width: 12),
        Padding(
          padding: const EdgeInsets.only(top: isFirst ? 0 : 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
              Text(date, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            ],
          ),
        ),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
        const SizedBox(width: 16),
        Flexible(
          child: Text(
            value,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}

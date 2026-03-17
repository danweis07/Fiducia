import 'package:flutter/material.dart';
import '../../services/gateway_client.dart';

class SpendingAlertsScreen extends StatefulWidget {
  const SpendingAlertsScreen({super.key});

  @override
  State<SpendingAlertsScreen> createState() => _SpendingAlertsScreenState();
}

class _SpendingAlertsScreenState extends State<SpendingAlertsScreen> {
  List<Map<String, dynamic>> _alerts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAlerts();
  }

  Future<void> _loadAlerts() async {
    try {
      final alerts = await GatewayClient.instance.getSpendingAlerts();
      if (mounted) setState(() { _alerts = alerts; _isLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleAlert(int index, bool enabled) async {
    final alert = _alerts[index];
    final id = alert['id'] as String;
    try {
      await GatewayClient.instance.updateSpendingAlert(id, enabled: enabled);
      setState(() {
        _alerts[index] = {...alert, 'enabled': enabled};
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update alert')),
        );
      }
    }
  }

  Future<void> _deleteAlert(int index) async {
    final alert = _alerts[index];
    final id = alert['id'] as String;
    final name = alert['name'] as String;
    try {
      await GatewayClient.instance.deleteSpendingAlert(id);
      setState(() => _alerts.removeAt(index));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Deleted "$name"')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete alert')),
        );
      }
    }
  }

  void _showCreateDialog() {
    final nameController = TextEditingController();
    final thresholdController = TextEditingController();
    final categoryController = TextEditingController();
    final selectedChannels = <String>{'push', 'in_app'};

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('New Spending Alert'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: thresholdController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Threshold Amount',
                    prefixText: '\$ ',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: categoryController,
                  decoration: const InputDecoration(
                    labelText: 'Category (optional)',
                  ),
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Channels',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: ['push', 'in_app', 'email', 'sms'].map((ch) {
                    final labels = {
                      'push': 'Push',
                      'in_app': 'In-App',
                      'email': 'Email',
                      'sms': 'SMS',
                    };
                    return FilterChip(
                      label: Text(labels[ch]!),
                      selected: selectedChannels.contains(ch),
                      onSelected: (v) {
                        setDialogState(() {
                          if (v) {
                            selectedChannels.add(ch);
                          } else {
                            selectedChannels.remove(ch);
                          }
                        });
                      },
                    );
                  }).toList(),
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
                final name = nameController.text.trim();
                final thresholdText = thresholdController.text.trim();
                if (name.isEmpty || thresholdText.isEmpty) return;
                final dollars = double.tryParse(thresholdText);
                if (dollars == null) return;
                final thresholdCents = (dollars * 100).round();
                final category = categoryController.text.trim();
                Navigator.pop(ctx);
                try {
                  final result = await GatewayClient.instance.createSpendingAlert(
                    name: name,
                    thresholdCents: thresholdCents,
                    category: category.isNotEmpty ? category : null,
                    channels: selectedChannels.toList(),
                  );
                  setState(() => _alerts.add(result));
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Created alert "$name"')),
                    );
                  }
                } catch (_) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Failed to create alert')),
                    );
                  }
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Spending Alerts')),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateDialog,
        child: const Icon(Icons.add),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _alerts.isEmpty
              ? const Center(child: Text('No spending alerts configured'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _alerts.length,
                  itemBuilder: (context, index) {
                    final alert = _alerts[index];
                    final name = alert['name'] as String? ?? '';
                    final thresholdCents = alert['thresholdCents'] as int? ?? 0;
                    final category = alert['category'] as String?;
                    final enabled = alert['enabled'] as bool? ?? true;

                    return Dismissible(
                      key: Key(alert['id'] as String),
                      direction: DismissDirection.endToStart,
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        color: Colors.red,
                        child: const Icon(Icons.delete, color: Colors.white),
                      ),
                      onDismissed: (_) => _deleteAlert(index),
                      child: Card(
                        child: ListTile(
                          leading: const Icon(Icons.notifications_active_outlined, size: 22),
                          title: Text(name, style: const TextStyle(fontSize: 14)),
                          subtitle: Text(
                            '\$${(thresholdCents / 100).toStringAsFixed(2)}'
                            '${category != null ? ' \u00B7 $category' : ''}',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                          ),
                          trailing: Switch(
                            value: enabled,
                            onChanged: (v) => _toggleAlert(index, v),
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

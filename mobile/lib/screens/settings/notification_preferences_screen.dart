import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/notification_preferences_provider.dart';
import '../../models/notification_preferences.dart';

/// Full notification preferences screen with 8 categories and 4 channels.
/// Replaces the 4 inline toggles on the settings screen.
class NotificationPreferencesScreen extends ConsumerWidget {
  const NotificationPreferencesScreen({super.key});

  static const _channelLabels = {
    'email': 'Email',
    'sms': 'SMS',
    'push': 'Push',
    'in_app': 'In-App',
  };

  static const _channelIcons = {
    'email': Icons.email_outlined,
    'sms': Icons.sms_outlined,
    'push': Icons.notifications_outlined,
    'in_app': Icons.smartphone_outlined,
  };

  static const _categoryInfo = {
    'transactions': {'label': 'Transactions', 'icon': Icons.receipt, 'desc': 'Transaction notifications'},
    'transfers': {'label': 'Transfers', 'icon': Icons.swap_horiz, 'desc': 'Transfer confirmations and updates'},
    'security': {'label': 'Security', 'icon': Icons.shield, 'desc': 'Security alerts and login notifications'},
    'marketing': {'label': 'Marketing', 'icon': Icons.campaign, 'desc': 'Offers and promotions'},
    'account_alerts': {'label': 'Account Alerts', 'icon': Icons.warning_amber, 'desc': 'Account balance and status alerts'},
    'bill_reminders': {'label': 'Bill Reminders', 'icon': Icons.receipt_long, 'desc': 'Bill due date reminders'},
    'statements': {'label': 'Statements', 'icon': Icons.description, 'desc': 'Statement availability'},
    'loan_updates': {'label': 'Loan Updates', 'icon': Icons.account_balance, 'desc': 'Loan payment and status updates'},
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationPreferencesProvider);
    final notifier = ref.read(notificationPreferencesProvider.notifier);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification Preferences'),
        actions: [
          if (state.isSaving)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))),
            ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.preferences == null
              ? Center(child: Text(state.error ?? 'Failed to load preferences'))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Global Channel Toggles
                    Text('Channels', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
                    const SizedBox(height: 8),
                    Card(
                      child: Column(
                        children: _channelLabels.entries.map((entry) {
                          final isLast = entry.key == _channelLabels.keys.last;
                          return Column(
                            children: [
                              SwitchListTile(
                                secondary: Icon(_channelIcons[entry.key], size: 22),
                                title: Text(entry.value, style: const TextStyle(fontSize: 14)),
                                value: state.preferences!.channels[entry.key] ?? false,
                                onChanged: (v) => notifier.updateChannels({entry.key: v}),
                              ),
                              if (!isLast) const Divider(height: 1, indent: 56),
                            ],
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Category Preferences
                    Text('Categories', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
                    const SizedBox(height: 8),
                    ...state.preferences!.categories.entries.map((entry) {
                      final info = _categoryInfo[entry.key] ?? {'label': entry.key, 'icon': Icons.notifications, 'desc': ''};
                      return _CategoryCard(
                        categoryKey: entry.key,
                        label: info['label'] as String,
                        icon: info['icon'] as IconData,
                        description: info['desc'] as String,
                        category: entry.value,
                        globalChannels: state.preferences!.channels,
                        onToggleEnabled: (v) => notifier.updateCategory(entry.key, enabled: v),
                        onToggleChannel: (channels) => notifier.updateCategory(entry.key, channels: channels),
                      );
                    }),
                    const SizedBox(height: 24),

                    // Test Notification
                    OutlinedButton.icon(
                      onPressed: () => _showTestNotificationSheet(context, notifier),
                      icon: const Icon(Icons.send_outlined),
                      label: const Text('Send Test Notification'),
                      style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 48)),
                    ),
                    const SizedBox(height: 80),
                  ],
                ),
    );
  }

  void _showTestNotificationSheet(BuildContext context, NotificationPreferencesNotifier notifier) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(24, 24, 24, 8),
              child: Text('Send Test Notification', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            ..._channelLabels.entries.map((entry) => ListTile(
              leading: Icon(_channelIcons[entry.key]),
              title: Text(entry.value),
              onTap: () async {
                Navigator.pop(ctx);
                final result = await notifier.sendTestNotification(entry.key);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(result['message'] as String? ?? 'Test sent')),
                  );
                }
              },
            )),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _CategoryCard extends StatefulWidget {
  final String categoryKey;
  final String label;
  final IconData icon;
  final String description;
  final NotificationCategory category;
  final Map<String, bool> globalChannels;
  final ValueChanged<bool> onToggleEnabled;
  final ValueChanged<List<String>> onToggleChannel;

  const _CategoryCard({
    required this.categoryKey,
    required this.label,
    required this.icon,
    required this.description,
    required this.category,
    required this.globalChannels,
    required this.onToggleEnabled,
    required this.onToggleChannel,
  });

  @override
  State<_CategoryCard> createState() => _CategoryCardState();
}

class _CategoryCardState extends State<_CategoryCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(
        children: [
          ListTile(
            leading: Icon(widget.icon, size: 22),
            title: Text(widget.label, style: const TextStyle(fontSize: 14)),
            subtitle: Text(widget.description, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Switch(
                  value: widget.category.enabled,
                  onChanged: widget.onToggleEnabled,
                ),
                Icon(_expanded ? Icons.expand_less : Icons.expand_more, size: 20),
              ],
            ),
            onTap: () => setState(() => _expanded = !_expanded),
          ),
          if (_expanded && widget.category.enabled) ...[
            const Divider(height: 1, indent: 16, endIndent: 16),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Wrap(
                spacing: 8,
                children: ['email', 'sms', 'push', 'in_app'].map((ch) {
                  final globalEnabled = widget.globalChannels[ch] ?? false;
                  final categoryEnabled = widget.category.channels.contains(ch);
                  return FilterChip(
                    label: Text(NotificationPreferencesScreen._channelLabels[ch]!),
                    selected: categoryEnabled,
                    onSelected: globalEnabled
                        ? (v) {
                            final channels = List<String>.from(widget.category.channels);
                            if (v) {
                              channels.add(ch);
                            } else {
                              channels.remove(ch);
                            }
                            widget.onToggleChannel(channels);
                          }
                        : null,
                  );
                }).toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

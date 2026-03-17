import 'package:flutter/material.dart';
import '../../models/banking.dart';
import '../../services/gateway_client.dart';

/// Notifications screen — mirrors web Notifications.tsx
/// Shows all notifications with type filtering and mark-read actions.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<BankNotification> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    try {
      final notifs = await GatewayClient.instance.getNotifications();
      if (mounted) setState(() { _notifications = notifs; _isLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  int get _unreadCount => _notifications.where((n) => !n.isRead).length;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (_unreadCount > 0)
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Mark All Read'),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none, size: 48, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text('No notifications', style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final notif = _notifications[index];
                      return _NotificationCard(
                        notification: notif,
                        onMarkRead: () => _markRead(notif),
                      );
                    },
                  ),
                ),
    );
  }

  Future<void> _markRead(BankNotification notif) async {
    await GatewayClient.instance.markNotificationRead(notif.id);
    setState(() {
      final idx = _notifications.indexWhere((n) => n.id == notif.id);
      if (idx >= 0) {
        _notifications[idx] = BankNotification(
          id: notif.id,
          type: notif.type,
          title: notif.title,
          body: notif.body,
          isRead: true,
          actionUrl: notif.actionUrl,
          createdAt: notif.createdAt,
        );
      }
    });
  }

  Future<void> _markAllRead() async {
    await GatewayClient.instance.markAllNotificationsRead();
    setState(() {
      _notifications = _notifications.map((n) => BankNotification(
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: true,
        actionUrl: n.actionUrl,
        createdAt: n.createdAt,
      )).toList();
    });
  }
}

class _NotificationCard extends StatelessWidget {
  final BankNotification notification;
  final VoidCallback onMarkRead;

  const _NotificationCard({required this.notification, required this.onMarkRead});

  Color get _typeColor {
    switch (notification.type) {
      case 'transaction': return Colors.blue;
      case 'transfer': return Colors.green;
      case 'bill_due': return Colors.orange;
      case 'rdc_status': return Colors.purple;
      case 'card_alert': return Colors.red;
      case 'security': return Colors.red;
      case 'system': return Colors.grey;
      case 'promotional': return Colors.teal;
      default: return Colors.grey;
    }
  }

  IconData get _typeIcon {
    switch (notification.type) {
      case 'transaction': return Icons.receipt;
      case 'transfer': return Icons.swap_horiz;
      case 'bill_due': return Icons.receipt_long;
      case 'rdc_status': return Icons.camera_alt;
      case 'card_alert': return Icons.credit_card;
      case 'security': return Icons.shield;
      case 'system': return Icons.settings;
      case 'promotional': return Icons.campaign;
      default: return Icons.notifications;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: notification.isRead ? null : Colors.blue.shade50,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _typeColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(_typeIcon, size: 20, color: _typeColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: notification.isRead ? FontWeight.w500 : FontWeight.w700,
                          ),
                        ),
                      ),
                      if (!notification.isRead)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.blue,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(notification.body, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _typeColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          notification.type.replaceAll('_', ' '),
                          style: TextStyle(fontSize: 10, color: _typeColor, fontWeight: FontWeight.w500),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(_timeAgo(notification.createdAt), style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                      const Spacer(),
                      if (!notification.isRead)
                        GestureDetector(
                          onTap: onMarkRead,
                          child: Text('Mark read', style: TextStyle(fontSize: 11, color: Colors.blue.shade600)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _timeAgo(String iso) {
    try {
      final d = DateTime.parse(iso);
      final diff = DateTime.now().difference(d);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${(diff.inDays / 7).floor()}w ago';
    } catch (_) {
      return '';
    }
  }
}

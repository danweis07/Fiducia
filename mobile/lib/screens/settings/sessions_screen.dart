import 'package:flutter/material.dart';
import '../../services/gateway_client.dart';

class SessionsScreen extends StatefulWidget {
  const SessionsScreen({super.key});

  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen> {
  List<Map<String, dynamic>> _sessions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    try {
      final sessions = await GatewayClient.instance.getSessions();
      if (mounted) setState(() { _sessions = sessions; _isLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _revokeSession(int index) async {
    final session = _sessions[index];
    final id = session['id'] as String;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Revoke Session'),
        content: const Text('Are you sure you want to revoke this session? The device will be signed out.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Revoke'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await GatewayClient.instance.revokeSession(id);
      setState(() => _sessions.removeAt(index));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Session revoked')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to revoke session')),
        );
      }
    }
  }

  IconData _deviceIcon(String? device) {
    if (device == null) return Icons.devices;
    final d = device.toLowerCase();
    if (d.contains('iphone') || d.contains('android') || d.contains('mobile')) {
      return Icons.smartphone;
    }
    if (d.contains('ipad') || d.contains('tablet')) return Icons.tablet;
    return Icons.computer;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Active Sessions')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _sessions.isEmpty
              ? const Center(child: Text('No active sessions'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _sessions.length,
                  itemBuilder: (context, index) {
                    final session = _sessions[index];
                    final device = session['device'] as String? ?? 'Unknown device';
                    final browser = session['browser'] as String?;
                    final ip = session['ip'] as String?;
                    final location = session['location'] as String?;
                    final lastActive = session['lastActive'] as String?;
                    final isCurrent = session['isCurrent'] as bool? ?? false;

                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              _deviceIcon(device),
                              size: 28,
                              color: isCurrent
                                  ? theme.colorScheme.primary
                                  : Colors.grey.shade600,
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          device,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                      if (isCurrent)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: theme.colorScheme.primary.withAlpha(25),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            'Current',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w500,
                                              color: theme.colorScheme.primary,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                  if (browser != null) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      browser,
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                    ),
                                  ],
                                  if (location != null || ip != null) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      [if (location != null) location, if (ip != null) ip].join(' \u00B7 '),
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                    ),
                                  ],
                                  if (lastActive != null) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      'Last active: $lastActive',
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                                    ),
                                  ],
                                  if (!isCurrent) ...[
                                    const SizedBox(height: 8),
                                    SizedBox(
                                      height: 32,
                                      child: OutlinedButton(
                                        onPressed: () => _revokeSession(index),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: Colors.red,
                                          side: const BorderSide(color: Colors.red),
                                          padding: const EdgeInsets.symmetric(horizontal: 16),
                                        ),
                                        child: const Text('Revoke', style: TextStyle(fontSize: 12)),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

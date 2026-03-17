import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/gateway_client.dart';
import '../../services/biometric_service.dart';
import '../../models/banking.dart';
import '../../theme/design_tokens.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  BankingUser? _user;
  bool _isLoading = true;

  // Setting states
  bool _biometricEnabled = false;
  bool _biometricAvailable = false;
  bool _mfaEnabled = true;
  bool _darkMode = false;
  String _language = 'English';

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _checkBiometrics();
  }

  Future<void> _loadProfile() async {
    try {
      final user = await GatewayClient.instance.getProfile();
      setState(() {
        _user = user;
        _mfaEnabled = user.mfaEnabled;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _checkBiometrics() async {
    final available = await BiometricService.instance.isAvailable;
    final enabled = await BiometricService.instance.isEnabled;
    if (mounted) {
      setState(() {
        _biometricAvailable = available;
        _biometricEnabled = enabled;
      });
    }
  }

  Future<void> _toggleBiometric(bool value) async {
    if (value) {
      final success = await BiometricService.instance.authenticate(
        reason: 'Enable biometric login',
      );
      if (success) {
        await BiometricService.instance.enable('demo-refresh-token');
        if (mounted) setState(() => _biometricEnabled = true);
      }
    } else {
      await BiometricService.instance.disable();
      if (mounted) setState(() => _biometricEnabled = false);
    }
  }

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await Supabase.instance.client.auth.signOut();
      } catch (_) {
        // Demo mode or already signed out
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Signed out successfully')),
        );
      }
    }
  }

  void _showChangePasswordDialog() {
    final currentController = TextEditingController();
    final newController = TextEditingController();
    final confirmController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current Password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: newController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New Password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: confirmController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirm New Password'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Password updated successfully')),
              );
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  void _showLanguageSelector() {
    final languages = ['English', 'Spanish', 'French', 'Chinese', 'Vietnamese', 'Korean'];

    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(24, 24, 24, 8),
              child: Text('Select Language', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            ...languages.map((lang) => RadioListTile<String>(
              title: Text(lang),
              value: lang,
              groupValue: _language,
              onChanged: (v) {
                setState(() => _language = v!);
                Navigator.pop(ctx);
              },
            )),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Profile card
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 28,
                          backgroundColor: theme.colorScheme.primary.withAlpha(30),
                          child: Text(
                            _user?.initials ?? '?',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _user?.fullName ?? 'Member',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _user?.email ?? '',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              if (_user?.phone != null) ...[
                                const SizedBox(height: 2),
                                Text(
                                  _user!.phone!,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit, size: 20),
                          onPressed: () => context.push('/settings/personal-info'),
                        ),
                      ],
                    ),
                  ),
                ),

                // KYC Status
                if (_user != null) ...[
                  const SizedBox(height: 8),
                  Card(
                    child: ListTile(
                      leading: Icon(
                        _user!.kycStatus == 'approved'
                            ? Icons.verified_user
                            : Icons.pending,
                        color: _user!.kycStatus == 'approved'
                            ? DesignTokens.statusSuccess
                            : DesignTokens.statusWarning,
                      ),
                      title: const Text('Identity Verification', style: TextStyle(fontSize: 14)),
                      subtitle: Text(
                        _user!.kycStatus == 'approved'
                            ? 'Verified'
                            : 'Pending verification',
                        style: TextStyle(
                          fontSize: 12,
                          color: _user!.kycStatus == 'approved'
                              ? DesignTokens.statusSuccess
                              : DesignTokens.statusWarning,
                        ),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 16),

                // Account settings
                _SettingsSection(
                  title: 'Account',
                  items: [
                    _SettingsItem(
                      icon: Icons.person_outline,
                      label: 'Personal Information',
                      onTap: () => context.push('/settings/personal-info'),
                    ),
                    _SettingsItem(
                      icon: Icons.location_on_outlined,
                      label: 'Addresses',
                      onTap: () => context.push('/settings/addresses'),
                    ),
                    _SettingsItem(
                      icon: Icons.description_outlined,
                      label: 'Documents',
                      onTap: () => context.push('/settings/documents'),
                    ),
                    _SettingsItem(
                      icon: Icons.account_balance_outlined,
                      label: 'Direct Deposit',
                      onTap: () => context.push('/settings/direct-deposit'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Security
                _SettingsSection(
                  title: 'Security',
                  items: [
                    if (_biometricAvailable)
                      _SettingsItem(
                        icon: Icons.fingerprint,
                        label: 'Biometric Login',
                        subtitle: _biometricEnabled ? 'Enabled' : 'Disabled',
                        trailing: Switch(
                          value: _biometricEnabled,
                          onChanged: _toggleBiometric,
                        ),
                      ),
                    _SettingsItem(
                      icon: Icons.security,
                      label: 'Two-Factor Authentication',
                      subtitle: _mfaEnabled ? 'Enabled' : 'Disabled',
                      trailing: Switch(
                        value: _mfaEnabled,
                        onChanged: (v) => setState(() => _mfaEnabled = v),
                      ),
                    ),
                    _SettingsItem(
                      icon: Icons.lock_outline,
                      label: 'Change Password',
                      onTap: _showChangePasswordDialog,
                    ),
                    _SettingsItem(
                      icon: Icons.devices,
                      label: 'Active Sessions',
                      onTap: () => context.push('/settings/sessions'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Notifications
                _SettingsSection(
                  title: 'Notifications',
                  items: [
                    _SettingsItem(
                      icon: Icons.notifications_outlined,
                      label: 'Notification Preferences',
                      subtitle: 'Manage alerts, channels & categories',
                      onTap: () => context.push('/settings/notifications'),
                    ),
                    _SettingsItem(
                      icon: Icons.warning_amber_outlined,
                      label: 'Spending Alerts',
                      subtitle: 'Custom spending thresholds',
                      onTap: () => context.push('/settings/spending-alerts'),
                    ),
                    _SettingsItem(
                      icon: Icons.shield_outlined,
                      label: 'Overdraft Protection',
                      onTap: () => context.push('/settings/overdraft'),
                    ),
                    _SettingsItem(
                      icon: Icons.block_outlined,
                      label: 'Stop Payments',
                      onTap: () => context.push('/settings/stop-payments'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Preferences
                _SettingsSection(
                  title: 'Preferences',
                  items: [
                    _SettingsItem(
                      icon: Icons.dark_mode_outlined,
                      label: 'Dark Mode',
                      trailing: Switch(
                        value: _darkMode,
                        onChanged: (v) => setState(() => _darkMode = v),
                      ),
                    ),
                    _SettingsItem(
                      icon: Icons.language,
                      label: 'Language',
                      subtitle: _language,
                      onTap: _showLanguageSelector,
                    ),
                    _SettingsItem(
                      icon: Icons.text_fields,
                      label: 'Text Size',
                      subtitle: 'Medium',
                      onTap: () {},
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Legal & Support
                _SettingsSection(
                  title: 'Support',
                  items: [
                    _SettingsItem(
                      icon: Icons.help_outline,
                      label: 'Help Center',
                      onTap: () {},
                    ),
                    _SettingsItem(
                      icon: Icons.chat_outlined,
                      label: 'Contact Support',
                      onTap: () {},
                    ),
                    _SettingsItem(
                      icon: Icons.policy_outlined,
                      label: 'Privacy Policy',
                      onTap: () {},
                    ),
                    _SettingsItem(
                      icon: Icons.gavel_outlined,
                      label: 'Terms of Service',
                      onTap: () {},
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Sign out
                OutlinedButton.icon(
                  onPressed: _signOut,
                  icon: const Icon(Icons.logout, color: Colors.red),
                  label: const Text(
                    'Sign Out',
                    style: TextStyle(color: Colors.red),
                  ),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 48),
                    side: const BorderSide(color: Colors.red),
                  ),
                ),

                const SizedBox(height: 16),

                // App version & info
                Center(
                  child: Column(
                    children: [
                      Text(
                        'Digital Banking v1.0.0',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Member NCUA \u00B7 Equal Housing Lender',
                        style: TextStyle(fontSize: 10, color: Colors.grey.shade400),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 80),
              ],
            ),
    );
  }
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

class _SettingsSection extends StatelessWidget {
  final String title;
  final List<_SettingsItem> items;

  const _SettingsSection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: items.asMap().entries.map((entry) {
              final isLast = entry.key == items.length - 1;
              return Column(
                children: [
                  entry.value,
                  if (!isLast) const Divider(height: 1, indent: 56),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _SettingsItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _SettingsItem({
    required this.icon,
    required this.label,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, size: 22),
      title: Text(label, style: const TextStyle(fontSize: 14)),
      subtitle: subtitle != null
          ? Text(subtitle!, style: TextStyle(fontSize: 12, color: Colors.grey.shade500))
          : null,
      trailing: trailing ?? (onTap != null ? const Icon(Icons.chevron_right, size: 20) : null),
      onTap: onTap,
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/design_tokens.dart';
import '../atm_branch/atm_branch_screen.dart';
import '../bills/bill_pay_screen.dart';
import '../cards/cards_screen.dart';
import '../deposit/deposit_screen.dart';
import '../linked_accounts/linked_accounts_screen.dart';
import '../notifications/notifications_screen.dart';
import '../settings/settings_screen.dart';
import '../statements/statements_screen.dart';
import '../financial/financial_insights_screen.dart';
import '../offers/card_offers_screen.dart';
import '../calculators/calculators_screen.dart';
import '../learn/learn_screen.dart';
import '../chat/chat_screen.dart';
import '../savings/savings_goals_screen.dart';
import '../disputes/disputes_screen.dart';
import '../messaging/secure_messaging_screen.dart';

/// "More" tab — secondary features that don't need primary bottom nav space.
class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('More'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const NotificationsScreen()),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Money Management section
          Text(
            'Money Management',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            children: [
              _FeatureTile(
                icon: Icons.receipt_long,
                label: 'Bill\nPay',
                fgColor: DesignTokens.actionBillPay,
                bgColor: DesignTokens.actionBillPayBg,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const BillPayScreen()),
                ),
              ),
              _FeatureTile(
                icon: Icons.camera_alt,
                label: 'Deposit\nCheck',
                fgColor: DesignTokens.actionDeposit,
                bgColor: DesignTokens.actionDeposit.withAlpha(25),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const DepositScreen()),
                ),
              ),
              _FeatureTile(
                icon: Icons.send,
                label: 'Wire\nTransfer',
                fgColor: DesignTokens.actionBillPay,
                bgColor: DesignTokens.actionBillPayBg,
                onTap: () => context.push('/wire-transfer'),
              ),
              _FeatureTile(
                icon: Icons.credit_card,
                label: 'Card\nControls',
                fgColor: DesignTokens.actionCards,
                bgColor: DesignTokens.actionCardsBg,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CardsScreen()),
                ),
              ),
              _FeatureTile(
                icon: Icons.link,
                label: 'Linked\nAccounts',
                fgColor: DesignTokens.riskMedium,
                bgColor: DesignTokens.riskMediumLight,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LinkedAccountsScreen()),
                ),
              ),
              _FeatureTile(
                icon: Icons.savings,
                label: 'Savings\nGoals',
                fgColor: DesignTokens.statusSuccess,
                bgColor: DesignTokens.statusSuccess.withAlpha(25),
                onTap: () => context.push('/savings-goals'),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Services section
          Text(
            'Services',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            children: [
              _FeatureTile(
                icon: Icons.description,
                label: 'Statements',
                fgColor: DesignTokens.primary,
                bgColor: DesignTokens.primary.withAlpha(25),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const StatementsScreen()),
                ),
              ),
              _FeatureTile(
                icon: Icons.gavel,
                label: 'Disputes',
                fgColor: DesignTokens.riskHigh,
                bgColor: DesignTokens.riskHighLight,
                onTap: () => context.push('/disputes'),
              ),
              _FeatureTile(
                icon: Icons.mail,
                label: 'Messages',
                fgColor: DesignTokens.primary,
                bgColor: DesignTokens.primary.withAlpha(25),
                onTap: () => context.push('/messages'),
              ),
              _FeatureTile(
                icon: Icons.location_on,
                label: 'Find ATM\n& Branch',
                fgColor: DesignTokens.actionFindAtm,
                bgColor: DesignTokens.actionFindAtmBg,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AtmBranchScreen()),
                ),
              ),
              _FeatureTile(
                icon: Icons.card_giftcard,
                label: 'Card\nOffers',
                fgColor: DesignTokens.riskHigh,
                bgColor: DesignTokens.riskHighLight,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CardOffersScreen()),
                ),
              ),
              _FeatureTile(
                icon: Icons.smart_toy,
                label: 'AI Chat',
                fgColor: DesignTokens.primary,
                bgColor: DesignTokens.primary.withAlpha(25),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ChatScreen()),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Financial Tools section
          Text(
            'Financial Tools',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            children: [
              _FeatureTile(
                icon: Icons.insights,
                label: 'Financial\nInsights',
                fgColor: DesignTokens.riskMedium,
                bgColor: DesignTokens.riskMediumLight,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const FinancialInsightsScreen()),
                ),
              ),
              _FeatureTile(
                icon: Icons.calculate,
                label: 'Calculators',
                fgColor: DesignTokens.riskLow,
                bgColor: DesignTokens.riskLowLight,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CalculatorsScreen()),
                ),
              ),
              _FeatureTile(
                icon: Icons.school,
                label: 'Learn',
                fgColor: DesignTokens.primary,
                bgColor: DesignTokens.primary.withAlpha(25),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LearnScreen()),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Settings & account management
          const Text(
            'Account',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.notifications_outlined, size: 22),
                  title: const Text('Notifications', style: TextStyle(fontSize: 14)),
                  trailing: const Icon(Icons.chevron_right, size: 20),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                  ),
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(Icons.settings_outlined, size: 22),
                  title: const Text('Settings', style: TextStyle(fontSize: 14)),
                  trailing: const Icon(Icons.chevron_right, size: 20),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const SettingsScreen()),
                  ),
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(Icons.help_outline, size: 22),
                  title: const Text('Help & Support', style: TextStyle(fontSize: 14)),
                  trailing: const Icon(Icons.chevron_right, size: 20),
                  onTap: () {},
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: Icon(Icons.logout, size: 22, color: Colors.red.shade600),
                  title: Text(
                    'Sign Out',
                    style: TextStyle(fontSize: 14, color: Colors.red.shade600),
                  ),
                  onTap: () async {
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
                      await Supabase.instance.client.auth.signOut();
                    }
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // App version
          Center(
            child: Text(
              'Version 1.0.0',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
            ),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}

class _FeatureTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color fgColor;
  final Color bgColor;
  final VoidCallback onTap;

  const _FeatureTile({
    required this.icon,
    required this.label,
    required this.fgColor,
    required this.bgColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label.replaceAll('\n', ' '),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade200),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: bgColor,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 22, color: fgColor),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

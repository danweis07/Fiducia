import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/accounts/accounts_screen.dart';
import 'screens/transfer/transfer_screen.dart';
import 'screens/transfer/wire_transfer_screen.dart';
import 'screens/move_money/move_money_screen.dart';
import 'screens/chat/chat_screen.dart';
import 'screens/more/more_screen.dart';
import 'screens/bills/bill_pay_screen.dart';
import 'screens/cards/cards_screen.dart';
import 'screens/cards/travel_notice_screen.dart';
import 'screens/cards/card_provisioning_screen.dart';
import 'screens/deposit/deposit_screen.dart';
import 'screens/linked_accounts/linked_accounts_screen.dart';
import 'screens/notifications/notifications_screen.dart';
import 'screens/settings/settings_screen.dart';
import 'screens/settings/notification_preferences_screen.dart';
import 'screens/settings/spending_alerts_screen.dart';
import 'screens/settings/personal_info_screen.dart';
import 'screens/settings/addresses_screen.dart';
import 'screens/settings/documents_screen.dart';
import 'screens/settings/sessions_screen.dart';
import 'screens/settings/direct_deposit_screen.dart';
import 'screens/settings/overdraft_screen.dart';
import 'screens/settings/stop_payments_screen.dart';
import 'screens/savings/savings_goals_screen.dart';
import 'screens/disputes/disputes_screen.dart';
import 'screens/disputes/dispute_detail_screen.dart';
import 'screens/messaging/secure_messaging_screen.dart';
import 'screens/statements/statements_screen.dart';
import 'screens/atm_branch/atm_branch_screen.dart';
import 'screens/loans/loan_detail_screen.dart';
import 'screens/calculators/calculators_screen.dart';
import 'screens/learn/learn_screen.dart';
import 'screens/financial/financial_insights_screen.dart';
import 'screens/offers/card_offers_screen.dart';
import 'screens/activation/activation_screen.dart';
import 'screens/auth_screen.dart';
import 'services/gateway_client.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

/// Declarative router with deep link support.
/// Mirrors the web app route structure for URL consistency.
GoRouter buildRouter({required bool demoMode}) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    debugLogDiagnostics: false,
    redirect: (context, state) {
      if (demoMode) return null;

      final session = Supabase.instance.client.auth.currentSession;
      final isAuth = session != null;
      final loc = state.matchedLocation;

      // Public routes — no auth required
      if (loc == '/activate') return null;

      if (!isAuth && loc != '/auth') return '/auth';
      if (isAuth && loc == '/auth') return '/';
      return null;
    },
    routes: [
      // ── Auth ──────────────────────────────────────────────────────────────
      GoRoute(
        path: '/auth',
        builder: (context, state) => const AuthScreen(),
      ),

      // ── Digital Activation (public) ───────────────────────────────────────
      GoRoute(
        path: '/activate',
        builder: (context, state) => const ActivationScreen(),
      ),

      // ── Main app with bottom navigation ───────────────────────────────────
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) =>
            _BottomNavShell(child: child, location: state.matchedLocation),
        routes: [
          GoRoute(
            path: '/',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: DashboardScreen()),
          ),
          GoRoute(
            path: '/accounts',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: AccountsScreen()),
          ),
          GoRoute(
            path: '/move-money',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: MoveMoneyScreen()),
          ),
          GoRoute(
            path: '/more',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: MoreScreen()),
          ),
        ],
      ),

      // ── Full-screen routes (push on top of shell) ─────────────────────────
      GoRoute(
        path: '/chat',
        builder: (context, state) => const ChatScreen(),
      ),
      GoRoute(
        path: '/transfer',
        builder: (context, state) => const TransferScreen(),
      ),
      GoRoute(
        path: '/bills',
        builder: (context, state) => const BillPayScreen(),
      ),
      GoRoute(
        path: '/deposit',
        builder: (context, state) => const DepositScreen(),
      ),
      GoRoute(
        path: '/cards',
        builder: (context, state) => const CardsScreen(),
      ),
      GoRoute(
        path: '/linked-accounts',
        builder: (context, state) => const LinkedAccountsScreen(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/statements',
        builder: (context, state) => const StatementsScreen(),
      ),
      GoRoute(
        path: '/find-us',
        builder: (context, state) => const AtmBranchScreen(),
      ),
      GoRoute(
        path: '/calculators',
        builder: (context, state) => const CalculatorsScreen(),
      ),
      GoRoute(
        path: '/learn',
        builder: (context, state) => const LearnScreen(),
      ),
      GoRoute(
        path: '/financial-insights',
        builder: (context, state) => const FinancialInsightsScreen(),
      ),
      GoRoute(
        path: '/card-offers',
        builder: (context, state) => const CardOffersScreen(),
      ),
      GoRoute(
        path: '/loans/:id',
        builder: (context, state) => LoanDetailScreen(
          loanId: state.pathParameters['id']!,
        ),
      ),

      // ── Settings sub-routes ─────────────────────────────────────────────
      GoRoute(
        path: '/settings/notifications',
        builder: (context, state) => const NotificationPreferencesScreen(),
      ),
      GoRoute(
        path: '/settings/spending-alerts',
        builder: (context, state) => const SpendingAlertsScreen(),
      ),
      GoRoute(
        path: '/settings/personal-info',
        builder: (context, state) => const PersonalInfoScreen(),
      ),
      GoRoute(
        path: '/settings/addresses',
        builder: (context, state) => const AddressesScreen(),
      ),
      GoRoute(
        path: '/settings/documents',
        builder: (context, state) => const DocumentsScreen(),
      ),
      GoRoute(
        path: '/settings/sessions',
        builder: (context, state) => const SessionsScreen(),
      ),
      GoRoute(
        path: '/settings/direct-deposit',
        builder: (context, state) => const DirectDepositScreen(),
      ),
      GoRoute(
        path: '/settings/overdraft',
        builder: (context, state) => const OverdraftScreen(),
      ),
      GoRoute(
        path: '/settings/stop-payments',
        builder: (context, state) => const StopPaymentsScreen(),
      ),

      // ── Feature routes ──────────────────────────────────────────────────
      GoRoute(
        path: '/savings-goals',
        builder: (context, state) => const SavingsGoalsScreen(),
      ),
      GoRoute(
        path: '/disputes',
        builder: (context, state) => const DisputesScreen(),
      ),
      GoRoute(
        path: '/disputes/:id',
        builder: (context, state) => DisputeDetailScreen(
          disputeId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/wire-transfer',
        builder: (context, state) => const WireTransferScreen(),
      ),
      GoRoute(
        path: '/messages',
        builder: (context, state) => const SecureMessagingScreen(),
      ),

      // ── Card sub-routes ─────────────────────────────────────────────────
      GoRoute(
        path: '/cards/travel-notice',
        builder: (context, state) => const TravelNoticeScreen(),
      ),
      GoRoute(
        path: '/cards/provisioning/:cardId',
        builder: (context, state) => CardProvisioningScreen(
          cardId: state.pathParameters['cardId']!,
        ),
      ),
    ],
  );
}

/// Bottom navigation shell — replaces the old AppShell IndexedStack approach.
class _BottomNavShell extends StatelessWidget {
  final Widget child;
  final String location;

  const _BottomNavShell({required this.child, required this.location});

  int get _currentIndex {
    if (location.startsWith('/accounts')) return 1;
    if (location.startsWith('/move-money')) return 2;
    if (location.startsWith('/more')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          switch (index) {
            case 0:
              context.go('/');
            case 1:
              context.go('/accounts');
            case 2:
              context.go('/move-money');
            case 3:
              context.go('/more');
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Accounts',
          ),
          NavigationDestination(
            icon: Icon(Icons.payments_outlined),
            selectedIcon: Icon(Icons.payments),
            label: 'Move Money',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_outlined),
            selectedIcon: Icon(Icons.menu),
            label: 'More',
          ),
        ],
      ),
    );
  }
}

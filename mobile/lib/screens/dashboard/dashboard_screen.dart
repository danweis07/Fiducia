import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/gateway_client.dart';
import '../../models/banking.dart';
import '../../models/financial_data.dart';
import '../../utils/currency.dart';
import '../../widgets/cms_banner.dart';
import '../../widgets/error_view.dart';
import '../../theme/design_tokens.dart';
import '../accounts/account_detail_screen.dart';
import '../atm_branch/atm_branch_screen.dart';
import '../bills/bill_pay_screen.dart';
import '../cards/cards_screen.dart';
import '../deposit/deposit_screen.dart';
import '../loans/loan_detail_screen.dart';
import '../notifications/notifications_screen.dart';
import '../transfer/transfer_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<Account> _accounts = [];
  List<Loan> _loans = [];
  List<Transaction> _transactions = [];
  List<CMSContent> _cmsBanners = [];
  SpendingSummary? _spending;
  BankingUser? _user;
  bool _isLoading = true;
  String? _error;
  bool _balanceVisible = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        GatewayClient.instance.getAccounts(),
        GatewayClient.instance.getLoans(),
        GatewayClient.instance.getTransactions(limit: 5),
        GatewayClient.instance.getCMSContent(channel: 'mobile_app'),
        GatewayClient.instance.getSpendingSummary(),
        GatewayClient.instance.getProfile(),
      ]);
      setState(() {
        _accounts = results[0] as List<Account>;
        _loans = (results[1] as List<Loan>)
            .where((l) => l.status == 'active' || l.status == 'delinquent')
            .toList();
        _transactions = results[2] as List<Transaction>;
        _cmsBanners = results[3] as List<CMSContent>;
        _spending = results[4] as SpendingSummary;
        _user = results[5] as BankingUser;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  @override
  Widget build(BuildContext context) {
    final totalBalance = _accounts.fold<int>(0, (sum, a) => sum + a.balanceCents);
    final totalLoans = _loans.fold<int>(0, (sum, l) => sum + l.outstandingBalanceCents);

    // Next loan payment
    final nextPayment = _loans
        .where((l) => l.nextPaymentDueDate != null && l.nextPaymentAmountCents != null)
        .toList()
      ..sort((a, b) => a.nextPaymentDueDate!.compareTo(b.nextPaymentDueDate!));

    return Scaffold(
      appBar: AppBar(
        title: Text(_user != null ? 'Good ${_greeting()}' : 'Home'),
        actions: [
          IconButton(
            icon: Icon(_balanceVisible ? Icons.visibility_outlined : Icons.visibility_off_outlined),
            tooltip: _balanceVisible ? 'Hide balances' : 'Show balances',
            onPressed: () => setState(() => _balanceVisible = !_balanceVisible),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const NotificationsScreen()),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorView(
                  message: _error,
                  onRetry: _loadData,
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // CMS Banners
                      if (_cmsBanners.isNotEmpty) ...[
                        CMSBannerList(items: _cmsBanners),
                        const SizedBox(height: 8),
                      ],
                      // Welcome
                      Text(
                        _user != null
                            ? 'Welcome back, ${_user!.firstName}'
                            : 'Welcome back',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Here is your financial overview for today.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                      const SizedBox(height: 20),

                      // Balance cards
                      Row(
                        children: [
                          Expanded(
                            child: _BalanceCard(
                              label: 'Total Balance',
                              amount: _balanceVisible ? formatCurrency(totalBalance) : '\u2022\u2022\u2022\u2022\u2022\u2022',
                              subtitle: '${_accounts.length} account${_accounts.length != 1 ? 's' : ''}',
                              icon: Icons.account_balance_wallet,
                            ),
                          ),
                          if (_loans.isNotEmpty) ...[
                            const SizedBox(width: 12),
                            Expanded(
                              child: _BalanceCard(
                                label: 'Loan Balance',
                                amount: _balanceVisible ? formatCurrency(totalLoans) : '\u2022\u2022\u2022\u2022\u2022\u2022',
                                subtitle: '${_loans.length} loan${_loans.length != 1 ? 's' : ''}',
                                icon: Icons.money,
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Next loan payment alert
                      if (nextPayment.isNotEmpty) ...[
                        Card(
                          child: ListTile(
                            leading: Icon(
                              Icons.calendar_today,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                            title: Text(
                              'Next payment: ${formatCurrency(nextPayment.first.nextPaymentAmountCents!)}',
                              style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                            ),
                            subtitle: Text(
                              'Due ${nextPayment.first.nextPaymentDueDate}'
                              '${nextPayment.first.autopayAccountId != null ? ' · Autopay' : ''}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Quick actions
                      Wrap(
                        alignment: WrapAlignment.spaceAround,
                        spacing: 4,
                        runSpacing: 8,
                        children: [
                          _QuickAction(
                            icon: Icons.swap_horiz,
                            label: 'Transfer',
                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TransferScreen())),
                          ),
                          _QuickAction(icon: Icons.receipt_long, label: 'Pay Bills', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BillPayScreen()))),
                          _QuickAction(icon: Icons.camera_alt, label: 'Deposit', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DepositScreen()))),
                          _QuickAction(icon: Icons.credit_card, label: 'Cards', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CardsScreen()))),
                          _QuickAction(
                            icon: Icons.location_on,
                            label: 'Find ATM',
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const AtmBranchScreen()),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Accounts section
                      _SectionHeader(
                        title: 'Your Accounts',
                        onViewAll: () => context.go('/accounts'),
                      ),
                      const SizedBox(height: 8),
                      ..._accounts.map((account) => _AccountCard(account: account, balanceVisible: _balanceVisible)),

                      // Loans section
                      if (_loans.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        _SectionHeader(title: 'Your Loans', onViewAll: () => context.go('/accounts')),
                        const SizedBox(height: 8),
                        ..._loans.map((loan) => _LoanCard(loan: loan)),
                      ],

                      // Recent transactions
                      const SizedBox(height: 24),
                      _SectionHeader(title: 'Recent Transactions', onViewAll: () => context.go('/accounts')),
                      const SizedBox(height: 8),
                      Card(
                        child: Column(
                          children: _transactions.isEmpty
                              ? [
                                  const Padding(
                                    padding: EdgeInsets.all(24),
                                    child: Text('No recent transactions.'),
                                  ),
                                ]
                              : _transactions
                                  .map((tx) => _TransactionTile(transaction: tx))
                                  .toList(),
                        ),
                      ),

                      // Spending insights
                      if (_spending != null) ...[
                        const SizedBox(height: 24),
                        _SectionHeader(title: 'Spending Insights', onViewAll: () => context.push('/financial-insights')),
                        const SizedBox(height: 8),
                        _SpendingInsightsCard(spending: _spending!),
                      ],

                      const SizedBox(height: 80), // Bottom nav spacing
                    ],
                  ),
                ),
    );
  }
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

class _BalanceCard extends StatelessWidget {
  final String label;
  final String amount;
  final String subtitle;
  final IconData icon;

  const _BalanceCard({
    required this.label,
    required this.amount,
    required this.subtitle,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant)),
                Icon(icon, size: 18, color: theme.colorScheme.onSurfaceVariant),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              amount,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 2),
            Text(subtitle, style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 22, color: Theme.of(context).colorScheme.primary),
            ),
            const SizedBox(height: 6),
            Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback onViewAll;

  const _SectionHeader({required this.title, required this.onViewAll});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        TextButton(onPressed: onViewAll, child: const Text('View All')),
      ],
    );
  }
}

class _AccountCard extends StatelessWidget {
  final Account account;
  final bool balanceVisible;
  const _AccountCard({required this.account, this.balanceVisible = true});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.account_balance, size: 20),
        ),
        title: Text(account.displayName, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          '${account.type} \u00B7 ${account.accountNumberMasked}',
          style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              balanceVisible ? formatCurrency(account.balanceCents) : '\u2022\u2022\u2022\u2022\u2022\u2022',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            Text(
              balanceVisible ? 'Avail: ${formatCurrency(account.availableBalanceCents)}' : '',
              style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => AccountDetailScreen(account: account)),
        ),
      ),
    );
  }
}

class _LoanCard extends StatelessWidget {
  final Loan loan;
  const _LoanCard({required this.loan});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => LoanDetailScreen(loan: loan)),
      ),
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Loan', style: TextStyle(fontWeight: FontWeight.w600)),
                      Text(loan.loanNumberMasked, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                  Text(
                    formatCurrency(loan.outstandingBalanceCents),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: loan.progressPercent / 100,
                backgroundColor: Colors.grey.shade200,
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${loan.progressPercent}% paid', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  if (loan.nextPaymentDueDate != null && loan.nextPaymentAmountCents != null)
                    Text(
                      'Next: ${formatCurrency(loan.nextPaymentAmountCents!)}',
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final Transaction transaction;
  const _TransactionTile({required this.transaction});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: transaction.isCredit ? DesignTokens.creditBg : Colors.grey.shade100,
          shape: BoxShape.circle,
        ),
        child: Icon(
          transaction.isCredit ? Icons.arrow_downward : Icons.arrow_upward,
          size: 16,
          color: transaction.isCredit ? DesignTokens.credit : Colors.grey.shade600,
        ),
      ),
      title: Text(transaction.description, style: const TextStyle(fontSize: 14)),
      subtitle: Text(
        transaction.category,
        style: const TextStyle(fontSize: 11, color: Colors.grey),
      ),
      trailing: Text(
        '${transaction.isCredit ? '+' : ''}${formatCurrency(transaction.amountCents.abs())}',
        style: TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 14,
          color: transaction.isCredit ? DesignTokens.credit : null,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Spending Insights
// ---------------------------------------------------------------------------

class _SpendingInsightsCard extends StatelessWidget {
  final SpendingSummary spending;

  const _SpendingInsightsCard({required this.spending});

  static const _categoryColors = [
    Color(0xFF3B82F6), // blue
    Color(0xFFF59E0B), // amber
    Color(0xFF10B981), // green
    Color(0xFFEF4444), // red
    Color(0xFF8B5CF6), // purple
    Color(0xFFEC4899), // pink
  ];

  IconData _categoryIcon(String category) {
    switch (category) {
      case 'housing':
        return Icons.home;
      case 'food_dining':
        return Icons.restaurant;
      case 'groceries':
        return Icons.shopping_cart;
      case 'transportation':
        return Icons.directions_car;
      case 'shopping':
        return Icons.shopping_bag;
      case 'subscriptions':
        return Icons.subscriptions;
      case 'healthcare':
        return Icons.local_hospital;
      case 'entertainment':
        return Icons.movie;
      default:
        return Icons.receipt;
    }
  }

  String _formatCategory(String category) {
    return category
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final categories = spending.byCategory.take(5).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Summary row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Monthly Spending',
                      style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      formatCurrency(spending.totalSpendingCents),
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: spending.netCashFlowCents >= 0
                        ? DesignTokens.creditBg
                        : DesignTokens.debitBg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        spending.netCashFlowCents >= 0
                            ? Icons.trending_up
                            : Icons.trending_down,
                        size: 14,
                        color: spending.netCashFlowCents >= 0
                            ? DesignTokens.credit
                            : DesignTokens.debit,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        formatCurrency(spending.netCashFlowCents.abs()),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: spending.netCashFlowCents >= 0
                              ? DesignTokens.credit
                              : DesignTokens.debit,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Spending bar chart
            if (categories.isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: SizedBox(
                  height: 8,
                  child: Row(
                    children: categories.asMap().entries.map((entry) {
                      final pct = entry.value.percentOfTotal / 100;
                      return Expanded(
                        flex: (pct * 1000).round().clamp(1, 1000),
                        child: Container(
                          color: _categoryColors[entry.key % _categoryColors.length],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Category breakdown
              ...categories.asMap().entries.map((entry) {
                final cat = entry.value;
                final color = _categoryColors[entry.key % _categoryColors.length];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(_categoryIcon(cat.category), size: 16, color: Colors.grey.shade600),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _formatCategory(cat.category),
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                      Text(
                        formatCurrency(cat.totalCents),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 40,
                        child: Text(
                          '${cat.percentOfTotal.toStringAsFixed(0)}%',
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                          textAlign: TextAlign.right,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],

            // Average daily
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Avg. daily spending',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                Text(
                  formatCurrency(spending.avgDailySpendingCents),
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

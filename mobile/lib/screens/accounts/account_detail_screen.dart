import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/banking.dart';
import '../../services/gateway_client.dart';
import '../../utils/currency.dart';
import '../../widgets/error_view.dart';
import '../../theme/design_tokens.dart';

/// Account detail screen — mirrors web AccountDetail.tsx
/// Shows transactions, account info, fees, and statements for a specific account.
class AccountDetailScreen extends StatefulWidget {
  final Account account;

  const AccountDetailScreen({super.key, required this.account});

  @override
  State<AccountDetailScreen> createState() => _AccountDetailScreenState();
}

class _AccountDetailScreenState extends State<AccountDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Transaction> _transactions = [];
  List<AccountStatement> _statements = [];
  bool _isLoading = true;
  bool _statementsLoading = false;
  String? _error;
  String _filter = 'all'; // all | credit | debit
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadTransactions();
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.index == 3 && _statements.isEmpty && !_statementsLoading) {
      _loadStatements();
    }
  }

  Future<void> _loadTransactions() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final txns = await GatewayClient.instance.getTransactions(
        accountId: widget.account.id,
      );
      if (mounted) setState(() { _transactions = txns; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _isLoading = false; _error = e.toString(); });
    }
  }

  Future<void> _loadStatements() async {
    setState(() => _statementsLoading = true);
    try {
      final stmts = await GatewayClient.instance.getStatements(widget.account.id);
      if (mounted) setState(() { _statements = stmts; _statementsLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _statementsLoading = false);
    }
  }

  List<Transaction> get _filteredTransactions {
    var txns = _transactions;
    if (_filter == 'credit') txns = txns.where((t) => t.isCredit).toList();
    if (_filter == 'debit') txns = txns.where((t) => !t.isCredit).toList();
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      txns = txns.where((t) =>
          t.description.toLowerCase().contains(query) ||
          t.category.toLowerCase().contains(query) ||
          (t.merchantName?.toLowerCase().contains(query) ?? false)
      ).toList();
    }
    return txns;
  }

  @override
  Widget build(BuildContext context) {
    final acct = widget.account;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(acct.displayName),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(text: 'Transactions'),
            Tab(text: 'Details'),
            Tab(text: 'Fees'),
            Tab(text: 'Statements'),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: _handleAccountAction,
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'statements', child: Text('View Statements')),
              const PopupMenuItem(value: 'details', child: Text('Account Details')),
              const PopupMenuItem(value: 'export', child: Text('Export Transactions')),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'close',
                child: Text('Close Account', style: TextStyle(color: Colors.red)),
              ),
            ],
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTransactionsTab(theme),
          _buildDetailsTab(theme, acct),
          _buildFeesTab(theme),
          _buildStatementsTab(theme),
        ],
      ),
    );
  }

  void _handleAccountAction(String action) {
    switch (action) {
      case 'statements':
        _tabController.animateTo(3);
        break;
      case 'details':
        _tabController.animateTo(1);
        break;
      case 'export':
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transaction export will be emailed to you.')),
        );
        break;
      case 'close':
        _showCloseAccountDialog();
        break;
    }
  }

  Future<void> _showCloseAccountDialog() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Close Account'),
        content: Text(
          'Are you sure you want to close ${widget.account.displayName}? '
          'This action cannot be undone. Any remaining balance will need to be '
          'transferred first.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Close Account'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Account closure request submitted. You will be contacted.')),
      );
    }
  }

  Widget _buildTransactionsTab(ThemeData theme) {
    return Column(
      children: [
        // Search + filter
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search transactions...',
              prefixIcon: const Icon(Icons.search, size: 20),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () => setState(() => _searchQuery = ''),
                    )
                  : null,
            ),
            onChanged: (v) => setState(() => _searchQuery = v),
          ),
        ),
        // Filter chips
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: [
              _FilterChip(label: 'All', selected: _filter == 'all', onTap: () => setState(() => _filter = 'all')),
              const SizedBox(width: 8),
              _FilterChip(label: 'Credits', selected: _filter == 'credit', onTap: () => setState(() => _filter = 'credit')),
              const SizedBox(width: 8),
              _FilterChip(label: 'Debits', selected: _filter == 'debit', onTap: () => setState(() => _filter = 'debit')),
              const Spacer(),
              Text(
                '${_filteredTransactions.length} results',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? ErrorView(message: _error, onRetry: _loadTransactions)
                  : _filteredTransactions.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.receipt_long, size: 40, color: Colors.grey.shade300),
                              const SizedBox(height: 12),
                              Text(
                                _searchQuery.isNotEmpty
                                    ? 'No transactions match "$_searchQuery"'
                                    : 'No transactions found',
                                style: TextStyle(color: Colors.grey.shade500),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _loadTransactions,
                          child: ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _filteredTransactions.length,
                            separatorBuilder: (_, __) => const Divider(height: 1),
                            itemBuilder: (context, index) {
                              final txn = _filteredTransactions[index];
                              return _TransactionTile(transaction: txn);
                            },
                          ),
                        ),
        ),
      ],
    );
  }

  Widget _buildDetailsTab(ThemeData theme, Account acct) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Quick actions row (Chase/BofA pattern)
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _AccountQuickAction(
              icon: Icons.swap_horiz,
              label: 'Transfer',
              onTap: () => context.push('/transfer'),
            ),
            _AccountQuickAction(
              icon: Icons.receipt_long,
              label: 'Pay Bill',
              onTap: () => context.push('/bills'),
            ),
            _AccountQuickAction(
              icon: Icons.camera_alt,
              label: 'Deposit',
              onTap: () => context.push('/deposit'),
            ),
            _AccountQuickAction(
              icon: Icons.description,
              label: 'Statements',
              onTap: () => _tabController.animateTo(3),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Balance card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Balance', style: theme.textTheme.titleSmall?.copyWith(color: Colors.grey)),
                const SizedBox(height: 4),
                Text(formatCurrency(acct.balanceCents), style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Available', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
                    Text(formatCurrency(acct.availableBalanceCents), style: theme.textTheme.bodyMedium),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        // Account info
        Card(
          child: Column(
            children: [
              _DetailRow('Account Type', acct.type[0].toUpperCase() + acct.type.substring(1)),
              const Divider(height: 1, indent: 16, endIndent: 16),
              _DetailRow('Account Number', acct.accountNumberMasked),
              const Divider(height: 1, indent: 16, endIndent: 16),
              _DetailRow('Routing Number', acct.routingNumber),
              const Divider(height: 1, indent: 16, endIndent: 16),
              _DetailRow('Interest Rate', formatInterestRate(acct.interestRateBps)),
              const Divider(height: 1, indent: 16, endIndent: 16),
              _DetailRow('Status', acct.status[0].toUpperCase() + acct.status.substring(1)),
              const Divider(height: 1, indent: 16, endIndent: 16),
              _DetailRow('Opened', _formatDate(acct.openedAt)),
            ],
          ),
        ),
        if (acct.type == 'cd') ...[
          const SizedBox(height: 16),
          Card(
            color: Colors.blue.shade50,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, size: 18, color: Colors.blue.shade700),
                      const SizedBox(width: 8),
                      Text('CD Information', style: theme.textTheme.titleSmall?.copyWith(color: Colors.blue.shade700)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('APY: ${formatInterestRate(acct.interestRateBps)}', style: theme.textTheme.bodyMedium),
                  const SizedBox(height: 4),
                  Text('Early withdrawal penalties may apply.', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildFeesTab(ThemeData theme) {
    // Demo fee schedule matching web
    final fees = [
      {'name': 'Monthly Maintenance', 'amount': 1000, 'waivable': true, 'condition': 'Balance above \$1,500'},
      {'name': 'Overdraft Fee', 'amount': 3500, 'waivable': true, 'condition': 'Max 3 per day'},
      {'name': 'NSF Fee', 'amount': 3000, 'waivable': false, 'condition': 'Per occurrence'},
      {'name': 'Wire Transfer (Outgoing)', 'amount': 2500, 'waivable': false, 'condition': 'Per transfer'},
      {'name': 'Paper Statement', 'amount': 300, 'waivable': true, 'condition': 'Switch to eStatements'},
    ];

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: fees.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final fee = fees[index];
        return ListTile(
          title: Text(fee['name'] as String, style: const TextStyle(fontSize: 14)),
          subtitle: Text(
            fee['condition'] as String,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(formatCurrency(fee['amount'] as int), style: const TextStyle(fontWeight: FontWeight.w600)),
              if (fee['waivable'] as bool)
                Text('Waivable', style: TextStyle(fontSize: 11, color: Colors.green.shade600)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatementsTab(ThemeData theme) {
    if (_statementsLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_statements.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.description_outlined, size: 48, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No statements available', style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _statements.length,
      itemBuilder: (context, index) {
        final stmt = _statements[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.description, size: 20, color: theme.colorScheme.primary),
            ),
            title: Text(stmt.periodLabel, style: const TextStyle(fontWeight: FontWeight.w500)),
            subtitle: Text(
              '${stmt.transactionCount} transactions \u00B7 Closing: ${formatCurrency(stmt.closingBalanceCents)}',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
            ),
            trailing: IconButton(
              icon: const Icon(Icons.download, size: 20),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Downloading ${stmt.periodLabel} statement...')),
                );
              },
            ),
          ),
        );
      },
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.month}/${d.day}/${d.year}';
    } catch (_) {
      return iso;
    }
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? Theme.of(context).primaryColor : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: selected ? Colors.white : Colors.grey.shade700,
          ),
        ),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final Transaction transaction;

  const _TransactionTile({required this.transaction});

  IconData get _categoryIcon {
    switch (transaction.category) {
      case 'groceries': return Icons.shopping_cart;
      case 'dining': return Icons.restaurant;
      case 'entertainment': return Icons.movie;
      case 'housing': return Icons.home;
      case 'transportation': return Icons.directions_car;
      case 'shopping': return Icons.shopping_bag;
      case 'healthcare': return Icons.local_hospital;
      case 'utilities': return Icons.bolt;
      case 'income': return Icons.account_balance;
      case 'transfer': return Icons.swap_horiz;
      default: return Icons.receipt;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isCredit = transaction.isCredit;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: (isCredit ? Colors.green : Colors.grey).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(_categoryIcon, size: 20, color: isCredit ? Colors.green.shade700 : Colors.grey.shade600),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(transaction.description, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      transaction.status == 'pending' ? 'Pending' : _formatDate(transaction.postedAt ?? transaction.createdAt),
                      style: TextStyle(fontSize: 12, color: transaction.status == 'pending' ? Colors.orange : Colors.grey.shade500),
                    ),
                    if (transaction.merchantName != null) ...[
                      Text(' \u00B7 ', style: TextStyle(color: Colors.grey.shade400)),
                      Text(transaction.merchantName!, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    ],
                  ],
                ),
              ],
            ),
          ),
          Text(
            formatCurrency(transaction.amountCents),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isCredit ? Colors.green.shade700 : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${months[d.month - 1]} ${d.day}';
    } catch (_) {
      return '';
    }
  }
}

class _AccountQuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _AccountQuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 20, color: theme.colorScheme.primary),
            ),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}

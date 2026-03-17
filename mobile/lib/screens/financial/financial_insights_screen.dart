import 'package:flutter/material.dart';
import '../../models/financial_data.dart';
import '../../services/gateway_client.dart';
import '../../utils/currency.dart';

/// Financial Insights screen — displays spending, budgets, recurring
/// transactions, and net worth in a single scrollable view.
class FinancialInsightsScreen extends StatefulWidget {
  const FinancialInsightsScreen({super.key});

  @override
  State<FinancialInsightsScreen> createState() =>
      _FinancialInsightsScreenState();
}

class _FinancialInsightsScreenState extends State<FinancialInsightsScreen> {
  SpendingSummary? _spending;
  BudgetSummary? _budgets;
  RecurringSummary? _recurring;
  NetWorthSnapshot? _netWorth;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        GatewayClient.instance.getSpendingSummary(),
        GatewayClient.instance.getBudgets(),
        GatewayClient.instance.getRecurringTransactions(),
        GatewayClient.instance.getNetWorth(),
      ]);
      if (mounted) {
        setState(() {
          _spending = results[0] as SpendingSummary;
          _budgets = results[1] as BudgetSummary;
          _recurring = results[2] as RecurringSummary;
          _netWorth = results[3] as NetWorthSnapshot;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Financial Insights')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_spending != null) ...[
                      _buildSummaryCards(_spending!),
                      const SizedBox(height: 24),
                      _buildSectionHeader('Spending by Category'),
                      const SizedBox(height: 8),
                      _buildSpendingByCategory(_spending!.byCategory),
                    ],
                    if (_budgets != null) ...[
                      const SizedBox(height: 24),
                      _buildSectionHeader('Budgets'),
                      const SizedBox(height: 8),
                      _buildBudgets(_budgets!),
                    ],
                    if (_recurring != null) ...[
                      const SizedBox(height: 24),
                      _buildSectionHeader('Recurring Subscriptions'),
                      const SizedBox(height: 8),
                      _buildRecurring(_recurring!),
                    ],
                    if (_netWorth != null) ...[
                      const SizedBox(height: 24),
                      _buildSectionHeader('Net Worth'),
                      const SizedBox(height: 8),
                      _buildNetWorth(_netWorth!),
                    ],
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  // ---------------------------------------------------------------------------
  // Summary Cards Row
  // ---------------------------------------------------------------------------

  Widget _buildSummaryCards(SpendingSummary spending) {
    return Row(
      children: [
        Expanded(
          child: _SummaryCard(
            label: 'Total Spending',
            value: formatCurrency(spending.totalSpendingCents),
            color: Colors.red.shade400,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _SummaryCard(
            label: 'Income',
            value: formatCurrency(spending.totalIncomeCents),
            color: Colors.green.shade400,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _SummaryCard(
            label: 'Net Cash Flow',
            value: formatCurrency(spending.netCashFlowCents),
            color: spending.netCashFlowCents >= 0
                ? Colors.green.shade400
                : Colors.red.shade400,
          ),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Spending by Category
  // ---------------------------------------------------------------------------

  Widget _buildSpendingByCategory(List<SpendingByCategory> categories) {
    return Card(
      child: Column(
        children: [
          for (int i = 0; i < categories.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 16, endIndent: 16),
            _buildCategoryTile(categories[i]),
          ],
        ],
      ),
    );
  }

  Widget _buildCategoryTile(SpendingByCategory cat) {
    final trendIcon = switch (cat.trend) {
      'up' => Icons.arrow_upward,
      'down' => Icons.arrow_downward,
      _ => Icons.remove,
    };
    final trendColor = switch (cat.trend) {
      'up' => Colors.red,
      'down' => Colors.green,
      _ => Colors.grey,
    };

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  cat.category,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ),
              Icon(trendIcon, size: 16, color: trendColor),
              const SizedBox(width: 8),
              Text(
                formatCurrency(cat.totalCents),
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: (cat.percentOfTotal / 100).clamp(0.0, 1.0),
            borderRadius: BorderRadius.circular(4),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Budgets
  // ---------------------------------------------------------------------------

  Widget _buildBudgets(BudgetSummary summary) {
    return Column(
      children: summary.budgets.map(_buildBudgetCard).toList(),
    );
  }

  Widget _buildBudgetCard(Budget budget) {
    final ratio = budget.percentUsed / 100;
    final Color progressColor;
    if (ratio > 1.0) {
      progressColor = Colors.red;
    } else if (ratio >= 0.8) {
      progressColor = Colors.orange;
    } else {
      progressColor = Colors.green;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  budget.category,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                if (budget.isOverBudget)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'Over Budget!',
                      style: TextStyle(
                        color: Colors.red.shade700,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${formatCurrency(budget.spentCents)} of ${formatCurrency(budget.limitCents)}',
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: ratio.clamp(0.0, 1.0),
              color: progressColor,
              backgroundColor: progressColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(4),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Recurring Subscriptions
  // ---------------------------------------------------------------------------

  Widget _buildRecurring(RecurringSummary summary) {
    return Card(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total Monthly Cost',
                  style: TextStyle(fontWeight: FontWeight.w500),
                ),
                Text(
                  formatCurrency(summary.totalMonthlyCents),
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          for (int i = 0; i < summary.recurring.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 16, endIndent: 16),
            _buildRecurringTile(summary.recurring[i]),
          ],
        ],
      ),
    );
  }

  Widget _buildRecurringTile(RecurringTransaction tx) {
    return ListTile(
      title: Text(tx.merchantName),
      subtitle: Text('Next: ${tx.nextExpectedDate}'),
      trailing: Text(
        '${formatCurrency(tx.averageAmountCents)}/${tx.frequency}',
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Net Worth
  // ---------------------------------------------------------------------------

  Widget _buildNetWorth(NetWorthSnapshot snapshot) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total Assets'),
                Text(
                  formatCurrency(snapshot.totalAssetsCents),
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Liabilities'),
                Text(
                  formatCurrency(snapshot.totalLiabilitiesCents),
                  style: TextStyle(
                    fontWeight: FontWeight.w500,
                    color: Colors.red.shade400,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Net Worth',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
                Text(
                  formatCurrency(snapshot.netWorthCents),
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: snapshot.netWorthCents >= 0
                        ? Colors.green.shade600
                        : Colors.red.shade600,
                  ),
                ),
              ],
            ),
            if (snapshot.accounts.isNotEmpty) ...[
              const Divider(height: 24),
              for (final account in snapshot.accounts)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          account.name,
                          style: TextStyle(
                            color: Colors.grey.shade700,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      Text(
                        formatCurrency(account.balanceCents),
                        style: const TextStyle(fontSize: 13),
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
    );
  }
}

// =============================================================================
// Summary Card Widget
// =============================================================================

class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _SummaryCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

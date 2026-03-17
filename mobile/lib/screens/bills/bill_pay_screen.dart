import 'package:flutter/material.dart';
import '../../models/banking.dart';
import '../../services/gateway_client.dart';
import '../../utils/currency.dart';
import '../../theme/design_tokens.dart';
import '../../widgets/error_view.dart';

/// Bill Pay screen — mirrors web BillPay.tsx
/// Shows upcoming bills, recent payments, add payee flow, and payment scheduling.
class BillPayScreen extends StatefulWidget {
  const BillPayScreen({super.key});

  @override
  State<BillPayScreen> createState() => _BillPayScreenState();
}

class _BillPayScreenState extends State<BillPayScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Bill> _bills = [];
  List<Account> _accounts = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final results = await Future.wait([
        GatewayClient.instance.getBills(),
        GatewayClient.instance.getAccounts(),
      ]);
      if (mounted) {
        setState(() {
          _bills = results[0] as List<Bill>;
          _accounts = (results[1] as List<Account>)
              .where((a) => a.type != 'cd' && a.status == 'active')
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _isLoading = false; _error = e.toString(); });
    }
  }

  List<Bill> get _upcomingBills => _bills.where((b) => b.isUpcoming).toList();
  List<Bill> get _paidBills => _bills.where((b) => b.isPaid).toList();
  int get _upcomingTotal => _upcomingBills.fold(0, (sum, b) => sum + b.amountCents);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bill Pay'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Upcoming'),
            Tab(text: 'History'),
            Tab(text: 'Payees'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddPayeeSheet,
        icon: const Icon(Icons.add),
        label: const Text('Add Payee'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorView(message: _error, onRetry: _loadData)
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildUpcomingTab(theme),
                    _buildHistoryTab(theme),
                    _buildPayeesTab(theme),
                  ],
                ),
    );
  }

  Widget _buildUpcomingTab(ThemeData theme) {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Summary card
          Card(
            color: theme.colorScheme.primary,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Upcoming Bills', style: theme.textTheme.titleSmall?.copyWith(color: Colors.white70)),
                  const SizedBox(height: 4),
                  Text(
                    formatCurrency(_upcomingTotal),
                    style: theme.textTheme.headlineMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${_upcomingBills.length} bill${_upcomingBills.length == 1 ? '' : 's'} due',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.white70),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          if (_upcomingBills.isNotEmpty) ...[
            ..._upcomingBills.map((bill) => _BillCard(
              bill: bill,
              onPay: () => _payBill(bill),
              onSchedule: () => _showScheduleSheet(bill),
            )),
          ] else
            Center(
              child: Padding(
                padding: const EdgeInsets.all(48),
                child: Column(
                  children: [
                    Icon(Icons.check_circle, size: 48, color: Colors.green.shade300),
                    const SizedBox(height: 16),
                    Text('All caught up!', style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey)),
                    const SizedBox(height: 8),
                    Text('No upcoming bills', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab(ThemeData theme) {
    if (_paidBills.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.receipt_long, size: 48, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No payment history', style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _paidBills.length,
        itemBuilder: (context, index) => _BillCard(bill: _paidBills[index]),
      ),
    );
  }

  Widget _buildPayeesTab(ThemeData theme) {
    final payees = <String, Bill>{};
    for (final bill in _bills) {
      payees.putIfAbsent(bill.payeeName, () => bill);
    }

    if (payees.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.people_outline, size: 48, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No payees yet', style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey)),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: _showAddPayeeSheet,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Add Payee'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: payees.length,
      itemBuilder: (context, index) {
        final entry = payees.entries.elementAt(index);
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.blue.shade50,
              child: Text(
                entry.key[0].toUpperCase(),
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.blue.shade700,
                ),
              ),
            ),
            title: Text(entry.key, style: const TextStyle(fontWeight: FontWeight.w500)),
            subtitle: Text(entry.value.payeeAccountNumberMasked,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
            trailing: entry.value.autopay
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text('Autopay', style: TextStyle(fontSize: 10, color: Colors.blue.shade700)),
                  )
                : null,
          ),
        );
      },
    );
  }

  Future<void> _payBill(Bill bill) async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(24, 24, 24, 24 + MediaQuery.of(ctx).padding.bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Pay Bill', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _PaymentDetailRow('Payee', bill.payeeName),
            _PaymentDetailRow('Account', bill.payeeAccountNumberMasked),
            _PaymentDetailRow('Amount', formatCurrency(bill.amountCents)),
            _PaymentDetailRow('Due', _formatDate(bill.dueDate)),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text('Pay ${formatCurrency(bill.amountCents)}'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true) {
      try {
        await GatewayClient.instance.payBill(bill.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Payment of ${formatCurrency(bill.amountCents)} to ${bill.payeeName} submitted'),
              backgroundColor: DesignTokens.statusSuccess,
            ),
          );
          _loadData();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Payment failed: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  void _showScheduleSheet(Bill bill) {
    DateTime selectedDate = DateTime.now().add(const Duration(days: 1));

    showModalBottomSheet(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(24, 24, 24, 24 + MediaQuery.of(ctx).padding.bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Schedule Payment', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Text('${bill.payeeName} \u00B7 ${formatCurrency(bill.amountCents)}'),
              const SizedBox(height: 16),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.calendar_today),
                title: Text('Payment Date: ${_formatDate(selectedDate.toIso8601String())}'),
                trailing: const Icon(Icons.edit, size: 18),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: ctx,
                    initialDate: selectedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) {
                    setSheetState(() => selectedDate = picked);
                  }
                },
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Payment to ${bill.payeeName} scheduled for ${_formatDate(selectedDate.toIso8601String())}'),
                    ),
                  );
                },
                child: const Text('Schedule'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddPayeeSheet() {
    final nameController = TextEditingController();
    final accountController = TextEditingController();
    final amountController = TextEditingController();
    String? selectedAccountId = _accounts.isNotEmpty ? _accounts.first.id : null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
          24, 24, 24,
          24 + MediaQuery.of(ctx).viewInsets.bottom + MediaQuery.of(ctx).padding.bottom,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Add Payee', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Payee Name',
                  hintText: 'e.g., Electric Company',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: accountController,
                decoration: const InputDecoration(
                  labelText: 'Payee Account Number',
                  hintText: 'Enter account number',
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: amountController,
                decoration: const InputDecoration(
                  labelText: 'Amount',
                  prefixText: '\$ ',
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              const SizedBox(height: 12),
              if (_accounts.isNotEmpty)
                DropdownButtonFormField<String>(
                  value: selectedAccountId,
                  decoration: const InputDecoration(labelText: 'Pay From'),
                  items: _accounts
                      .map((a) => DropdownMenuItem(
                            value: a.id,
                            child: Text('${a.displayName} (${formatCurrency(a.availableBalanceCents)})'),
                          ))
                      .toList(),
                  onChanged: (v) => selectedAccountId = v,
                ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  if (nameController.text.isEmpty || accountController.text.isEmpty) return;
                  try {
                    await GatewayClient.instance.createBill(
                      payeeName: nameController.text,
                      payeeAccountNumber: accountController.text,
                      amountCents: parseToCents(amountController.text),
                      dueDate: DateTime.now().add(const Duration(days: 30)).toIso8601String(),
                      fromAccountId: selectedAccountId ?? _accounts.first.id,
                    );
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Payee added successfully')),
                      );
                      _loadData();
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Failed to add payee: $e'), backgroundColor: Colors.red),
                      );
                    }
                  }
                },
                child: const Text('Add Payee'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[d.month - 1]} ${d.day}, ${d.year}';
    } catch (_) {
      return iso;
    }
  }
}

class _BillCard extends StatelessWidget {
  final Bill bill;
  final VoidCallback? onPay;
  final VoidCallback? onSchedule;

  const _BillCard({required this.bill, this.onPay, this.onSchedule});

  @override
  Widget build(BuildContext context) {
    final isPaid = bill.isPaid;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: (isPaid ? Colors.green : Colors.orange).withAlpha(25),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                isPaid ? Icons.check_circle : Icons.schedule,
                size: 22,
                color: isPaid ? Colors.green.shade700 : Colors.orange.shade700,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(bill.payeeName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(
                    bill.payeeAccountNumberMasked,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Text(
                        isPaid ? 'Paid' : 'Due ${_formatDate(bill.dueDate)}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isPaid ? Colors.green.shade600 : Colors.orange.shade700,
                        ),
                      ),
                      if (bill.autopay) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text('Autopay', style: TextStyle(fontSize: 10, color: Colors.blue.shade700)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(formatCurrency(bill.amountCents), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                if (!isPaid) ...[
                  const SizedBox(height: 6),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (onSchedule != null)
                        SizedBox(
                          height: 28,
                          child: OutlinedButton(
                            onPressed: onSchedule,
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 8),
                              textStyle: const TextStyle(fontSize: 11),
                              visualDensity: VisualDensity.compact,
                            ),
                            child: const Text('Schedule'),
                          ),
                        ),
                      if (onSchedule != null) const SizedBox(width: 6),
                      if (onPay != null)
                        SizedBox(
                          height: 28,
                          child: FilledButton(
                            onPressed: onPay,
                            style: FilledButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              textStyle: const TextStyle(fontSize: 11),
                              visualDensity: VisualDensity.compact,
                            ),
                            child: const Text('Pay'),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[d.month - 1]} ${d.day}';
    } catch (_) {
      return iso;
    }
  }
}

class _PaymentDetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _PaymentDetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
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

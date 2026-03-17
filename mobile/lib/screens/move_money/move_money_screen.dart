import 'package:flutter/material.dart';
import '../../services/gateway_client.dart';
import '../../models/banking.dart';
import '../../utils/currency.dart';
import '../../theme/design_tokens.dart';
import '../transfer/transfer_screen.dart';
import '../bills/bill_pay_screen.dart';
import '../deposit/deposit_screen.dart';

/// Move Money hub — unified entry point for transfers, bill pay, and deposits.
/// Shows quick transfer, recent activity, and navigation to full screens.
class MoveMoneyScreen extends StatefulWidget {
  const MoveMoneyScreen({super.key});

  @override
  State<MoveMoneyScreen> createState() => _MoveMoneyScreenState();
}

class _MoveMoneyScreenState extends State<MoveMoneyScreen> {
  List<Account> _accounts = [];
  List<StandingInstruction> _recurring = [];
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
        GatewayClient.instance.getAccounts(),
        GatewayClient.instance.getStandingInstructions(),
      ]);
      if (mounted) {
        setState(() {
          _accounts = results[0] as List<Account>;
          _recurring = results[1] as List<StandingInstruction>;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Move Money')),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Quick actions grid
            _MoveMoneyOption(
              icon: Icons.send,
              iconColor: DesignTokens.actionTransfer,
              iconBg: DesignTokens.actionTransferBg,
              title: 'Transfer',
              subtitle: 'Move money between your accounts or to someone else.',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const TransferScreen()),
              ),
            ),
            const SizedBox(height: 12),
            _MoveMoneyOption(
              icon: Icons.receipt_long,
              iconColor: DesignTokens.actionBillPay,
              iconBg: DesignTokens.actionBillPayBg,
              title: 'Pay Bills',
              subtitle: 'Pay your bills and manage payees.',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const BillPayScreen()),
              ),
            ),
            const SizedBox(height: 12),
            _MoveMoneyOption(
              icon: Icons.camera_alt,
              iconColor: DesignTokens.actionDeposit,
              iconBg: DesignTokens.actionDeposit.withAlpha(20),
              title: 'Deposit Check',
              subtitle: 'Deposit a check using your camera.',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const DepositScreen()),
              ),
            ),

            // Quick transfer shortcut
            if (!_isLoading && _accounts.length >= 2) ...[
              const SizedBox(height: 24),
              Text(
                'Quick Transfer',
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              _QuickTransferCard(
                accounts: _accounts,
                onTransferComplete: _loadData,
              ),
            ],

            // Recurring transfers
            if (!_isLoading && _recurring.isNotEmpty) ...[
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recurring Transfers',
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  TextButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const TransferScreen()),
                    ),
                    child: const Text('View All'),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              ..._recurring.take(3).map((si) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(Icons.repeat, size: 18, color: Colors.blue.shade700),
                  ),
                  title: Text(si.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                  subtitle: Text(
                    '${formatCurrency(si.amountCents)} \u00B7 ${si.frequency}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                  ),
                  trailing: _RecurringStatusBadge(status: si.status),
                ),
              )),
            ],

            const SizedBox(height: 80), // Bottom nav spacing
          ],
        ),
      ),
    );
  }
}

class _MoveMoneyOption extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final Color? iconBg;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _MoveMoneyOption({
    required this.icon,
    this.iconColor,
    this.iconBg,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = iconColor ?? theme.colorScheme.primary;
    final bg = iconBg ?? color.withAlpha(25);

    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: bg,
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 13)),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class _RecurringStatusBadge extends StatelessWidget {
  final String status;

  const _RecurringStatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = DesignTokens.statusColors(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status[0].toUpperCase() + status.substring(1),
        style: TextStyle(fontSize: 11, color: fg, fontWeight: FontWeight.w600),
      ),
    );
  }
}

/// Quick transfer card — inline form for fast internal transfers.
class _QuickTransferCard extends StatefulWidget {
  final List<Account> accounts;
  final VoidCallback onTransferComplete;

  const _QuickTransferCard({
    required this.accounts,
    required this.onTransferComplete,
  });

  @override
  State<_QuickTransferCard> createState() => _QuickTransferCardState();
}

class _QuickTransferCardState extends State<_QuickTransferCard> {
  String? _fromId;
  String? _toId;
  final _amountController = TextEditingController();
  final _memoController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.accounts.length >= 2) {
      _fromId = widget.accounts[0].id;
      _toId = widget.accounts[1].id;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _memoController.dispose();
    super.dispose();
  }

  bool get _canSubmit {
    return _fromId != null &&
        _toId != null &&
        _fromId != _toId &&
        parseToCents(_amountController.text) > 0 &&
        !_isSubmitting;
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;

    final amountCents = parseToCents(_amountController.text);

    // Show confirmation bottom sheet
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      builder: (ctx) {
        final fromAcct = widget.accounts.firstWhere((a) => a.id == _fromId);
        final toAcct = widget.accounts.firstWhere((a) => a.id == _toId);
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Confirm Transfer',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              _ConfirmRow('From', fromAcct.displayName),
              _ConfirmRow('To', toAcct.displayName),
              _ConfirmRow('Amount', formatCurrency(amountCents)),
              if (_memoController.text.isNotEmpty)
                _ConfirmRow('Memo', _memoController.text),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Confirm Transfer'),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel'),
              ),
              SizedBox(height: MediaQuery.of(ctx).padding.bottom),
            ],
          ),
        );
      },
    );

    if (confirmed != true) return;

    setState(() => _isSubmitting = true);
    try {
      await GatewayClient.instance.createTransfer(
        fromAccountId: _fromId!,
        toAccountId: _toId,
        type: 'internal',
        amountCents: amountCents,
        memo: _memoController.text.isEmpty ? null : _memoController.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Transfer of ${formatCurrency(amountCents)} submitted'),
            backgroundColor: DesignTokens.statusSuccess,
          ),
        );
        _amountController.clear();
        _memoController.clear();
        widget.onTransferComplete();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Transfer failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // From account
            DropdownButtonFormField<String>(
              value: _fromId,
              decoration: const InputDecoration(labelText: 'From', isDense: true),
              items: widget.accounts
                  .map((a) => DropdownMenuItem(
                        value: a.id,
                        child: Text(
                          '${a.displayName} (${formatCurrency(a.availableBalanceCents)})',
                          style: const TextStyle(fontSize: 13),
                        ),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _fromId = v),
            ),
            const SizedBox(height: 12),
            // To account
            DropdownButtonFormField<String>(
              value: _toId,
              decoration: const InputDecoration(labelText: 'To', isDense: true),
              items: widget.accounts
                  .where((a) => a.id != _fromId)
                  .map((a) => DropdownMenuItem(
                        value: a.id,
                        child: Text(a.displayName, style: const TextStyle(fontSize: 13)),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _toId = v),
            ),
            const SizedBox(height: 12),
            // Amount
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Amount',
                prefixText: '\$ ',
                isDense: true,
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),
            // Memo
            TextField(
              controller: _memoController,
              decoration: const InputDecoration(
                labelText: 'Memo (optional)',
                isDense: true,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _canSubmit ? _submit : null,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Transfer'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ConfirmRow extends StatelessWidget {
  final String label;
  final String value;

  const _ConfirmRow(this.label, this.value);

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

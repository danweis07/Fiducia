import 'package:flutter/material.dart';
import '../../services/gateway_client.dart';
import '../../models/banking.dart';
import '../../utils/currency.dart';

/// Transfer screen — mirrors web Transfer.tsx
/// Two tabs: New Transfer (4-step wizard) + Standing Instructions (recurring).
class TransferScreen extends StatefulWidget {
  const TransferScreen({super.key});

  @override
  State<TransferScreen> createState() => _TransferScreenState();
}

class _TransferScreenState extends State<TransferScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transfer Money'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'New Transfer'),
            Tab(text: 'Scheduled & Recurring'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _NewTransferTab(),
          _StandingInstructionsTab(),
        ],
      ),
    );
  }
}

// =============================================================================
// NEW TRANSFER TAB — 4-step wizard
// =============================================================================

class _NewTransferTab extends StatefulWidget {
  const _NewTransferTab();

  @override
  State<_NewTransferTab> createState() => _NewTransferTabState();
}

class _NewTransferTabState extends State<_NewTransferTab> {
  int _step = 1;
  List<Account> _accounts = [];
  List<Beneficiary> _beneficiaries = [];
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;

  String? _fromAccountId;
  String? _toAccountId;
  String? _toBeneficiaryId;
  bool _toBeneficiary = false;
  final _amountController = TextEditingController();
  final _memoController = TextEditingController();
  String? _transferId;

  // Scheduling
  bool _isScheduled = false;
  DateTime? _scheduledDate;
  String _recurrence = 'one_time'; // one_time, weekly, biweekly, monthly

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        GatewayClient.instance.getAccounts(),
        GatewayClient.instance.getBeneficiaries(),
      ]);
      setState(() {
        _accounts = results[0] as List<Account>;
        _beneficiaries = results[1] as List<Beneficiary>;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Account? get _fromAccount => _accounts.cast<Account?>().firstWhere(
        (a) => a?.id == _fromAccountId,
        orElse: () => null,
      );

  Future<void> _submit() async {
    setState(() { _isSubmitting = true; _error = null; });
    try {
      final result = await GatewayClient.instance.createTransfer(
        fromAccountId: _fromAccountId!,
        toAccountId: _toBeneficiary ? null : _toAccountId,
        toBeneficiaryId: _toBeneficiary ? _toBeneficiaryId : null,
        type: _toBeneficiary ? 'external' : 'internal',
        amountCents: parseToCents(_amountController.text),
        memo: _memoController.text.isEmpty ? null : _memoController.text,
      );
      setState(() {
        _transferId = result['transfer']?['id'] as String?;
        _step = 4;
        _isSubmitting = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _isSubmitting = false; });
    }
  }

  void _reset() {
    setState(() {
      _step = 1;
      _fromAccountId = null;
      _toAccountId = null;
      _toBeneficiaryId = null;
      _toBeneficiary = false;
      _amountController.clear();
      _memoController.clear();
      _transferId = null;
      _error = null;
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _memoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Step indicator
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(4, (i) {
              final stepNum = i + 1;
              return Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: _step >= stepNum
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey.shade300,
                    child: _step == 4 && stepNum == 4
                        ? const Icon(Icons.check, size: 16, color: Colors.white)
                        : Text('$stepNum', style: TextStyle(fontSize: 12, color: _step >= stepNum ? Colors.white : Colors.grey)),
                  ),
                  if (i < 3) Container(width: 32, height: 2, color: _step > stepNum ? Theme.of(context).colorScheme.primary : Colors.grey.shade300),
                ],
              );
            }),
          ),
          const SizedBox(height: 24),

          // Step 1: From account
          if (_step == 1) ...[
            const Text('From Account', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ..._accounts.map((acct) => RadioListTile<String>(
              title: Text(acct.displayName),
              subtitle: Text('${acct.accountNumberMasked} \u00B7 ${formatCurrency(acct.availableBalanceCents)}'),
              value: acct.id,
              groupValue: _fromAccountId,
              onChanged: (v) => setState(() => _fromAccountId = v),
            )),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _fromAccountId != null ? () => setState(() => _step = 2) : null,
              child: const Text('Next'),
            ),
          ],

          // Step 2: Destination
          if (_step == 2) ...[
            const Text('Destination', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: false, label: Text('My Account')),
                ButtonSegment(value: true, label: Text('Beneficiary')),
              ],
              selected: {_toBeneficiary},
              onSelectionChanged: (v) => setState(() => _toBeneficiary = v.first),
            ),
            const SizedBox(height: 16),
            if (!_toBeneficiary)
              ..._accounts.where((a) => a.id != _fromAccountId).map((acct) => RadioListTile<String>(
                title: Text(acct.displayName),
                subtitle: Text(acct.accountNumberMasked),
                value: acct.id,
                groupValue: _toAccountId,
                onChanged: (v) => setState(() => _toAccountId = v),
              ))
            else
              ..._beneficiaries.map((ben) => RadioListTile<String>(
                title: Text(ben.name),
                subtitle: Text('${ben.bankName ?? ''} \u00B7 ${ben.accountNumberMasked}'),
                value: ben.id,
                groupValue: _toBeneficiaryId,
                onChanged: (v) => setState(() => _toBeneficiaryId = v),
              )),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: OutlinedButton(onPressed: () => setState(() => _step = 1), child: const Text('Back'))),
                const SizedBox(width: 12),
                Expanded(child: FilledButton(
                  onPressed: (_toBeneficiary ? _toBeneficiaryId : _toAccountId) != null ? () => setState(() => _step = 3) : null,
                  child: const Text('Next'),
                )),
              ],
            ),
          ],

          // Step 3: Amount & confirm
          if (_step == 3) ...[
            const Text('Amount', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: 'Amount (\$)',
                helperText: _fromAccount != null ? 'Available: ${formatCurrency(_fromAccount!.availableBalanceCents)}' : null,
              ),
            ),
            const SizedBox(height: 12),
            TextField(controller: _memoController, decoration: const InputDecoration(labelText: 'Memo (optional)')),
            const SizedBox(height: 16),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Schedule for later'),
              value: _isScheduled,
              onChanged: (v) => setState(() {
                _isScheduled = v;
                if (!v) { _scheduledDate = null; _recurrence = 'one_time'; }
              }),
            ),
            if (_isScheduled) ...[
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Date'),
                trailing: Text(
                  _scheduledDate != null
                      ? '${_scheduledDate!.month}/${_scheduledDate!.day}/${_scheduledDate!.year}'
                      : 'Select date',
                  style: TextStyle(color: _scheduledDate != null ? null : Colors.grey),
                ),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now().add(const Duration(days: 1)),
                    firstDate: DateTime.now().add(const Duration(days: 1)),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) setState(() => _scheduledDate = picked);
                },
              ),
              DropdownButtonFormField<String>(
                value: _recurrence,
                decoration: const InputDecoration(labelText: 'Frequency'),
                items: const [
                  DropdownMenuItem(value: 'one_time', child: Text('One Time')),
                  DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                  DropdownMenuItem(value: 'biweekly', child: Text('Bi-weekly')),
                  DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
                ],
                onChanged: (v) => setState(() => _recurrence = v ?? 'one_time'),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: OutlinedButton(onPressed: () => setState(() => _step = 2), child: const Text('Back'))),
                const SizedBox(width: 12),
                Expanded(child: FilledButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Confirm Transfer'),
                )),
              ],
            ),
          ],

          // Step 4: Success
          if (_step == 4) ...[
            const SizedBox(height: 48),
            const Icon(Icons.check_circle, size: 64, color: Colors.green),
            const SizedBox(height: 16),
            const Text('Transfer Submitted', textAlign: TextAlign.center, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Your transfer has been submitted successfully.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade600)),
            if (_transferId != null) ...[
              const SizedBox(height: 8),
              Text('Transfer ID: $_transferId', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
            const SizedBox(height: 24),
            FilledButton(onPressed: _reset, child: const Text('Make Another Transfer')),
          ],
        ],
      ),
    );
  }
}

// =============================================================================
// STANDING INSTRUCTIONS TAB
// =============================================================================

class _StandingInstructionsTab extends StatefulWidget {
  const _StandingInstructionsTab();

  @override
  State<_StandingInstructionsTab> createState() => _StandingInstructionsTabState();
}

class _StandingInstructionsTabState extends State<_StandingInstructionsTab> {
  List<StandingInstruction> _instructions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadInstructions();
  }

  Future<void> _loadInstructions() async {
    setState(() => _isLoading = true);
    try {
      final instructions = await GatewayClient.instance.getStandingInstructions();
      if (mounted) setState(() { _instructions = instructions; _isLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_isLoading) return const Center(child: CircularProgressIndicator());

    if (_instructions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.repeat, size: 48, color: Colors.grey.shade300),
              const SizedBox(height: 16),
              Text('No recurring transfers', style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey)),
              const SizedBox(height: 8),
              Text('Set up automatic transfers to save regularly.', textAlign: TextAlign.center, style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadInstructions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _instructions.length,
        itemBuilder: (context, index) {
          final si = _instructions[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(si.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      ),
                      _StatusBadge(status: si.status),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${formatCurrency(si.amountCents)} \u00B7 ${si.frequency[0].toUpperCase()}${si.frequency.substring(1)}',
                    style: const TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Transfer type: ${si.transferType.replaceAll('_', ' ')}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  if (si.nextExecutionDate != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Next: ${_formatDate(si.nextExecutionDate!)}',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                  ],
                  if (si.lastFailureReason != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Last error: ${si.lastFailureReason}',
                      style: TextStyle(fontSize: 12, color: Colors.red.shade600),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Text('${si.totalExecutions} executions', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                      const Spacer(),
                      if (si.status == 'active')
                        TextButton(
                          onPressed: () => _toggleStatus(si, 'paused'),
                          child: const Text('Pause', style: TextStyle(fontSize: 13)),
                        ),
                      if (si.status == 'paused')
                        TextButton(
                          onPressed: () => _toggleStatus(si, 'active'),
                          child: const Text('Resume', style: TextStyle(fontSize: 13)),
                        ),
                      TextButton(
                        onPressed: () => _toggleStatus(si, 'cancelled'),
                        style: TextButton.styleFrom(foregroundColor: Colors.red),
                        child: const Text('Cancel', style: TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _toggleStatus(StandingInstruction si, String newStatus) async {
    try {
      await GatewayClient.instance.updateStandingInstruction(si.id, status: newStatus);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Instruction ${newStatus == 'cancelled' ? 'cancelled' : newStatus}')),
        );
        _loadInstructions();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${months[d.month - 1]} ${d.day}, ${d.year}';
    } catch (_) {
      return iso;
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case 'active': color = Colors.green; break;
      case 'paused': color = Colors.orange; break;
      case 'failed': color = Colors.red; break;
      case 'completed': color = Colors.blue; break;
      case 'cancelled': color = Colors.grey; break;
      default: color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status[0].toUpperCase() + status.substring(1),
        style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

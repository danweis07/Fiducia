import 'package:flutter/material.dart';
import '../../services/gateway_client.dart';
import '../../models/banking.dart';
import '../../utils/currency.dart';

class LoanDetailScreen extends StatefulWidget {
  final String loanId;
  const LoanDetailScreen({super.key, required this.loanId});

  @override
  State<LoanDetailScreen> createState() => _LoanDetailScreenState();
}

class _LoanDetailScreenState extends State<LoanDetailScreen> {
  Loan? _loan;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadLoan();
  }

  Future<void> _loadLoan() async {
    try {
      final loan = await GatewayClient.instance.getLoan(widget.loanId);
      setState(() {
        _loan = loan;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Loan Details')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _loan == null
              ? const Center(child: Text('Loan not found.'))
              : RefreshIndicator(
                  onRefresh: _loadLoan,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Header card
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _loan!.loanNumberMasked,
                                style: const TextStyle(fontSize: 13, color: Colors.grey),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Loan',
                                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                                  ),
                                  Chip(
                                    label: Text(
                                      _loan!.status.replaceAll('_', ' '),
                                      style: const TextStyle(fontSize: 11),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // KPIs
                              Row(
                                children: [
                                  Expanded(
                                    child: _KPI(
                                      label: 'Outstanding',
                                      value: formatCurrency(_loan!.outstandingBalanceCents),
                                    ),
                                  ),
                                  Expanded(
                                    child: _KPI(
                                      label: 'Original',
                                      value: formatCurrency(_loan!.principalCents),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: _KPI(
                                      label: 'Rate',
                                      value: formatInterestRate(_loan!.interestRateBps),
                                    ),
                                  ),
                                  Expanded(
                                    child: _KPI(
                                      label: 'Term',
                                      value: '${_loan!.termMonths} mo',
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // Progress
                              LinearProgressIndicator(
                                value: _loan!.progressPercent / 100,
                                minHeight: 8,
                                backgroundColor: Colors.grey.shade200,
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '${_loan!.progressPercent}% paid off',
                                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                                  ),
                                  Text(
                                    '${_loan!.paymentsRemaining ?? "—"} payments left',
                                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Next payment
                      if (_loan!.nextPaymentDueDate != null) ...[
                        const SizedBox(height: 12),
                        Card(
                          child: ListTile(
                            leading: const Icon(Icons.calendar_today),
                            title: Text(
                              'Next: ${formatCurrency(_loan!.nextPaymentAmountCents ?? 0)}',
                              style: const TextStyle(fontWeight: FontWeight.w500),
                            ),
                            subtitle: Text(
                              'Due ${_loan!.nextPaymentDueDate}'
                              '${_loan!.autopayAccountId != null ? ' · Autopay enabled' : ''}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ),
                      ],

                      // Past due warning
                      if (_loan!.daysPastDue > 0) ...[
                        const SizedBox(height: 12),
                        Card(
                          color: Colors.red.shade50,
                          child: ListTile(
                            leading: Icon(Icons.warning, color: Colors.red.shade700),
                            title: Text(
                              '${_loan!.daysPastDue} day${_loan!.daysPastDue != 1 ? 's' : ''} past due',
                              style: TextStyle(
                                color: Colors.red.shade700,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],

                      // Details
                      const SizedBox(height: 16),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Loan Details',
                                style: TextStyle(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 12),
                              _DetailRow(label: 'Principal Paid', value: formatCurrency(_loan!.principalPaidCents)),
                              _DetailRow(label: 'Interest Paid', value: formatCurrency(_loan!.interestPaidCents)),
                              _DetailRow(label: 'Maturity Date', value: _loan!.maturityDate ?? '—'),
                              _DetailRow(
                                label: 'Autopay',
                                value: _loan!.autopayAccountId != null ? 'Enabled' : 'Not set up',
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Make a payment button
                      const SizedBox(height: 24),
                      FilledButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.payment),
                        label: const Text('Make a Payment'),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(double.infinity, 48),
                        ),
                      ),

                      const SizedBox(height: 80),
                    ],
                  ),
                ),
    );
  }
}

class _KPI extends StatelessWidget {
  final String label;
  final String value;
  const _KPI({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
        ],
      ),
    );
  }
}

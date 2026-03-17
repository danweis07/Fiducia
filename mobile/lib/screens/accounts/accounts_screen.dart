import 'package:flutter/material.dart';
import '../../services/gateway_client.dart';
import '../../models/banking.dart';
import '../../utils/currency.dart';
import 'account_detail_screen.dart';
import '../loans/loan_detail_screen.dart';

class AccountsScreen extends StatefulWidget {
  const AccountsScreen({super.key});

  @override
  State<AccountsScreen> createState() => _AccountsScreenState();
}

class _AccountsScreenState extends State<AccountsScreen> {
  List<Account> _accounts = [];
  List<Loan> _loans = [];
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
        GatewayClient.instance.getLoans(),
      ]);
      setState(() {
        _accounts = results[0] as List<Account>;
        _loans = (results[1] as List<Loan>)
            .where((l) => l.status != 'closed' && l.status != 'charged_off')
            .toList();
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalDeposits = _accounts.fold<int>(0, (sum, a) => sum + a.balanceCents);
    final totalLoans = _loans.fold<int>(0, (sum, l) => sum + l.outstandingBalanceCents);

    return Scaffold(
      appBar: AppBar(title: const Text('Accounts')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Summary
                  Text(
                    'Deposits: ${formatCurrency(totalDeposits)}',
                    style: const TextStyle(color: Colors.grey),
                  ),
                  if (_loans.isNotEmpty)
                    Text(
                      'Loans: ${formatCurrency(totalLoans)}',
                      style: const TextStyle(color: Colors.grey),
                    ),
                  const SizedBox(height: 16),

                  // Deposit accounts
                  const Text(
                    'Deposit Accounts',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  if (_accounts.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(child: Text('No deposit accounts found.')),
                      ),
                    )
                  else
                    ..._accounts.map((account) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                _accountIcon(account.type),
                                size: 20,
                              ),
                            ),
                            title: Text(
                              account.displayName,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            subtitle: Text(
                              '${account.type.replaceAll('_', ' ')} · ${account.accountNumberMasked}',
                              style: const TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  formatCurrency(account.balanceCents),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                Text(
                                  'Avail: ${formatCurrency(account.availableBalanceCents)}',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                              ],
                            ),
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => AccountDetailScreen(account: account),
                              ),
                            ),
                          ),
                        )),

                  // Loans
                  if (_loans.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const Text(
                      'Loans',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    ..._loans.map((loan) => GestureDetector(
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
                                        const Text(
                                          'Loan',
                                          style: TextStyle(fontWeight: FontWeight.w600),
                                        ),
                                        Text(
                                          loan.loanNumberMasked,
                                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                                        ),
                                      ],
                                    ),
                                    Chip(
                                      label: Text(
                                        loan.status.replaceAll('_', ' '),
                                        style: const TextStyle(fontSize: 11),
                                      ),
                                      padding: EdgeInsets.zero,
                                      visualDensity: VisualDensity.compact,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      formatCurrency(loan.outstandingBalanceCents),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 20,
                                      ),
                                    ),
                                    Text(
                                      'of ${formatCurrency(loan.principalCents)}',
                                      style: const TextStyle(fontSize: 12, color: Colors.grey),
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
                                    Text(
                                      '${loan.progressPercent}% paid',
                                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                                    ),
                                    Text(
                                      'Rate: ${formatInterestRate(loan.interestRateBps)}',
                                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ))),
                  ],

                  const SizedBox(height: 80),
                ],
              ),
            ),
    );
  }

  IconData _accountIcon(String type) {
    switch (type) {
      case 'checking':
        return Icons.account_balance;
      case 'savings':
        return Icons.savings;
      case 'money_market':
        return Icons.trending_up;
      case 'cd':
        return Icons.lock_clock;
      default:
        return Icons.account_balance;
    }
  }
}

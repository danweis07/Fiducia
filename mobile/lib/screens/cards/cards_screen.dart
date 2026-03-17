import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/banking.dart';
import '../../services/gateway_client.dart';
import '../../utils/currency.dart';
import '../../theme/design_tokens.dart';
import '../../widgets/error_view.dart';

/// Cards screen — mirrors web Cards.tsx
/// Shows card management: lock/unlock, daily limits, card info, and details.
class CardsScreen extends StatefulWidget {
  const CardsScreen({super.key});

  @override
  State<CardsScreen> createState() => _CardsScreenState();
}

class _CardsScreenState extends State<CardsScreen> {
  List<BankCard> _cards = [];
  bool _isLoading = true;
  String? _error;
  int _currentCardIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadCards();
  }

  Future<void> _loadCards() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final cards = await GatewayClient.instance.getCards();
      if (mounted) setState(() { _cards = cards; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _isLoading = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Card Controls'),
        actions: [
          if (_cards.isNotEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Text(
                  '${_currentCardIndex + 1} of ${_cards.length}',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorView(message: _error, onRetry: _loadCards)
              : _cards.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.credit_card, size: 48, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text('No cards found', style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadCards,
                      child: PageView.builder(
                        itemCount: _cards.length,
                        onPageChanged: (i) => setState(() => _currentCardIndex = i),
                        itemBuilder: (context, index) => SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: _CardWidget(
                            card: _cards[index],
                            onToggleLock: () => _toggleLock(_cards[index]),
                            onLimitChanged: (cents) => _setLimit(_cards[index], cents),
                          ),
                        ),
                      ),
                    ),
    );
  }

  Future<void> _toggleLock(BankCard card) async {
    try {
      if (card.isLocked) {
        await GatewayClient.instance.unlockCard(card.id);
      } else {
        await GatewayClient.instance.lockCard(card.id);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Card ${card.isLocked ? 'unfrozen' : 'frozen'} successfully')),
        );
        // Update local state for demo mode
        setState(() {
          final idx = _cards.indexWhere((c) => c.id == card.id);
          if (idx >= 0) {
            _cards[idx] = BankCard(
              id: card.id,
              accountId: card.accountId,
              type: card.type,
              lastFour: card.lastFour,
              cardholderName: card.cardholderName,
              status: card.isLocked ? 'active' : 'locked',
              dailyLimitCents: card.dailyLimitCents,
              singleTransactionLimitCents: card.singleTransactionLimitCents,
              expirationDate: card.expirationDate,
              isContactless: card.isContactless,
              isVirtual: card.isVirtual,
            );
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _setLimit(BankCard card, int cents) async {
    try {
      await GatewayClient.instance.setCardLimit(card.id, cents);
      setState(() {
        final idx = _cards.indexWhere((c) => c.id == card.id);
        if (idx >= 0) {
          _cards[idx] = BankCard(
            id: card.id,
            accountId: card.accountId,
            type: card.type,
            lastFour: card.lastFour,
            cardholderName: card.cardholderName,
            status: card.status,
            dailyLimitCents: cents,
            singleTransactionLimitCents: card.singleTransactionLimitCents,
            expirationDate: card.expirationDate,
            isContactless: card.isContactless,
            isVirtual: card.isVirtual,
          );
        }
      });
    } catch (_) {}
  }
}

class _CardWidget extends StatefulWidget {
  final BankCard card;
  final VoidCallback onToggleLock;
  final ValueChanged<int> onLimitChanged;

  const _CardWidget({required this.card, required this.onToggleLock, required this.onLimitChanged});

  @override
  State<_CardWidget> createState() => _CardWidgetState();
}

class _CardWidgetState extends State<_CardWidget> {
  late double _limitSlider;

  @override
  void initState() {
    super.initState();
    _limitSlider = widget.card.dailyLimitCents.toDouble();
  }

  @override
  void didUpdateWidget(covariant _CardWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.card.dailyLimitCents != widget.card.dailyLimitCents) {
      _limitSlider = widget.card.dailyLimitCents.toDouble();
    }
  }

  void _showReportLostStolen(BuildContext context, BankCard card) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Report Lost/Stolen'),
        content: Text('Report card ending in ${card.lastFour} as lost or stolen? A replacement card will be issued.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await GatewayClient.instance.reportReplaceCard(
                  cardId: card.id,
                  reason: 'lost_stolen',
                );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Card reported. A replacement is being processed.')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Report'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final card = widget.card;
    final theme = Theme.of(context);
    final isDebit = card.type == 'debit';

    return Column(
      children: [
        // Card visual
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isDebit
                  ? [const Color(0xFF1E40AF), const Color(0xFF3B82F6)]
                  : [const Color(0xFF7C3AED), const Color(0xFFA78BFA)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isDebit ? 'Debit Card' : 'Credit Card',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  Row(
                    children: [
                      if (card.isVirtual)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white24,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text('Virtual', style: TextStyle(color: Colors.white, fontSize: 11)),
                        ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: card.isLocked ? Colors.blue.withValues(alpha: 0.3) : Colors.green.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          card.isLocked ? 'Frozen' : 'Active',
                          style: const TextStyle(color: Colors.white, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Text(
                '\u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  ${card.lastFour}',
                style: const TextStyle(color: Colors.white, fontSize: 20, letterSpacing: 2),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('CARDHOLDER', style: TextStyle(color: Colors.white54, fontSize: 10)),
                      Text(card.cardholderName, style: const TextStyle(color: Colors.white, fontSize: 13)),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('EXPIRES', style: TextStyle(color: Colors.white54, fontSize: 10)),
                      Text(card.expirationDate, style: const TextStyle(color: Colors.white, fontSize: 13)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  if (card.isContactless) ...[
                    const Icon(Icons.contactless, color: Colors.white70, size: 18),
                    const SizedBox(width: 8),
                  ],
                  const Icon(Icons.shield, color: Colors.white70, size: 18),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Controls
        Card(
          child: Column(
            children: [
              // Freeze/Unfreeze toggle (Chase/BofA pattern)
              SwitchListTile(
                title: Text(card.isLocked ? 'Card Frozen' : 'Card Active'),
                subtitle: Text(card.isLocked ? 'Unfreeze to resume transactions' : 'Freeze to temporarily block transactions'),
                value: !card.isLocked,
                onChanged: (_) => widget.onToggleLock(),
                secondary: Icon(
                  card.isLocked ? Icons.ac_unit : Icons.check_circle_outline,
                  color: card.isLocked ? Colors.blue : Colors.green,
                ),
              ),
              const Divider(height: 1, indent: 16, endIndent: 16),
              // Daily limit
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Daily Spending Limit', style: theme.textTheme.titleSmall),
                        Text(formatCurrency(_limitSlider.round()), style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Slider(
                      value: _limitSlider,
                      min: 10000,
                      max: 2000000,
                      divisions: 199,
                      onChanged: (v) => setState(() => _limitSlider = v),
                      onChangeEnd: (v) => widget.onLimitChanged(v.round()),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('\$100', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                        Text('\$20,000', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Card details
        Card(
          child: Column(
            children: [
              _CardDetailRow('Card Type', isDebit ? 'Debit' : 'Credit'),
              const Divider(height: 1, indent: 16, endIndent: 16),
              _CardDetailRow('Last Four', card.lastFour),
              const Divider(height: 1, indent: 16, endIndent: 16),
              _CardDetailRow('Expiration', card.expirationDate),
              const Divider(height: 1, indent: 16, endIndent: 16),
              _CardDetailRow('Contactless', card.isContactless ? 'Enabled' : 'Disabled'),
              const Divider(height: 1, indent: 16, endIndent: 16),
              _CardDetailRow('Virtual Card', card.isVirtual ? 'Yes' : 'No'),
              const Divider(height: 1, indent: 16, endIndent: 16),
              _CardDetailRow(
                'Single Transaction Limit',
                formatCurrency(card.singleTransactionLimitCents),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Quick actions
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.report_problem_outlined, size: 22),
                title: const Text('Report Lost/Stolen', style: TextStyle(fontSize: 14)),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () => _showReportLostStolen(context, card),
              ),
              const Divider(height: 1, indent: 56),
              ListTile(
                leading: const Icon(Icons.pin_outlined, size: 22),
                title: const Text('Change PIN', style: TextStyle(fontSize: 14)),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please visit your nearest branch or call (800) 555-0199 to change your PIN.')),
                  );
                },
              ),
              const Divider(height: 1, indent: 56),
              ListTile(
                leading: const Icon(Icons.travel_explore, size: 22),
                title: const Text('Travel Notice', style: TextStyle(fontSize: 14)),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () => context.push('/cards/travel-notice'),
              ),
              const Divider(height: 1, indent: 56),
              ListTile(
                leading: const Icon(Icons.account_balance_wallet_outlined, size: 22),
                title: const Text('Add to Wallet', style: TextStyle(fontSize: 14)),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () => context.push('/cards/provisioning/${card.id}'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

class _CardDetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _CardDetailRow(this.label, this.value);

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

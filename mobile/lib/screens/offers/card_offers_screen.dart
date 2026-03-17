import 'package:flutter/material.dart';
import '../../models/financial_data.dart';
import '../../services/gateway_client.dart';
import '../../utils/currency.dart';

/// Card Offers screen — displays card-linked merchant offers
/// with tabs for available, activated, and rewards history.
class CardOffersScreen extends StatefulWidget {
  const CardOffersScreen({super.key});

  @override
  State<CardOffersScreen> createState() => _CardOffersScreenState();
}

class _CardOffersScreenState extends State<CardOffersScreen> {
  List<MerchantOffer> _offers = [];
  OfferSummary? _summary;
  List<OfferRedemption> _redemptions = [];
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
        GatewayClient.instance.getOffers(),
        GatewayClient.instance.getOfferSummary(),
        GatewayClient.instance.getOfferRedemptions(),
      ]);
      if (mounted) {
        setState(() {
          _offers = results[0] as List<MerchantOffer>;
          _summary = results[1] as OfferSummary;
          _redemptions = results[2] as List<OfferRedemption>;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatReward(String offerType, int rewardValue) {
    switch (offerType) {
      case 'cashback_percent':
        return '${(rewardValue / 100).toStringAsFixed(0)}% back';
      case 'cashback_flat':
        return '${formatCurrency(rewardValue)} back';
      case 'discount_percent':
        return '${(rewardValue / 100).toStringAsFixed(0)}% off';
      case 'discount_flat':
        return '${formatCurrency(rewardValue)} off';
      default:
        return '$rewardValue';
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Card Offers'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Available'),
              Tab(text: 'Activated'),
              Tab(text: 'Rewards'),
            ],
          ),
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _loadData,
                child: Column(
                  children: [
                    _buildSummaryRow(context),
                    Expanded(
                      child: TabBarView(
                        children: [
                          _buildAvailableTab(context),
                          _buildActivatedTab(context),
                          _buildRewardsTab(context),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildSummaryRow(BuildContext context) {
    final summary = _summary;
    if (summary == null) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        children: [
          _buildMetricChip(
            context,
            label: 'Available',
            value: '${summary.availableCount}',
            icon: Icons.local_offer_outlined,
          ),
          const SizedBox(width: 8),
          _buildMetricChip(
            context,
            label: 'Activated',
            value: '${summary.activatedCount}',
            icon: Icons.check_circle_outline,
          ),
          const SizedBox(width: 8),
          _buildMetricChip(
            context,
            label: 'Monthly',
            value: formatCurrency(summary.monthlyRewardsCents),
            icon: Icons.calendar_month,
          ),
          const SizedBox(width: 8),
          _buildMetricChip(
            context,
            label: 'Total Earned',
            value: formatCurrency(summary.totalRewardsCents),
            icon: Icons.savings_outlined,
          ),
        ],
      ),
    );
  }

  Widget _buildMetricChip(
    BuildContext context, {
    required String label,
    required String value,
    required IconData icon,
  }) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: colorScheme.primary),
            const SizedBox(height: 4),
            Text(
              value,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              label,
              style: theme.textTheme.labelSmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Available tab
  // ---------------------------------------------------------------------------

  Widget _buildAvailableTab(BuildContext context) {
    final available =
        _offers.where((o) => o.status == 'available').toList();

    if (available.isEmpty) {
      return const Center(child: Text('No available offers'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: available.length,
      itemBuilder: (context, index) {
        final offer = available[index];
        return _buildAvailableOfferCard(context, offer);
      },
    );
  }

  Widget _buildAvailableOfferCard(BuildContext context, MerchantOffer offer) {
    final theme = Theme.of(context);
    final rewardValue = int.tryParse(offer.rewardValue) ?? 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 24,
              backgroundImage: offer.merchant.logoUrl != null
                  ? NetworkImage(offer.merchant.logoUrl!)
                  : null,
              child: offer.merchant.logoUrl == null
                  ? Text(offer.merchant.name.isNotEmpty
                      ? offer.merchant.name[0]
                      : '?')
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    offer.merchant.name,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    offer.headline,
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _formatReward(offer.offerType, rewardValue),
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: theme.colorScheme.onPrimaryContainer,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (offer.expiresAt != null)
                        Text(
                          'Expires ${offer.expiresAt}',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: () => _activateOffer(offer),
              child: const Text('Activate'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _activateOffer(MerchantOffer offer) async {
    try {
      await GatewayClient.instance.activateOffer(
        offerId: offer.offerId,
        cardId: 'card-default',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${offer.merchant.name} offer activated'),
          ),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to activate: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Activated tab
  // ---------------------------------------------------------------------------

  Widget _buildActivatedTab(BuildContext context) {
    final activated =
        _offers.where((o) => o.status == 'activated').toList();

    if (activated.isEmpty) {
      return const Center(child: Text('No activated offers'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: activated.length,
      itemBuilder: (context, index) {
        final offer = activated[index];
        return _buildActivatedOfferCard(context, offer);
      },
    );
  }

  Widget _buildActivatedOfferCard(BuildContext context, MerchantOffer offer) {
    final theme = Theme.of(context);
    final rewardValue = int.tryParse(offer.rewardValue) ?? 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.green.shade300, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 24,
              backgroundImage: offer.merchant.logoUrl != null
                  ? NetworkImage(offer.merchant.logoUrl!)
                  : null,
              child: offer.merchant.logoUrl == null
                  ? Text(offer.merchant.name.isNotEmpty
                      ? offer.merchant.name[0]
                      : '?')
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    offer.merchant.name,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    offer.headline,
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _formatReward(offer.offerType, rewardValue),
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: Colors.green.shade800,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (offer.activatedAt != null)
                        Text(
                          'Since ${offer.activatedAt}',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: () => _deactivateOffer(offer),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red),
              ),
              child: const Text('Deactivate'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deactivateOffer(MerchantOffer offer) async {
    try {
      await GatewayClient.instance.deactivateOffer(offer.offerId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${offer.merchant.name} offer deactivated'),
          ),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to deactivate: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rewards tab
  // ---------------------------------------------------------------------------

  Widget _buildRewardsTab(BuildContext context) {
    if (_redemptions.isEmpty) {
      return const Center(child: Text('No rewards yet'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _redemptions.length,
      itemBuilder: (context, index) {
        final redemption = _redemptions[index];
        return _buildRedemptionCard(context, redemption);
      },
    );
  }

  Widget _buildRedemptionCard(BuildContext context, OfferRedemption redemption) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    redemption.merchantName,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Transaction: ${formatCurrency(redemption.transactionAmountCents)}',
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    redemption.redeemedAt,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '+${formatCurrency(redemption.rewardAmountCents)}',
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: Colors.green,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _payoutStatusColor(redemption.payoutStatus),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    redemption.payoutStatus,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _payoutStatusColor(String status) {
    switch (status) {
      case 'paid':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'processing':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }
}

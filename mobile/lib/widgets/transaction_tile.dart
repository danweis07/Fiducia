import 'package:flutter/material.dart';
import '../models/banking.dart';
import '../utils/currency.dart';
import '../theme/design_tokens.dart';

/// Reusable transaction list item — used on Dashboard, Account Detail, etc.
class TransactionTile extends StatelessWidget {
  final Transaction transaction;
  final VoidCallback? onTap;
  final bool showDate;

  const TransactionTile({
    super.key,
    required this.transaction,
    this.onTap,
    this.showDate = true,
  });

  IconData get _categoryIcon {
    switch (transaction.category) {
      case 'groceries':
        return Icons.shopping_cart;
      case 'dining':
      case 'food_dining':
        return Icons.restaurant;
      case 'entertainment':
        return Icons.movie;
      case 'housing':
        return Icons.home;
      case 'transportation':
        return Icons.directions_car;
      case 'shopping':
        return Icons.shopping_bag;
      case 'healthcare':
        return Icons.local_hospital;
      case 'utilities':
        return Icons.bolt;
      case 'income':
        return Icons.account_balance;
      case 'transfer':
        return Icons.swap_horiz;
      case 'subscriptions':
        return Icons.subscriptions;
      default:
        return Icons.receipt;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isCredit = transaction.isCredit;
    final isPending = transaction.status == 'pending';

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isCredit
                    ? DesignTokens.creditBg
                    : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                _categoryIcon,
                size: 20,
                color: isCredit
                    ? DesignTokens.credit
                    : Colors.grey.shade600,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    transaction.description,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      if (isPending) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 1,
                          ),
                          decoration: BoxDecoration(
                            color: DesignTokens.riskHighLight,
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text(
                            'Pending',
                            style: TextStyle(
                              fontSize: 10,
                              color: DesignTokens.riskHigh,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                      ],
                      if (showDate)
                        Text(
                          _formatDate(
                            transaction.postedAt ?? transaction.createdAt,
                          ),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      if (transaction.merchantName != null) ...[
                        Text(
                          ' \u00B7 ',
                          style: TextStyle(color: Colors.grey.shade400),
                        ),
                        Flexible(
                          child: Text(
                            transaction.merchantName!,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '${isCredit ? '+' : ''}${formatCurrency(transaction.amountCents)}',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isCredit ? DesignTokens.credit : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      final months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      return '${months[d.month - 1]} ${d.day}';
    } catch (_) {
      return '';
    }
  }
}

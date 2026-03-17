import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/banking.dart';

/// Renders a CMS content item as a dismissible banner card.
class CMSBannerCard extends StatefulWidget {
  final CMSContent content;
  final VoidCallback? onTap;

  const CMSBannerCard({super.key, required this.content, this.onTap});

  @override
  State<CMSBannerCard> createState() => _CMSBannerCardState();
}

class _CMSBannerCardState extends State<CMSBannerCard> {
  bool _dismissed = false;

  static const _dismissedKey = 'cms_dismissed_ids';

  @override
  void initState() {
    super.initState();
    _checkDismissed();
  }

  Future<void> _checkDismissed() async {
    final prefs = await SharedPreferences.getInstance();
    final ids = prefs.getStringList(_dismissedKey) ?? [];
    if (ids.contains(widget.content.id) && mounted) {
      setState(() => _dismissed = true);
    }
  }

  Future<void> _dismiss() async {
    final prefs = await SharedPreferences.getInstance();
    final ids = prefs.getStringList(_dismissedKey) ?? [];
    ids.add(widget.content.id);
    await prefs.setStringList(_dismissedKey, ids);
    if (mounted) setState(() => _dismissed = true);
  }

  Color _bannerColor(BuildContext context) {
    switch (widget.content.contentType) {
      case 'announcement':
        return Colors.blue.shade50;
      case 'banner':
        return Colors.amber.shade50;
      case 'promotion':
        return Colors.green.shade50;
      default:
        return Theme.of(context).colorScheme.surfaceContainerHighest;
    }
  }

  IconData _bannerIcon() {
    switch (widget.content.contentType) {
      case 'announcement':
        return Icons.campaign_outlined;
      case 'banner':
        return Icons.warning_amber_rounded;
      case 'promotion':
        return Icons.card_giftcard;
      default:
        return Icons.info_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_dismissed) return const SizedBox.shrink();

    // Check expiration
    if (widget.content.expiresAt != null) {
      final expires = DateTime.tryParse(widget.content.expiresAt!);
      if (expires != null && expires.isBefore(DateTime.now())) {
        return const SizedBox.shrink();
      }
    }

    final priority = widget.content.metadata['priority'] as String?;

    return Card(
      color: _bannerColor(context),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(_bannerIcon(), size: 20, color: Colors.black54),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            widget.content.title,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                        ),
                        if (priority == 'high')
                          Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.red.shade100,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Important',
                              style: TextStyle(fontSize: 10, color: Colors.red.shade700, fontWeight: FontWeight.w500),
                            ),
                          ),
                      ],
                    ),
                    if (widget.content.body != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        widget.content.body!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 13, color: Colors.black.withValues(alpha: 0.7)),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 4),
              GestureDetector(
                onTap: _dismiss,
                child: Icon(Icons.close, size: 18, color: Colors.black.withValues(alpha: 0.4)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Renders a list of CMS banners.
class CMSBannerList extends StatelessWidget {
  final List<CMSContent> items;

  const CMSBannerList({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Column(
      children: items.map((item) => CMSBannerCard(key: ValueKey(item.id), content: item)).toList(),
    );
  }
}

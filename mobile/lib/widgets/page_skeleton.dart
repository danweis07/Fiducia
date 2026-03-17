import 'package:flutter/material.dart';

/// Loading skeleton placeholder — mirrors the web `PageSkeleton` component.
///
/// Shows a simple pulsing shimmer effect with rectangular placeholder blocks
/// to indicate content is loading.
class PageSkeleton extends StatefulWidget {
  const PageSkeleton({super.key});

  @override
  State<PageSkeleton> createState() => _PageSkeletonState();
}

class _PageSkeletonState extends State<PageSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
    _opacity = Tween<double>(begin: 0.3, end: 0.8).animate(_controller)
      ..addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _shimmerBlock(width: double.infinity, height: 20),
          const SizedBox(height: 16),
          _shimmerBlock(width: 260, height: 16),
          const SizedBox(height: 24),
          _shimmerBlock(width: double.infinity, height: 120),
          const SizedBox(height: 16),
          _shimmerBlock(width: 200, height: 16),
        ],
      ),
    );
  }

  Widget _shimmerBlock({required double height, required double width}) {
    return Opacity(
      opacity: _opacity.value,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.grey.shade300,
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}

/// Convenience alias matching the web component name.
typedef LoadingSkeleton = PageSkeleton;

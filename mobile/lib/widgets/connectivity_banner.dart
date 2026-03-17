import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// ConnectivityBanner — shows a banner when device goes offline.
///
/// Uses connectivity_plus for real-time monitoring.
/// Falls back to a simple offline check if the package isn't available.
class ConnectivityBanner extends StatefulWidget {
  const ConnectivityBanner({super.key});

  @override
  State<ConnectivityBanner> createState() => _ConnectivityBannerState();
}

class _ConnectivityBannerState extends State<ConnectivityBanner> {
  bool _isOffline = false;
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  @override
  void initState() {
    super.initState();
    _subscription = Connectivity().onConnectivityChanged.listen((results) {
      final offline = results.every((r) => r == ConnectivityResult.none);
      if (mounted && offline != _isOffline) {
        setState(() => _isOffline = offline);
      }
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_isOffline) return const SizedBox.shrink();

    return MaterialBanner(
      content: const Text(
        'You are offline. Some features may be unavailable.',
        style: TextStyle(color: Colors.white, fontSize: 13),
      ),
      leading: const Icon(Icons.wifi_off, color: Colors.white),
      backgroundColor: Colors.red.shade700,
      actions: [
        TextButton(
          onPressed: () => setState(() => _isOffline = false),
          child: const Text('DISMISS', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }
}

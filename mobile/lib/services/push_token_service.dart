import 'dart:async';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'gateway_client.dart';

/// Singleton service that manages FCM push token lifecycle.
///
/// Responsibilities:
///   - Retrieves the current FCM token on initialization
///   - Listens for token refresh events and re-registers with the backend
///   - Registers/unregisters tokens via [GatewayClient]
class PushTokenService {
  static PushTokenService? _instance;

  PushTokenService._();

  static PushTokenService get instance {
    _instance ??= PushTokenService._();
    return _instance!;
  }

  String? _currentToken;
  StreamSubscription<String>? _tokenRefreshSubscription;

  /// The most recently registered FCM token, if any.
  String? get currentToken => _currentToken;

  /// Initialize push token management.
  ///
  /// Gets the current FCM token, registers it with the backend via
  /// [GatewayClient], and listens for token refresh events.
  ///
  /// Should be called after Firebase is initialized and push permission
  /// has been granted.
  Future<void> initialize() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await _registerToken(token);
      }

      _tokenRefreshSubscription = FirebaseMessaging.instance.onTokenRefresh.listen(
        (newToken) async {
          try {
            await _registerToken(newToken);
          } catch (e) {
            debugPrint('[PushTokenService] Token refresh registration failed: $e');
          }
        },
        onError: (error) {
          debugPrint('[PushTokenService] Token refresh stream error: $error');
        },
      );

      debugPrint('[PushTokenService] Initialized (token=${token != null ? '${token.substring(0, 8)}...' : 'null'})');
    } catch (e) {
      debugPrint('[PushTokenService] Initialization failed: $e');
    }
  }

  /// Register a token with the backend.
  Future<void> _registerToken(String token) async {
    try {
      final platform = Platform.isIOS ? 'ios' : 'android';
      await GatewayClient.instance.registerPushToken(
        token: token,
        platform: platform,
      );
      _currentToken = token;
      debugPrint('[PushTokenService] Token registered ($platform)');
    } catch (e) {
      debugPrint('[PushTokenService] Token registration failed: $e');
      rethrow;
    }
  }

  /// Unregister the current push token from the backend.
  ///
  /// Call this on logout to stop receiving push notifications for the user.
  Future<void> unregister() async {
    try {
      _tokenRefreshSubscription?.cancel();
      _tokenRefreshSubscription = null;

      if (_currentToken != null) {
        await GatewayClient.instance.unregisterPushToken(token: _currentToken!);
        debugPrint('[PushTokenService] Token unregistered');
        _currentToken = null;
      }
    } catch (e) {
      debugPrint('[PushTokenService] Unregister failed: $e');
    }
  }

  /// Clean up resources. Call on app disposal if needed.
  void dispose() {
    _tokenRefreshSubscription?.cancel();
    _tokenRefreshSubscription = null;
  }
}

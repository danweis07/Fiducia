import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../service_providers.dart';

/// Top-level background message handler for Firebase Cloud Messaging.
///
/// Must be a top-level or static function. Register this in main.dart via:
///   FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Minimal processing for background messages
  debugPrint('[Firebase] Background message: ${message.messageId}');
}

/// Firebase Cloud Messaging provider.
///
/// Uses `firebase_messaging` for push notification permission and token management.
/// Other messaging methods (in-app messages, user attributes, events) are stubs
/// since FCM is primarily a push transport layer.
class FirebaseMessagingProvider extends MessagingProvider {
  String? _storedToken;

  @override
  String get name => 'firebase';

  @override
  void init(Map<String, dynamic> config) {
    debugPrint('[Firebase] Messaging initialized');
  }

  @override
  void setUser({
    required String userId,
    String? email,
    String? firstName,
    String? lastName,
    String? phone,
  }) {
    // Firebase does not have a built-in user identity concept.
    // User association is typically done server-side via the FCM token.
    debugPrint('[Firebase] setUser: $userId (email=$email)');
  }

  @override
  void clearUser() {
    // FirebaseMessaging.instance.deleteToken()
    debugPrint('[Firebase] clearUser');
  }

  @override
  void setUserAttributes(Map<String, dynamic> attributes) {
    // Firebase does not support user attributes; use Analytics or a CRM provider.
    debugPrint('[Firebase] setUserAttributes (no-op): $attributes');
  }

  @override
  void logEvent(String event, {Map<String, dynamic>? properties}) {
    // Firebase Messaging does not track custom events; use Firebase Analytics instead.
    debugPrint('[Firebase] logEvent (no-op): "$event" ${properties ?? {}}');
  }

  @override
  Future<bool> requestPushPermission() async {
    try {
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      final granted = settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional;
      debugPrint('[Firebase] requestPushPermission: ${settings.authorizationStatus}');
      return granted;
    } catch (e) {
      debugPrint('[Firebase] requestPushPermission error: $e');
      return false;
    }
  }

  @override
  Future<bool> isPushEnabled() async {
    try {
      final settings = await FirebaseMessaging.instance.getNotificationSettings();
      final enabled = settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional;
      debugPrint('[Firebase] isPushEnabled: $enabled');
      return enabled;
    } catch (e) {
      debugPrint('[Firebase] isPushEnabled error: $e');
      return false;
    }
  }

  @override
  void registerPushToken(String token) {
    _storedToken = token;
    debugPrint('[Firebase] registerPushToken: ${token.substring(0, 8)}...');
  }

  @override
  void handlePushReceived(Map<String, dynamic> payload) {
    debugPrint('[Firebase] handlePushReceived: $payload');
  }

  @override
  Future<void> flush() async {
    // Firebase Messaging does not require manual flushing.
    debugPrint('[Firebase] flush (no-op)');
  }

  @override
  Future<({bool granted, bool canRequest})> getPushPermissionStatus() async {
    try {
      final settings = await FirebaseMessaging.instance.getNotificationSettings();
      final granted = settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional;
      final canRequest = settings.authorizationStatus == AuthorizationStatus.notDetermined;
      debugPrint('[Firebase] getPushPermissionStatus: granted=$granted, canRequest=$canRequest');
      return (granted: granted, canRequest: canRequest);
    } catch (e) {
      debugPrint('[Firebase] getPushPermissionStatus error: $e');
      return (granted: false, canRequest: true);
    }
  }

  @override
  void Function() onInAppMessage(void Function(Map<String, dynamic> message) callback) {
    // Firebase Messaging does not support in-app messages natively.
    // Use Firebase In-App Messaging (FIAM) as a separate package if needed.
    debugPrint('[Firebase] onInAppMessage (no-op — use Firebase In-App Messaging package)');
    return () {};
  }

  @override
  void Function() onPushOpened(void Function(Map<String, dynamic> payload) callback) {
    // FirebaseMessaging.onMessageOpenedApp.listen(callback)
    final subscription = FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      callback(message.data);
    });
    debugPrint('[Firebase] onPushOpened subscription registered');
    return () {
      subscription.cancel();
      debugPrint('[Firebase] onPushOpened subscription cancelled');
    };
  }
}

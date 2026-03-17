import 'package:flutter/foundation.dart';

import '../service_providers.dart';

/// Braze messaging provider stub.
///
/// All methods print debug messages matching the ConsoleMessagingProvider pattern.
/// When `braze_plugin` is added as a dependency, replace stubs with real SDK calls.
class BrazeMessagingProvider extends MessagingProvider {
  @override
  String get name => 'braze';

  @override
  void init(Map<String, dynamic> config) {
    // Braze.instance.configure(apiKey: config['apiKey'], endpoint: config['endpoint'])
    debugPrint('[Braze] Initialized with config: ${config.keys.toList()}');
  }

  @override
  void setUser({
    required String userId,
    String? email,
    String? firstName,
    String? lastName,
    String? phone,
  }) {
    // braze.changeUser(userId)
    // braze.getUser().setEmail(email)
    // braze.getUser().setFirstName(firstName)
    // braze.getUser().setLastName(lastName)
    // braze.getUser().setPhoneNumber(phone)
    debugPrint('[Braze] setUser: $userId (email=$email)');
  }

  @override
  void clearUser() {
    // braze.wipeData()
    debugPrint('[Braze] clearUser');
  }

  @override
  void setUserAttributes(Map<String, dynamic> attributes) {
    // attributes.forEach((k, v) => braze.getUser().setCustomUserAttribute(k, v))
    debugPrint('[Braze] setUserAttributes: $attributes');
  }

  @override
  void logEvent(String event, {Map<String, dynamic>? properties}) {
    // braze.logCustomEvent(event, properties: properties)
    debugPrint('[Braze] logEvent: "$event" ${properties ?? {}}');
  }

  @override
  Future<bool> requestPushPermission() async {
    // Push permission is handled at the OS level; Braze registers the token automatically.
    // braze.requestPushPermission()
    debugPrint('[Braze] requestPushPermission (stub: auto-granted)');
    return true;
  }

  @override
  Future<bool> isPushEnabled() async {
    // braze.isPushNotificationEnabled()
    debugPrint('[Braze] isPushEnabled (stub: false)');
    return false;
  }

  @override
  void registerPushToken(String token) {
    // braze.registerAndroidPushToken(token) or handled automatically on iOS
    debugPrint('[Braze] registerPushToken: ${token.substring(0, 8)}...');
  }

  @override
  void handlePushReceived(Map<String, dynamic> payload) {
    // braze.handlePushNotification(payload)
    debugPrint('[Braze] handlePushReceived: $payload');
  }

  @override
  Future<void> flush() async {
    // braze.requestImmediateDataFlush()
    debugPrint('[Braze] flush');
  }

  @override
  Future<({bool granted, bool canRequest})> getPushPermissionStatus() async {
    // braze.getPushPermissionStatus()
    debugPrint('[Braze] getPushPermissionStatus (stub)');
    return (granted: false, canRequest: true);
  }

  @override
  void Function() onInAppMessage(void Function(Map<String, dynamic> message) callback) {
    // braze.subscribeToInAppMessages((message) => callback(message.toJson()))
    debugPrint('[Braze] onInAppMessage subscription registered (stub)');
    return () {
      debugPrint('[Braze] onInAppMessage subscription cancelled');
    };
  }

  @override
  void Function() onPushOpened(void Function(Map<String, dynamic> payload) callback) {
    // braze.subscribeToPushNotificationEvents((event) => callback(event.toJson()))
    debugPrint('[Braze] onPushOpened subscription registered (stub)');
    return () {
      debugPrint('[Braze] onPushOpened subscription cancelled');
    };
  }
}

import 'package:flutter/foundation.dart';

import '../service_providers.dart';

/// Airship messaging provider stub.
///
/// All methods print debug messages matching the ConsoleMessagingProvider pattern.
/// When `airship_flutter` is added as a dependency, replace stubs with real SDK calls.
class AirshipMessagingProvider extends MessagingProvider {
  @override
  String get name => 'airship';

  @override
  void init(Map<String, dynamic> config) {
    // Airship.takeOff(AirshipConfig(appKey: config['appKey'], appSecret: config['appSecret']))
    debugPrint('[Airship] Initialized with config: ${config.keys.toList()}');
  }

  @override
  void setUser({
    required String userId,
    String? email,
    String? firstName,
    String? lastName,
    String? phone,
  }) {
    // Airship.contact.identify(userId)
    // Airship.contact.editAttributes()
    //   ..set('email', email)
    //   ..set('first_name', firstName)
    //   ..set('last_name', lastName)
    //   ..set('phone', phone)
    //   ..apply()
    debugPrint('[Airship] setUser: $userId (email=$email)');
  }

  @override
  void clearUser() {
    // Airship.contact.reset()
    debugPrint('[Airship] clearUser');
  }

  @override
  void setUserAttributes(Map<String, dynamic> attributes) {
    // final editor = Airship.contact.editAttributes();
    // attributes.forEach((k, v) => editor.set(k, v));
    // editor.apply();
    debugPrint('[Airship] setUserAttributes: $attributes');
  }

  @override
  void logEvent(String event, {Map<String, dynamic>? properties}) {
    // Airship.analytics.addCustomEvent(CustomEvent(event, properties: properties))
    debugPrint('[Airship] logEvent: "$event" ${properties ?? {}}');
  }

  @override
  Future<bool> requestPushPermission() async {
    // Airship.push.enableUserPushNotifications()
    debugPrint('[Airship] requestPushPermission (stub: auto-granted)');
    return true;
  }

  @override
  Future<bool> isPushEnabled() async {
    // Airship.push.isUserNotificationsEnabled
    debugPrint('[Airship] isPushEnabled (stub: false)');
    return false;
  }

  @override
  void registerPushToken(String token) {
    // Airship handles token registration internally; this is for manual override.
    // Airship.push.registrationToken
    debugPrint('[Airship] registerPushToken: ${token.substring(0, 8)}...');
  }

  @override
  void handlePushReceived(Map<String, dynamic> payload) {
    // Airship.push handles push receipt internally via event streams.
    // Airship.push.onPushReceived
    debugPrint('[Airship] handlePushReceived: $payload');
  }

  @override
  Future<void> flush() async {
    // Airship does not expose a manual flush; events are sent on the SDK's schedule.
    debugPrint('[Airship] flush (no-op — Airship flushes automatically)');
  }

  @override
  Future<({bool granted, bool canRequest})> getPushPermissionStatus() async {
    // Airship.push.getNotificationStatus()
    debugPrint('[Airship] getPushPermissionStatus (stub)');
    return (granted: false, canRequest: true);
  }

  @override
  void Function() onInAppMessage(void Function(Map<String, dynamic> message) callback) {
    // Airship.inApp.onDisplay.listen((event) => callback(event.toJson()))
    debugPrint('[Airship] onInAppMessage subscription registered (stub)');
    return () {
      debugPrint('[Airship] onInAppMessage subscription cancelled');
    };
  }

  @override
  void Function() onPushOpened(void Function(Map<String, dynamic> payload) callback) {
    // Airship.push.onNotificationResponse.listen((event) => callback(event.toJson()))
    debugPrint('[Airship] onPushOpened subscription registered (stub)');
    return () {
      debugPrint('[Airship] onPushOpened subscription cancelled');
    };
  }
}

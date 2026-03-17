/// Service Provider Abstractions for Mobile
///
/// Provides abstracted analytics, error tracking, and messaging interfaces.
/// Each defaults to a console/sandbox implementation when no SDK is configured.

// =============================================================================
// ANALYTICS PROVIDER
// =============================================================================

abstract class AnalyticsProvider {
  String get name;
  void init(Map<String, dynamic> config);
  void identify(String userId, {String? email, String? name, Map<String, dynamic>? properties});
  void track(String event, {Map<String, dynamic>? properties});
  void page(String name, {Map<String, dynamic>? properties});
  void setUserProperties(Map<String, dynamic> properties);
  void reset();
  void optOut();
  void optIn();
  void revenue(double amount, {Map<String, dynamic>? properties});
  void timeEvent(String event);
  Future<void> flush();
}

// =============================================================================
// ERROR TRACKING PROVIDER
// =============================================================================

abstract class ErrorTrackingProvider {
  String get name;
  void init(Map<String, dynamic> config);
  void captureException(dynamic error, {dynamic stackTrace, Map<String, dynamic>? context});
  void captureMessage(String message, {String level = 'info'});
  void setUser({String? id, String? email, String? username});
  void addBreadcrumb({String? category, String? message, String? level, Map<String, dynamic>? data});
  void setTag(String key, String value);
  Future<void> flush();
}

// =============================================================================
// MESSAGING PROVIDER
// =============================================================================

abstract class MessagingProvider {
  String get name;
  void init(Map<String, dynamic> config);
  void setUser({required String userId, String? email, String? firstName, String? lastName, String? phone});
  void clearUser();
  void setUserAttributes(Map<String, dynamic> attributes);
  void logEvent(String event, {Map<String, dynamic>? properties});
  Future<bool> requestPushPermission();
  Future<bool> isPushEnabled();
  void registerPushToken(String token);
  void handlePushReceived(Map<String, dynamic> payload);
  Future<void> flush();
  Future<({bool granted, bool canRequest})> getPushPermissionStatus();
  void Function() onInAppMessage(void Function(Map<String, dynamic> message) callback);
  void Function() onPushOpened(void Function(Map<String, dynamic> payload) callback);
}

// =============================================================================
// CONSOLE IMPLEMENTATIONS (SANDBOX)
// =============================================================================

class ConsoleAnalyticsProvider extends AnalyticsProvider {
  @override
  String get name => 'console';

  final _timers = <String, DateTime>{};

  @override
  void init(Map<String, dynamic> config) {
    print('[Analytics] Console analytics initialized (sandbox)');
  }

  @override
  void identify(String userId, {String? email, String? name, Map<String, dynamic>? properties}) {
    print('[Analytics] identify: $userId (email=$email)');
  }

  @override
  void track(String event, {Map<String, dynamic>? properties}) {
    final timer = _timers.remove(event);
    final duration = timer != null ? ' (${DateTime.now().difference(timer).inMilliseconds}ms)' : '';
    print('[Analytics] track: "$event"$duration ${properties ?? {}}');
  }

  @override
  void page(String name, {Map<String, dynamic>? properties}) {
    print('[Analytics] page: "$name" ${properties ?? {}}');
  }

  @override
  void setUserProperties(Map<String, dynamic> properties) {
    print('[Analytics] setUserProperties: $properties');
  }

  @override
  void reset() {
    print('[Analytics] reset');
    _timers.clear();
  }

  @override
  void optOut() => print('[Analytics] opted out');

  @override
  void optIn() => print('[Analytics] opted in');

  @override
  void revenue(double amount, {Map<String, dynamic>? properties}) {
    print('[Analytics] revenue: \$$amount ${properties ?? {}}');
  }

  @override
  void timeEvent(String event) {
    _timers[event] = DateTime.now();
  }

  @override
  Future<void> flush() async {}
}

class ConsoleErrorTrackingProvider extends ErrorTrackingProvider {
  @override
  String get name => 'console';

  @override
  void init(Map<String, dynamic> config) {
    print('[ErrorTracking] Console error tracking initialized (sandbox)');
  }

  @override
  void captureException(dynamic error, {dynamic stackTrace, Map<String, dynamic>? context}) {
    print('[ErrorTracking] Exception: $error');
    if (stackTrace != null) print('[ErrorTracking] Stack: $stackTrace');
  }

  @override
  void captureMessage(String message, {String level = 'info'}) {
    print('[ErrorTracking] [$level] $message');
  }

  @override
  void setUser({String? id, String? email, String? username}) {
    print('[ErrorTracking] setUser: id=$id email=$email');
  }

  @override
  void addBreadcrumb({String? category, String? message, String? level, Map<String, dynamic>? data}) {
    print('[ErrorTracking] breadcrumb: [$category] $message');
  }

  @override
  void setTag(String key, String value) {}

  @override
  Future<void> flush() async {}
}

class ConsoleMessagingProvider extends MessagingProvider {
  @override
  String get name => 'console';

  @override
  void init(Map<String, dynamic> config) {
    print('[Messaging] Console messaging initialized (sandbox)');
  }

  @override
  void setUser({required String userId, String? email, String? firstName, String? lastName, String? phone}) {
    print('[Messaging] setUser: $userId (email=$email)');
  }

  @override
  void clearUser() => print('[Messaging] clearUser');

  @override
  void setUserAttributes(Map<String, dynamic> attributes) {
    print('[Messaging] setUserAttributes: $attributes');
  }

  @override
  void logEvent(String event, {Map<String, dynamic>? properties}) {
    print('[Messaging] logEvent: "$event" ${properties ?? {}}');
  }

  @override
  Future<bool> requestPushPermission() async {
    print('[Messaging] requestPushPermission (sandbox: auto-granted)');
    return true;
  }

  @override
  Future<bool> isPushEnabled() async => false;

  @override
  void registerPushToken(String token) {
    print('[Messaging] registerPushToken: ${token.substring(0, 8)}...');
  }

  @override
  void handlePushReceived(Map<String, dynamic> payload) {
    print('[Messaging] handlePushReceived: $payload');
  }

  @override
  Future<void> flush() async {}

  @override
  Future<({bool granted, bool canRequest})> getPushPermissionStatus() async => (granted: false, canRequest: true);
  @override
  void Function() onInAppMessage(void Function(Map<String, dynamic> message) callback) => () {};
  @override
  void Function() onPushOpened(void Function(Map<String, dynamic> payload) callback) => () {};
}

// =============================================================================
// SERVICE REGISTRY
// =============================================================================

class ServiceProviders {
  static ServiceProviders? _instance;

  late AnalyticsProvider analytics;
  late ErrorTrackingProvider errorTracking;
  late MessagingProvider messaging;

  ServiceProviders._() {
    analytics = ConsoleAnalyticsProvider();
    errorTracking = ConsoleErrorTrackingProvider();
    messaging = ConsoleMessagingProvider();
  }

  static ServiceProviders get instance {
    _instance ??= ServiceProviders._();
    return _instance!;
  }

  /// Initialize all service providers based on config.
  /// Call from main.dart after WidgetsFlutterBinding.ensureInitialized().
  void init({
    AnalyticsProvider? analyticsProvider,
    ErrorTrackingProvider? errorTrackingProvider,
    MessagingProvider? messagingProvider,
  }) {
    if (analyticsProvider != null) analytics = analyticsProvider;
    if (errorTrackingProvider != null) errorTracking = errorTrackingProvider;
    if (messagingProvider != null) messaging = messagingProvider;

    analytics.init({});
    errorTracking.init({});
    messaging.init({});
  }
}

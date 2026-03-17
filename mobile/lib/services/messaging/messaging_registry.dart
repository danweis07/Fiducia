import '../service_providers.dart';
import 'airship_provider.dart';
import 'braze_provider.dart';
import 'firebase_provider.dart';

/// Registry for messaging providers.
///
/// Reads the `MESSAGING_PROVIDER` compile-time environment variable
/// (passed via `--dart-define=MESSAGING_PROVIDER=braze`) and returns
/// the corresponding provider instance.
///
/// Mirrors the web platform's `src/lib/services/messaging/index.ts` registry.
///
/// Supported values:
///   - `braze`    → [BrazeMessagingProvider]
///   - `airship`  → [AirshipMessagingProvider]
///   - `firebase` → [FirebaseMessagingProvider]
///   - (default)  → [ConsoleMessagingProvider]
class MessagingRegistry {
  MessagingRegistry._();

  /// The compile-time messaging provider key.
  static const _providerKey = String.fromEnvironment(
    'MESSAGING_PROVIDER',
    defaultValue: '',
  );

  /// Creates and returns the configured [MessagingProvider].
  ///
  /// Call this during app initialization and pass the result to
  /// `ServiceProviders.instance.init(messagingProvider: ...)`.
  static MessagingProvider create() {
    switch (_providerKey.toLowerCase()) {
      case 'braze':
        return BrazeMessagingProvider();
      case 'airship':
        return AirshipMessagingProvider();
      case 'firebase':
        return FirebaseMessagingProvider();
      default:
        return ConsoleMessagingProvider();
    }
  }
}

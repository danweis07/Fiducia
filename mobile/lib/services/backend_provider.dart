/// Abstract backend provider interface.
///
/// Mirrors the web app's src/lib/backend/ abstraction pattern.
/// Allows swapping between Supabase, REST, or other backends
/// without changing the gateway client or UI code.
abstract class BackendProvider {
  /// Human-readable name for this provider (e.g. 'supabase', 'rest').
  String get name;

  /// Invoke the gateway edge function (or equivalent REST endpoint).
  ///
  /// [action] is the dot-separated action name (e.g. 'accounts.list').
  /// [params] is an optional map of parameters for the action.
  /// Returns the parsed response data map.
  Future<Map<String, dynamic>> invokeGateway(
    String action, [
    Map<String, dynamic> params = const {},
  ]);

  /// Authenticate with email and password.
  Future<AuthResult> signInWithPassword(String email, String password);

  /// Sign the current user out.
  Future<void> signOut();

  /// Check whether the user has a valid authenticated session.
  Future<bool> isAuthenticated();
}

/// Result of an authentication attempt.
class AuthResult {
  final String? userId;
  final String? email;
  final String? error;

  AuthResult({this.userId, this.email, this.error});

  bool get isSuccess => error == null && userId != null;
}

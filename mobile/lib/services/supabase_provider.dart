import 'package:supabase_flutter/supabase_flutter.dart';

import 'backend_provider.dart';

/// Supabase implementation of [BackendProvider].
///
/// Uses Supabase Edge Functions for gateway calls and Supabase Auth
/// for authentication. Mirrors the patterns in gateway_client.dart
/// and auth_screen.dart.
class SupabaseProvider extends BackendProvider {
  @override
  String get name => 'supabase';

  SupabaseClient get _client => Supabase.instance.client;

  @override
  Future<Map<String, dynamic>> invokeGateway(
    String action, [
    Map<String, dynamic> params = const {},
  ]) async {
    final response = await _client.functions.invoke(
      'gateway',
      body: {'action': action, 'params': params},
    );

    final data = response.data as Map<String, dynamic>;
    if (data['error'] != null) {
      final error = data['error'] as Map<String, dynamic>;
      throw BackendException(
        code: error['code'] as String,
        message: error['message'] as String,
      );
    }

    return data['data'] as Map<String, dynamic>;
  }

  @override
  Future<AuthResult> signInWithPassword(String email, String password) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      return AuthResult(
        userId: response.user?.id,
        email: response.user?.email,
      );
    } on AuthException catch (e) {
      return AuthResult(error: e.message);
    } catch (e) {
      return AuthResult(error: 'An unexpected error occurred.');
    }
  }

  @override
  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  @override
  Future<bool> isAuthenticated() async {
    return _client.auth.currentSession != null;
  }
}

/// Exception thrown when a gateway call returns an error.
class BackendException implements Exception {
  final String code;
  final String message;

  const BackendException({required this.code, required this.message});

  @override
  String toString() => 'BackendException($code): $message';
}

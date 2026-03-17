import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'backend_provider.dart';
import 'supabase_provider.dart' show BackendException;

/// Generic REST implementation of [BackendProvider].
///
/// Posts to a configurable base URL + /api/gateway for gateway calls.
/// JWT token is stored in flutter_secure_storage.
class RestProvider extends BackendProvider {
  static const _tokenKey = 'rest_provider_jwt';

  final String baseUrl;
  final Dio _dio;
  final FlutterSecureStorage _secureStorage;

  RestProvider({
    required this.baseUrl,
    Dio? dio,
    FlutterSecureStorage? secureStorage,
  })  : _dio = dio ?? Dio(),
        _secureStorage = secureStorage ?? const FlutterSecureStorage() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 15);
    _dio.options.receiveTimeout = const Duration(seconds: 30);
    _dio.options.headers['Content-Type'] = 'application/json';

    // Attach JWT to every request if available.
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _secureStorage.read(key: _tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  @override
  String get name => 'rest';

  @override
  Future<Map<String, dynamic>> invokeGateway(
    String action, [
    Map<String, dynamic> params = const {},
  ]) async {
    // TODO: Adjust the endpoint path to match your REST backend's gateway route.
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/gateway',
      data: {'action': action, 'params': params},
    );

    final data = response.data!;
    if (data['error'] != null) {
      final error = data['error'] as Map<String, dynamic>;
      throw BackendException(
        code: error['code'] as String? ?? 'UNKNOWN',
        message: error['message'] as String? ?? 'Unknown error',
      );
    }

    return data['data'] as Map<String, dynamic>;
  }

  @override
  Future<AuthResult> signInWithPassword(String email, String password) async {
    try {
      // TODO: Adjust the endpoint path to match your REST backend's auth route.
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/auth/sign-in',
        data: {'email': email, 'password': password},
      );

      final data = response.data!;

      if (data['error'] != null) {
        return AuthResult(error: data['error'] as String);
      }

      final token = data['token'] as String?;
      if (token != null) {
        await _secureStorage.write(key: _tokenKey, value: token);
      }

      return AuthResult(
        userId: data['userId'] as String?,
        email: data['email'] as String?,
      );
    } on DioException catch (e) {
      return AuthResult(
        error: e.response?.data?['message'] as String? ??
            'Authentication failed.',
      );
    } catch (e) {
      return AuthResult(error: 'An unexpected error occurred.');
    }
  }

  @override
  Future<void> signOut() async {
    // TODO: Call a server-side logout endpoint if your backend requires it.
    await _secureStorage.delete(key: _tokenKey);
  }

  @override
  Future<bool> isAuthenticated() async {
    final token = await _secureStorage.read(key: _tokenKey);
    if (token == null) return false;

    // TODO: Optionally validate token expiry or call a /api/auth/me endpoint.
    return true;
  }
}

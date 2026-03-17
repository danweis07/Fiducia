import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Biometric authentication service.
/// Wraps local_auth for fingerprint/face unlock on login.
class BiometricService {
  static final BiometricService _instance = BiometricService._();
  static BiometricService get instance => _instance;

  BiometricService._();

  final _auth = LocalAuthentication();
  final _storage = const FlutterSecureStorage();

  static const _kBiometricEnabled = 'biometric_enabled';
  static const _kBiometricToken = 'biometric_refresh_token';

  /// Check if device supports biometrics.
  Future<bool> get isAvailable async {
    try {
      final canCheck = await _auth.canCheckBiometrics;
      final isSupported = await _auth.isDeviceSupported();
      return canCheck && isSupported;
    } on PlatformException {
      return false;
    }
  }

  /// Get available biometric types (fingerprint, face, iris).
  Future<List<BiometricType>> get availableTypes async {
    try {
      return await _auth.getAvailableBiometrics();
    } on PlatformException {
      return [];
    }
  }

  /// Check if user has opted into biometric login.
  Future<bool> get isEnabled async {
    final value = await _storage.read(key: _kBiometricEnabled);
    return value == 'true';
  }

  /// Enable biometric login and store the refresh token securely.
  Future<void> enable(String refreshToken) async {
    await _storage.write(key: _kBiometricEnabled, value: 'true');
    await _storage.write(key: _kBiometricToken, value: refreshToken);
  }

  /// Disable biometric login and clear stored credentials.
  Future<void> disable() async {
    await _storage.delete(key: _kBiometricEnabled);
    await _storage.delete(key: _kBiometricToken);
  }

  /// Prompt user for biometric authentication.
  /// Returns true if authentication succeeded.
  Future<bool> authenticate({String reason = 'Verify your identity to sign in'}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
    } on PlatformException {
      return false;
    }
  }

  /// Attempt biometric login: authenticate then return the stored refresh token.
  /// Returns null if biometrics are not enabled or authentication fails.
  Future<String?> authenticateAndGetToken() async {
    final enabled = await isEnabled;
    if (!enabled) return null;

    final success = await authenticate();
    if (!success) return null;

    return _storage.read(key: _kBiometricToken);
  }
}

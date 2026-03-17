import 'package:flutter/material.dart';
import '../services/biometric_service.dart';

/// Biometric authentication prompt — triggers fingerprint/face unlock.
/// Used on login screen and for sensitive operations (transfers, card changes).
class BiometricPrompt extends StatefulWidget {
  final String reason;
  final VoidCallback onSuccess;
  final VoidCallback? onCancel;
  final VoidCallback? onFallback;

  const BiometricPrompt({
    super.key,
    this.reason = 'Verify your identity',
    required this.onSuccess,
    this.onCancel,
    this.onFallback,
  });

  @override
  State<BiometricPrompt> createState() => _BiometricPromptState();
}

class _BiometricPromptState extends State<BiometricPrompt> {
  bool _isAuthenticating = false;
  bool _isAvailable = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _checkAvailability();
  }

  Future<void> _checkAvailability() async {
    final available = await BiometricService.instance.isAvailable;
    if (mounted) {
      setState(() => _isAvailable = available);
      if (available) {
        _authenticate();
      }
    }
  }

  Future<void> _authenticate() async {
    setState(() {
      _isAuthenticating = true;
      _error = null;
    });

    try {
      final success = await BiometricService.instance.authenticate(
        reason: widget.reason,
      );
      if (!mounted) return;

      if (success) {
        widget.onSuccess();
      } else {
        setState(() {
          _isAuthenticating = false;
          _error = 'Authentication failed. Please try again.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isAuthenticating = false;
          _error = 'Biometric authentication is not available.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!_isAvailable) {
      return const SizedBox.shrink();
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: _isAuthenticating ? null : _authenticate,
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withAlpha(20),
              shape: BoxShape.circle,
            ),
            child: _isAuthenticating
                ? SizedBox(
                    width: 32,
                    height: 32,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: theme.colorScheme.primary,
                    ),
                  )
                : Icon(
                    Icons.fingerprint,
                    size: 40,
                    color: theme.colorScheme.primary,
                  ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          _isAuthenticating ? 'Verifying...' : 'Tap to authenticate',
          style: theme.textTheme.bodySmall?.copyWith(
            color: Colors.grey.shade600,
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(
            _error!,
            style: TextStyle(fontSize: 12, color: Colors.red.shade600),
            textAlign: TextAlign.center,
          ),
        ],
        if (widget.onFallback != null) ...[
          const SizedBox(height: 12),
          TextButton(
            onPressed: widget.onFallback,
            child: const Text('Use password instead'),
          ),
        ],
      ],
    );
  }
}

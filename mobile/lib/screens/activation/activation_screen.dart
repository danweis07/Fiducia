import 'package:flutter/material.dart';
import '../../services/gateway_client.dart';

/// Digital activation / onboarding wizard — mirrors web DigitalActivation.tsx.
/// Steps: Identity Verification -> Terms -> Credentials -> MFA -> Device -> Complete
class ActivationScreen extends StatefulWidget {
  const ActivationScreen({super.key});

  @override
  State<ActivationScreen> createState() => _ActivationScreenState();
}

class _ActivationScreenState extends State<ActivationScreen> {
  int _currentStep = 0;
  bool _isLoading = false;
  String? _error;

  // Identity verification fields
  final _ssnController = TextEditingController();
  final _dobController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _memberNumberController = TextEditingController();

  // Credentials fields
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;

  // MFA
  String _selectedMfaMethod = 'sms';
  final _mfaCodeController = TextEditingController();
  bool _mfaEnrolled = false;

  // Terms
  bool _termsAccepted = false;

  // Device registration
  bool _deviceRegistered = false;

  static const _steps = [
    _StepMeta(icon: Icons.person_outline, label: 'Identity Verification'),
    _StepMeta(icon: Icons.description_outlined, label: 'Terms & Disclosures'),
    _StepMeta(icon: Icons.lock_outline, label: 'Create Credentials'),
    _StepMeta(icon: Icons.shield_outlined, label: 'Multi-Factor Auth'),
    _StepMeta(icon: Icons.smartphone, label: 'Device Registration'),
    _StepMeta(icon: Icons.check_circle_outline, label: 'Complete'),
  ];

  @override
  void dispose() {
    _ssnController.dispose();
    _dobController.dispose();
    _lastNameController.dispose();
    _memberNumberController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _mfaCodeController.dispose();
    super.dispose();
  }

  void _nextStep() {
    if (_currentStep < _steps.length - 1) {
      setState(() {
        _currentStep++;
        _error = null;
      });
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
        _error = null;
      });
    }
  }

  Future<void> _verifyIdentity() async {
    if (_ssnController.text.isEmpty || _dobController.text.isEmpty || _lastNameController.text.isEmpty) {
      setState(() => _error = 'Please fill in all required fields.');
      return;
    }
    setState(() { _isLoading = true; _error = null; });
    try {
      // In production this calls gateway activation.verifyIdentity
      await Future.delayed(const Duration(seconds: 1)); // Demo
      _nextStep();
    } catch (e) {
      setState(() => _error = 'Identity verification failed. Please check your information.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _acceptTerms() async {
    if (!_termsAccepted) {
      setState(() => _error = 'You must accept the terms to continue.');
      return;
    }
    setState(() { _isLoading = true; _error = null; });
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      _nextStep();
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _createCredentials() async {
    if (_usernameController.text.length < 6) {
      setState(() => _error = 'Username must be at least 6 characters.');
      return;
    }
    if (_passwordController.text.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters.');
      return;
    }
    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }
    setState(() { _isLoading = true; _error = null; });
    try {
      await Future.delayed(const Duration(seconds: 1));
      _nextStep();
    } catch (e) {
      setState(() => _error = 'Failed to create credentials.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _enrollMfa() async {
    if (!_mfaEnrolled) {
      setState(() { _isLoading = true; _error = null; });
      try {
        await Future.delayed(const Duration(seconds: 1));
        setState(() => _mfaEnrolled = true);
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
      return;
    }
    // Verify MFA code
    if (_mfaCodeController.text.length != 6) {
      setState(() => _error = 'Please enter the 6-digit verification code.');
      return;
    }
    setState(() { _isLoading = true; _error = null; });
    try {
      await Future.delayed(const Duration(seconds: 1));
      _nextStep();
    } catch (e) {
      setState(() => _error = 'Invalid verification code.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _registerDevice() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      await Future.delayed(const Duration(seconds: 1));
      setState(() => _deviceRegistered = true);
      _nextStep();
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = (_currentStep + 1) / _steps.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account Activation'),
        leading: _currentStep > 0 && _currentStep < _steps.length - 1
            ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: _prevStep)
            : null,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Progress bar
            LinearProgressIndicator(value: progress, minHeight: 4),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              child: Row(
                children: [
                  Icon(_steps[_currentStep].icon, size: 20, color: theme.colorScheme.primary),
                  const SizedBox(width: 8),
                  Text(
                    _steps[_currentStep].label,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const Spacer(),
                  Text(
                    'Step ${_currentStep + 1} of ${_steps.length}',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Step content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: _buildStepContent(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0: return _buildIdentityStep();
      case 1: return _buildTermsStep();
      case 2: return _buildCredentialsStep();
      case 3: return _buildMfaStep();
      case 4: return _buildDeviceStep();
      case 5: return _buildCompleteStep();
      default: return const SizedBox.shrink();
    }
  }

  Widget _buildIdentityStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Verify your identity to activate digital banking access.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _lastNameController,
          decoration: const InputDecoration(
            labelText: 'Last Name',
            prefixIcon: Icon(Icons.person_outline),
          ),
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _ssnController,
          decoration: const InputDecoration(
            labelText: 'Last 4 of SSN',
            prefixIcon: Icon(Icons.badge_outlined),
            counterText: '',
          ),
          keyboardType: TextInputType.number,
          maxLength: 4,
          obscureText: true,
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _dobController,
          decoration: const InputDecoration(
            labelText: 'Date of Birth (MM/DD/YYYY)',
            prefixIcon: Icon(Icons.cake_outlined),
          ),
          keyboardType: TextInputType.datetime,
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _memberNumberController,
          decoration: const InputDecoration(
            labelText: 'Member Number (optional)',
            prefixIcon: Icon(Icons.numbers),
          ),
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.done,
        ),
        if (_error != null) ...[
          const SizedBox(height: 16),
          _ErrorBanner(message: _error!),
        ],
        const SizedBox(height: 24),
        _ActionButton(label: 'Verify Identity', isLoading: _isLoading, onPressed: _verifyIdentity),
      ],
    );
  }

  Widget _buildTermsStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Please review and accept the following terms and disclosures.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Electronic Banking Agreement', style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 8),
                Text(
                  'By enrolling in Digital Banking, you agree to receive electronic statements, '
                  'disclosures, and communications. You may revoke consent at any time by '
                  'contacting member services.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Privacy Policy', style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 8),
                Text(
                  'We are committed to protecting your personal information. '
                  'Your data is encrypted and stored securely in compliance with federal regulations.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        CheckboxListTile(
          value: _termsAccepted,
          onChanged: (v) => setState(() => _termsAccepted = v ?? false),
          title: const Text('I have read and accept the terms and disclosures', style: TextStyle(fontSize: 14)),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
        ),
        if (_error != null) ...[
          const SizedBox(height: 16),
          _ErrorBanner(message: _error!),
        ],
        const SizedBox(height: 24),
        _ActionButton(label: 'Accept & Continue', isLoading: _isLoading, onPressed: _acceptTerms),
      ],
    );
  }

  Widget _buildCredentialsStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Create your login credentials for digital banking access.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _usernameController,
          decoration: const InputDecoration(
            labelText: 'Username',
            prefixIcon: Icon(Icons.person_outline),
            helperText: 'At least 6 characters',
          ),
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          decoration: InputDecoration(
            labelText: 'Password',
            prefixIcon: const Icon(Icons.lock_outline),
            helperText: 'At least 8 characters',
            suffixIcon: IconButton(
              icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _confirmPasswordController,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Confirm Password',
            prefixIcon: Icon(Icons.lock_outline),
          ),
          textInputAction: TextInputAction.done,
        ),
        if (_error != null) ...[
          const SizedBox(height: 16),
          _ErrorBanner(message: _error!),
        ],
        const SizedBox(height: 24),
        _ActionButton(label: 'Create Credentials', isLoading: _isLoading, onPressed: _createCredentials),
      ],
    );
  }

  Widget _buildMfaStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Enhance your account security with multi-factor authentication.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 24),
        if (!_mfaEnrolled) ...[
          Text('Choose your verification method:', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 12),
          RadioListTile<String>(
            value: 'sms',
            groupValue: _selectedMfaMethod,
            onChanged: (v) => setState(() => _selectedMfaMethod = v!),
            title: const Text('SMS Text Message'),
            subtitle: const Text('Receive a code via text message'),
            secondary: const Icon(Icons.sms_outlined),
          ),
          RadioListTile<String>(
            value: 'email',
            groupValue: _selectedMfaMethod,
            onChanged: (v) => setState(() => _selectedMfaMethod = v!),
            title: const Text('Email'),
            subtitle: const Text('Receive a code via email'),
            secondary: const Icon(Icons.email_outlined),
          ),
          RadioListTile<String>(
            value: 'authenticator',
            groupValue: _selectedMfaMethod,
            onChanged: (v) => setState(() => _selectedMfaMethod = v!),
            title: const Text('Authenticator App'),
            subtitle: const Text('Use Google Authenticator or similar'),
            secondary: const Icon(Icons.security_outlined),
          ),
        ] else ...[
          Card(
            color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 12),
                  const Expanded(child: Text('Verification code sent. Check your device.')),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _mfaCodeController,
            decoration: const InputDecoration(
              labelText: 'Verification Code',
              prefixIcon: Icon(Icons.pin_outlined),
              counterText: '',
            ),
            keyboardType: TextInputType.number,
            maxLength: 6,
            textInputAction: TextInputAction.done,
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 16),
          _ErrorBanner(message: _error!),
        ],
        const SizedBox(height: 24),
        _ActionButton(
          label: _mfaEnrolled ? 'Verify Code' : 'Send Verification Code',
          isLoading: _isLoading,
          onPressed: _enrollMfa,
        ),
      ],
    );
  }

  Widget _buildDeviceStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Register this device as a trusted device for faster future logins.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Icon(Icons.smartphone, size: 48, color: Theme.of(context).colorScheme.primary),
                const SizedBox(height: 12),
                Text('Trust This Device', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Text(
                  'Registering this device means you won\'t need to verify with MFA every time you sign in.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        _ActionButton(label: 'Register Device', isLoading: _isLoading, onPressed: _registerDevice),
        const SizedBox(height: 12),
        Center(
          child: TextButton(
            onPressed: _nextStep,
            child: const Text('Skip for now'),
          ),
        ),
      ],
    );
  }

  Widget _buildCompleteStep() {
    return Column(
      children: [
        const SizedBox(height: 32),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.green.shade50,
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.check_circle, size: 64, color: Colors.green.shade600),
        ),
        const SizedBox(height: 24),
        Text(
          'You\'re All Set!',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Text(
          'Your digital banking account has been activated successfully. '
          'You can now sign in and manage your accounts.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton.icon(
            onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
            icon: const Icon(Icons.login),
            label: const Text('Sign In'),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER WIDGETS
// ─────────────────────────────────────────────────────────────────────────────

class _StepMeta {
  final IconData icon;
  final String label;
  const _StepMeta({required this.icon, required this.label});
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: Theme.of(context).colorScheme.error, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final bool isLoading;
  final VoidCallback onPressed;

  const _ActionButton({required this.label, required this.isLoading, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        child: isLoading
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : Text(label),
      ),
    );
  }
}

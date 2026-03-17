import 'package:flutter/material.dart';
import '../../models/banking.dart';
import '../../services/gateway_client.dart';

/// Card Provisioning screen — add card to Apple Pay / Google Pay.
class CardProvisioningScreen extends StatefulWidget {
  final String cardId;

  const CardProvisioningScreen({super.key, required this.cardId});

  @override
  State<CardProvisioningScreen> createState() => _CardProvisioningScreenState();
}

class _CardProvisioningScreenState extends State<CardProvisioningScreen> {
  Map<String, dynamic> _config = {};
  bool _isLoading = true;
  String? _error;

  String? _checkingWallet;
  bool _isCheckingEligibility = false;
  Map<String, dynamic>? _eligibility;

  String? _provisioningWallet;
  bool _isProvisioning = false;
  String? _provisioningStatus;
  String? _provisioningId;

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  Future<void> _loadConfig() async {
    setState(() => _isLoading = true);
    try {
      final config = await GatewayClient.instance.getProvisioningConfig();
      if (mounted) setState(() { _config = config; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _isLoading = false; _error = e.toString(); });
    }
  }

  List<String> get _supportedWallets {
    final wallets = _config['supportedWallets'];
    if (wallets is List) return wallets.cast<String>();
    return [];
  }

  bool get _isEnabled => _config['enabled'] == true;

  Future<void> _checkAndProvision(String walletProvider) async {
    // Step 1: Check eligibility
    setState(() {
      _checkingWallet = walletProvider;
      _isCheckingEligibility = true;
      _eligibility = null;
      _provisioningStatus = null;
      _provisioningId = null;
      _provisioningWallet = null;
      _error = null;
    });

    try {
      final eligibility = await GatewayClient.instance.checkProvisioningEligibility(
        cardId: widget.cardId,
        walletProvider: walletProvider,
      );
      if (!mounted) return;

      setState(() {
        _eligibility = eligibility;
        _isCheckingEligibility = false;
        _checkingWallet = null;
      });

      final isEligible = eligibility['eligible'] == true;
      if (!isEligible) {
        setState(() {
          _error = eligibility['reason'] as String? ?? 'Card is not eligible for this wallet';
        });
        return;
      }

      // Step 2: Initiate provisioning
      setState(() {
        _provisioningWallet = walletProvider;
        _isProvisioning = true;
        _provisioningStatus = 'Initiating...';
      });

      final result = await GatewayClient.instance.initiateProvisioning(
        cardId: widget.cardId,
        walletProvider: walletProvider,
      );
      if (!mounted) return;

      setState(() {
        _isProvisioning = false;
        _provisioningId = result['provisioningId'] as String?;
        _provisioningStatus = result['status'] as String? ?? 'initiated';
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${_walletLabel(walletProvider)} provisioning initiated')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCheckingEligibility = false;
          _isProvisioning = false;
          _checkingWallet = null;
          _provisioningWallet = null;
          _error = e.toString();
        });
      }
    }
  }

  String _walletLabel(String wallet) {
    switch (wallet) {
      case 'apple_pay': return 'Apple Pay';
      case 'google_pay': return 'Google Pay';
      default: return wallet;
    }
  }

  IconData _walletIcon(String wallet) {
    switch (wallet) {
      case 'apple_pay': return Icons.apple;
      case 'google_pay': return Icons.g_mobiledata;
      default: return Icons.wallet;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add to Wallet')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : !_isEnabled
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.wallet, size: 48, color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        Text(
                          'Digital wallet provisioning is not available',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Header
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            const Icon(Icons.wallet, size: 48, color: Colors.blueAccent),
                            const SizedBox(height: 12),
                            const Text(
                              'Add to Digital Wallet',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Add your card to a digital wallet for contactless payments.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Wallet buttons
                    ..._supportedWallets.map((wallet) {
                      final isChecking = _checkingWallet == wallet && _isCheckingEligibility;
                      final isProvisioningThis = _provisioningWallet == wallet && _isProvisioning;
                      final isCompleted = _provisioningWallet == wallet &&
                          _provisioningStatus != null &&
                          !_isProvisioning;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Card(
                          child: InkWell(
                            onTap: isChecking || isProvisioningThis
                                ? null
                                : () => _checkAndProvision(wallet),
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Row(
                                children: [
                                  Icon(
                                    _walletIcon(wallet),
                                    size: 36,
                                    color: isCompleted ? Colors.green : Colors.blueAccent,
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _walletLabel(wallet),
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        if (isChecking)
                                          Text(
                                            'Checking eligibility...',
                                            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                                          )
                                        else if (isProvisioningThis)
                                          Text(
                                            _provisioningStatus ?? 'Processing...',
                                            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                                          )
                                        else if (isCompleted)
                                          Text(
                                            'Status: ${_provisioningStatus ?? 'initiated'}',
                                            style: const TextStyle(fontSize: 13, color: Colors.green),
                                          )
                                        else
                                          Text(
                                            'Tap to add to ${_walletLabel(wallet)}',
                                            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                                          ),
                                      ],
                                    ),
                                  ),
                                  if (isChecking || isProvisioningThis)
                                    const SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  else if (isCompleted)
                                    const Icon(Icons.check_circle, color: Colors.green)
                                  else
                                    const Icon(Icons.chevron_right, color: Colors.grey),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }),

                    // Error
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Card(
                        color: Colors.red.shade50,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Icon(Icons.error_outline, color: Colors.red.shade700),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  _error!,
                                  style: TextStyle(color: Colors.red.shade700, fontSize: 14),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],

                    // Provisioning ID
                    if (_provisioningId != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        'Provisioning ID: $_provisioningId',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],

                    const SizedBox(height: 80),
                  ],
                ),
    );
  }
}

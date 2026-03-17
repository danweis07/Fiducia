import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/banking.dart';
import '../../services/gateway_client.dart';
import '../../utils/currency.dart';

/// RDC Deposit screen — mirrors web Deposit.tsx
/// 4-step wizard: front image, back image, amount, account selection.
class DepositScreen extends StatefulWidget {
  const DepositScreen({super.key});

  @override
  State<DepositScreen> createState() => _DepositScreenState();
}

class _DepositScreenState extends State<DepositScreen> {
  int _step = 0; // 0=front, 1=back, 2=amount, 3=account, 4=success
  String? _frontImageBase64;
  String? _backImageBase64;
  File? _frontImageFile;
  File? _backImageFile;
  final _amountController = TextEditingController();
  List<Account> _accounts = [];
  String? _selectedAccountId;
  bool _isSubmitting = false;
  String? _depositId;
  final _picker = ImagePicker();

  // History
  List<RDCDeposit> _history = [];
  bool _showHistory = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final accounts = await GatewayClient.instance.getAccounts();
    final history = await GatewayClient.instance.getDepositHistory();
    if (mounted) {
      setState(() {
        _accounts = accounts.where((a) => a.type != 'cd' && a.status == 'active').toList();
        _selectedAccountId = _accounts.isNotEmpty ? _accounts.first.id : null;
        _history = history;
      });
    }
  }

  Future<void> _captureImage(bool isFront) async {
    final source = await showDialog<ImageSource>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Capture ${isFront ? 'Front' : 'Back'} of Check'),
        content: const Text('Choose image source'),
        actions: [
          TextButton.icon(
            onPressed: () => Navigator.pop(ctx, ImageSource.camera),
            icon: const Icon(Icons.camera_alt),
            label: const Text('Camera'),
          ),
          TextButton.icon(
            onPressed: () => Navigator.pop(ctx, ImageSource.gallery),
            icon: const Icon(Icons.photo_library),
            label: const Text('Gallery'),
          ),
        ],
      ),
    );

    if (source == null) return;

    try {
      final picked = await _picker.pickImage(source: source, maxWidth: 1920, imageQuality: 85);
      if (picked != null) {
        final bytes = await picked.readAsBytes();
        final base64Str = base64Encode(bytes);
        setState(() {
          if (isFront) {
            _frontImageBase64 = base64Str;
            _frontImageFile = File(picked.path);
          } else {
            _backImageBase64 = base64Str;
            _backImageFile = File(picked.path);
          }
        });
      }
    } catch (_) {
      // Camera/gallery not available in demo — use placeholder
      setState(() {
        if (isFront) {
          _frontImageBase64 = 'demo-front-image';
          _frontImageFile = null;
        } else {
          _backImageBase64 = 'demo-back-image';
          _backImageFile = null;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (_selectedAccountId == null || _frontImageBase64 == null || _backImageBase64 == null) return;
    final cents = parseToCents(_amountController.text);
    if (cents <= 0) return;

    setState(() => _isSubmitting = true);
    try {
      final deposit = await GatewayClient.instance.submitDeposit(
        accountId: _selectedAccountId!,
        amountCents: cents,
        frontImageBase64: _frontImageBase64!,
        backImageBase64: _backImageBase64!,
      );
      if (mounted) setState(() { _depositId = deposit.id; _step = 4; _isSubmitting = false; });
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Deposit failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Deposit Check'),
        actions: [
          TextButton.icon(
            onPressed: () => setState(() => _showHistory = !_showHistory),
            icon: Icon(_showHistory ? Icons.add_a_photo : Icons.history),
            label: Text(_showHistory ? 'New' : 'History'),
          ),
        ],
      ),
      body: _showHistory ? _buildHistory(theme) : _buildWizard(theme),
    );
  }

  Widget _buildHistory(ThemeData theme) {
    if (_history.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.camera_alt, size: 48, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No deposit history', style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey)),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _history.length,
      itemBuilder: (context, index) {
        final dep = _history[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _statusColor(dep.status).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(_statusIcon(dep.status), color: _statusColor(dep.status)),
            ),
            title: Text(formatCurrency(dep.amountCents), style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text('Check #${dep.checkNumber ?? 'N/A'} \u00B7 ${dep.status}'),
            trailing: Text(_formatDate(dep.createdAt), style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          ),
        );
      },
    );
  }

  Widget _buildWizard(ThemeData theme) {
    if (_step == 4) return _buildSuccess(theme);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Step indicator
          Row(
            children: List.generate(4, (i) => Expanded(
              child: Container(
                height: 4,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: i <= _step ? theme.primaryColor : Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            )),
          ),
          const SizedBox(height: 24),

          Expanded(child: _buildStepContent(theme)),

          // Navigation
          Row(
            children: [
              if (_step > 0)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _step--),
                    child: const Text('Back'),
                  ),
                ),
              if (_step > 0) const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _canProceed ? (_step == 3 ? _submit : () => setState(() => _step++)) : null,
                  child: _isSubmitting
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_step == 3 ? 'Submit Deposit' : 'Continue'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  bool get _canProceed {
    switch (_step) {
      case 0: return _frontImageBase64 != null;
      case 1: return _backImageBase64 != null;
      case 2: return parseToCents(_amountController.text) > 0;
      case 3: return _selectedAccountId != null;
      default: return false;
    }
  }

  Widget _buildStepContent(ThemeData theme) {
    switch (_step) {
      case 0:
        return _buildImageStep(theme, 'Front of Check', _frontImageFile, true);
      case 1:
        return _buildImageStep(theme, 'Back of Check', _backImageFile, false);
      case 2:
        return _buildAmountStep(theme);
      case 3:
        return _buildAccountStep(theme);
      default:
        return const SizedBox();
    }
  }

  Widget _buildImageStep(ThemeData theme, String title, File? imageFile, bool isFront) {
    final hasImage = isFront ? _frontImageBase64 != null : _backImageBase64 != null;
    return Column(
      children: [
        Text(title, style: theme.textTheme.titleLarge),
        const SizedBox(height: 8),
        Text('Take a clear photo or select from gallery', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
        const SizedBox(height: 24),
        Expanded(
          child: GestureDetector(
            onTap: () => _captureImage(isFront),
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                border: Border.all(color: hasImage ? Colors.green : Colors.grey.shade300, width: 2, strokeAlign: BorderSide.strokeAlignOutside),
                borderRadius: BorderRadius.circular(12),
              ),
              child: imageFile != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(imageFile, fit: BoxFit.contain),
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          hasImage ? Icons.check_circle : Icons.camera_alt,
                          size: 48,
                          color: hasImage ? Colors.green : Colors.grey.shade400,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          hasImage ? 'Image captured' : 'Tap to capture',
                          style: TextStyle(color: hasImage ? Colors.green : Colors.grey.shade500),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAmountStep(ThemeData theme) {
    return Column(
      children: [
        Text('Check Amount', style: theme.textTheme.titleLarge),
        const SizedBox(height: 8),
        Text('Enter the exact amount shown on the check', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
        const SizedBox(height: 32),
        TextField(
          controller: _amountController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: theme.textTheme.headlineMedium,
          textAlign: TextAlign.center,
          decoration: const InputDecoration(
            prefixText: '\$ ',
            hintText: '0.00',
            border: OutlineInputBorder(),
          ),
          onChanged: (_) => setState(() {}),
        ),
      ],
    );
  }

  Widget _buildAccountStep(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Deposit To', style: theme.textTheme.titleLarge),
        const SizedBox(height: 8),
        Text('Select the account to receive this deposit', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
        const SizedBox(height: 16),
        ..._accounts.map((acct) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          color: _selectedAccountId == acct.id ? theme.primaryColor.withValues(alpha: 0.05) : null,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(
              color: _selectedAccountId == acct.id ? theme.primaryColor : Colors.grey.shade200,
              width: _selectedAccountId == acct.id ? 2 : 1,
            ),
          ),
          child: ListTile(
            title: Text(acct.displayName),
            subtitle: Text(acct.accountNumberMasked),
            trailing: Text(formatCurrency(acct.balanceCents)),
            onTap: () => setState(() => _selectedAccountId = acct.id),
          ),
        )),
        const SizedBox(height: 16),
        Card(
          color: Colors.amber.shade50,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Icon(Icons.info_outline, size: 18, color: Colors.amber.shade800),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Deposit amount: ${formatCurrency(parseToCents(_amountController.text))}',
                    style: TextStyle(fontSize: 13, color: Colors.amber.shade900),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccess(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.check_circle, size: 64, color: Colors.green.shade600),
            ),
            const SizedBox(height: 24),
            Text('Deposit Submitted', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Amount: ${formatCurrency(parseToCents(_amountController.text))}', style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text('Deposit ID: ${_depositId ?? 'N/A'}', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
            const SizedBox(height: 8),
            Text('Your deposit is being reviewed and will typically clear within 1-2 business days.', textAlign: TextAlign.center, style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: () {
                setState(() {
                  _step = 0;
                  _frontImageBase64 = null;
                  _backImageBase64 = null;
                  _frontImageFile = null;
                  _backImageFile = null;
                  _amountController.clear();
                  _depositId = null;
                });
              },
              child: const Text('Make Another Deposit'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            ),
          ],
        ),
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'cleared': return Colors.green;
      case 'accepted': return Colors.blue;
      case 'pending': case 'reviewing': return Colors.orange;
      case 'rejected': return Colors.red;
      default: return Colors.grey;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'cleared': return Icons.check_circle;
      case 'accepted': return Icons.thumb_up;
      case 'pending': case 'reviewing': return Icons.schedule;
      case 'rejected': return Icons.cancel;
      default: return Icons.receipt;
    }
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${months[d.month - 1]} ${d.day}';
    } catch (_) {
      return '';
    }
  }
}

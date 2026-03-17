import 'package:flutter/material.dart';
import '../../services/gateway_client.dart';
import '../../models/banking.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  List<MemberAddress> _addresses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      final addresses = await GatewayClient.instance.getMemberAddresses();
      if (mounted) setState(() { _addresses = addresses; _isLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showEditDialog(int index) {
    final address = _addresses[index];
    final line1Controller = TextEditingController(text: address.line1);
    final line2Controller = TextEditingController(text: address.line2 ?? '');
    final cityController = TextEditingController(text: address.city);
    final stateController = TextEditingController(text: address.state);
    final zipController = TextEditingController(text: address.zip);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Edit ${address.type[0].toUpperCase()}${address.type.substring(1)} Address'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: line1Controller,
                decoration: const InputDecoration(labelText: 'Address Line 1'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: line2Controller,
                decoration: const InputDecoration(labelText: 'Address Line 2 (optional)'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: cityController,
                decoration: const InputDecoration(labelText: 'City'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: stateController,
                decoration: const InputDecoration(labelText: 'State'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: zipController,
                decoration: const InputDecoration(labelText: 'ZIP Code'),
                keyboardType: TextInputType.number,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await GatewayClient.instance.updateAddress(
                  address.id,
                  line1: line1Controller.text.trim(),
                  line2: line2Controller.text.trim().isNotEmpty
                      ? line2Controller.text.trim()
                      : null,
                  city: cityController.text.trim(),
                  state: stateController.text.trim(),
                  zip: zipController.text.trim(),
                );
                await _loadAddresses();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Address updated successfully')),
                  );
                }
              } catch (_) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to update address')),
                  );
                }
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Addresses')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _addresses.isEmpty
              ? const Center(child: Text('No addresses on file'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _addresses.length,
                  itemBuilder: (context, index) {
                    final address = _addresses[index];
                    final typeLabel = '${address.type[0].toUpperCase()}${address.type.substring(1)}'
                        '${address.isPrimary ? ' (Primary)' : ''}';

                    return Card(
                      child: ListTile(
                        leading: Icon(
                          address.type == 'mailing'
                              ? Icons.markunread_mailbox_outlined
                              : Icons.home_outlined,
                          size: 22,
                        ),
                        title: Text(typeLabel, style: const TextStyle(fontSize: 14)),
                        subtitle: Text(
                          '${address.line1}\n${address.city}, ${address.state} ${address.zip}',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                        ),
                        isThreeLine: true,
                        trailing: const Icon(Icons.edit, size: 20),
                        onTap: () => _showEditDialog(index),
                      ),
                    );
                  },
                ),
    );
  }
}

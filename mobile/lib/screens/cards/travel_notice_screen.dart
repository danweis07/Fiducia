import 'package:flutter/material.dart';
import '../../models/banking.dart';
import '../../services/gateway_client.dart';

/// Travel Notice screen — create a travel notification for a card.
class TravelNoticeScreen extends StatefulWidget {
  final String? cardId;

  const TravelNoticeScreen({super.key, this.cardId});

  @override
  State<TravelNoticeScreen> createState() => _TravelNoticeScreenState();
}

class _TravelNoticeScreenState extends State<TravelNoticeScreen> {
  List<BankCard> _cards = [];
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;
  bool _success = false;

  String? _selectedCardId;
  final List<String> _destinations = [];
  final _destinationController = TextEditingController();
  final _phoneController = TextEditingController();
  DateTimeRange? _dateRange;

  @override
  void initState() {
    super.initState();
    _selectedCardId = widget.cardId;
    _loadCards();
  }

  Future<void> _loadCards() async {
    setState(() => _isLoading = true);
    try {
      final cards = await GatewayClient.instance.getCards();
      if (mounted) {
        setState(() {
          _cards = cards;
          if (_selectedCardId == null && cards.isNotEmpty) {
            _selectedCardId = cards.first.id;
          }
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _addDestination() {
    final text = _destinationController.text.trim();
    if (text.isNotEmpty && !_destinations.contains(text)) {
      setState(() {
        _destinations.add(text);
        _destinationController.clear();
      });
    }
  }

  void _removeDestination(int index) {
    setState(() => _destinations.removeAt(index));
  }

  Future<void> _selectDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDateRange: _dateRange,
    );
    if (picked != null) {
      setState(() => _dateRange = picked);
    }
  }

  String _formatDate(DateTime d) {
    final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${months[d.month - 1]} ${d.day}, ${d.year}';
  }

  Future<void> _submit() async {
    if (_selectedCardId == null) {
      setState(() => _error = 'Please select a card');
      return;
    }
    if (_destinations.isEmpty) {
      setState(() => _error = 'Please add at least one destination');
      return;
    }
    if (_dateRange == null) {
      setState(() => _error = 'Please select travel dates');
      return;
    }

    setState(() { _isSubmitting = true; _error = null; });
    try {
      await GatewayClient.instance.createTravelNotice(
        cardId: _selectedCardId!,
        destinations: _destinations
            .map((d) => {'country': d})
            .toList(),
        startDate: _dateRange!.start.toIso8601String().split('T').first,
        endDate: _dateRange!.end.toIso8601String().split('T').first,
        contactPhone: _phoneController.text.isEmpty ? null : _phoneController.text,
      );
      if (mounted) {
        setState(() { _isSubmitting = false; _success = true; });
      }
    } catch (e) {
      if (mounted) {
        setState(() { _isSubmitting = false; _error = e.toString(); });
      }
    }
  }

  @override
  void dispose() {
    _destinationController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Travel Notice')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _success
              ? _buildSuccess()
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Card selector
                      const Text('Card', style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        value: _selectedCardId,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          hintText: 'Select card',
                        ),
                        items: _cards
                            .map((c) => DropdownMenuItem(
                                  value: c.id,
                                  child: Text(
                                    '${c.type == 'debit' ? 'Debit' : 'Credit'} \u2022\u2022\u2022\u2022 ${c.lastFour}',
                                  ),
                                ))
                            .toList(),
                        onChanged: (v) => setState(() => _selectedCardId = v),
                      ),
                      const SizedBox(height: 20),

                      // Destinations
                      const Text('Destinations', style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _destinationController,
                              decoration: const InputDecoration(
                                labelText: 'Country',
                                border: OutlineInputBorder(),
                              ),
                              onSubmitted: (_) => _addDestination(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton.filled(
                            onPressed: _addDestination,
                            icon: const Icon(Icons.add),
                          ),
                        ],
                      ),
                      if (_destinations.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: _destinations.asMap().entries.map((entry) {
                            return Chip(
                              label: Text(entry.value),
                              onDeleted: () => _removeDestination(entry.key),
                              deleteIconColor: Colors.grey,
                            );
                          }).toList(),
                        ),
                      ],
                      const SizedBox(height: 20),

                      // Date range
                      const Text('Travel Dates', style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        onPressed: _selectDateRange,
                        icon: const Icon(Icons.date_range),
                        label: Text(
                          _dateRange != null
                              ? '${_formatDate(_dateRange!.start)} - ${_formatDate(_dateRange!.end)}'
                              : 'Select travel dates',
                        ),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.all(16),
                          alignment: Alignment.centerLeft,
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Contact phone
                      const Text('Contact Phone (optional)', style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Phone number',
                          border: OutlineInputBorder(),
                          helperText: 'We may contact you at this number while traveling',
                        ),
                      ),

                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                      ],

                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: _isSubmitting ? null : _submit,
                        child: _isSubmitting
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Submit Travel Notice'),
                      ),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSuccess() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle, size: 64, color: Colors.green),
            const SizedBox(height: 16),
            const Text(
              'Travel Notice Created',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Your card is now set up for travel to ${_destinations.join(', ')}.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
            if (_dateRange != null) ...[
              const SizedBox(height: 8),
              Text(
                '${_formatDate(_dateRange!.start)} - ${_formatDate(_dateRange!.end)}',
                style: const TextStyle(fontSize: 13, color: Colors.grey),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            ),
          ],
        ),
      ),
    );
  }
}

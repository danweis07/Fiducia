import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/gateway_client.dart';
import '../../services/location_service.dart';
import '../../models/banking.dart';

class AtmBranchScreen extends StatefulWidget {
  const AtmBranchScreen({super.key});

  @override
  State<AtmBranchScreen> createState() => _AtmBranchScreenState();
}

class _AtmBranchScreenState extends State<AtmBranchScreen> {
  List<BranchLocation> _locations = [];
  bool _isLoading = false;
  bool _locationDenied = false;
  String? _error;
  Position? _userPosition;
  String _filter = 'all'; // all, atm, branch

  @override
  void initState() {
    super.initState();
    _loadLocations();
  }

  Future<void> _loadLocations() async {
    setState(() {
      _isLoading = true;
      _error = null;
      _locationDenied = false;
    });

    try {
      final position = await LocationService.getCurrentPosition();
      if (position == null) {
        setState(() {
          _locationDenied = true;
          _isLoading = false;
        });
        return;
      }

      _userPosition = position;

      final locations = await GatewayClient.instance.findLocations(
        latitude: position.latitude,
        longitude: position.longitude,
        radiusMiles: 25,
        type: _filter == 'all' ? null : _filter,
      );

      setState(() {
        _locations = locations;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _onFilterChanged(String filter) {
    setState(() => _filter = filter);
    _loadLocations();
  }

  Future<void> _openDirections(BranchLocation location) async {
    final url = Uri.parse(
      'https://www.google.com/maps/dir/?api=1'
      '&destination=${location.latitude},${location.longitude}',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _callLocation(String phone) async {
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Find ATM & Branch'),
      ),
      body: Column(
        children: [
          // Filter chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _FilterChip(
                  label: 'All',
                  selected: _filter == 'all',
                  onTap: () => _onFilterChanged('all'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'ATMs',
                  selected: _filter == 'atm',
                  onTap: () => _onFilterChanged('atm'),
                  icon: Icons.atm,
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Branches',
                  selected: _filter == 'branch',
                  onTap: () => _onFilterChanged('branch'),
                  icon: Icons.account_balance,
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _locationDenied
                    ? _LocationDeniedView(onRetry: _loadLocations)
                    : _error != null
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                                const SizedBox(height: 16),
                                Text('Failed to load locations'),
                                const SizedBox(height: 8),
                                FilledButton(
                                  onPressed: _loadLocations,
                                  child: const Text('Retry'),
                                ),
                              ],
                            ),
                          )
                        : _locations.isEmpty
                            ? const Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.location_off, size: 48, color: Colors.grey),
                                    SizedBox(height: 16),
                                    Text('No locations found nearby.'),
                                    SizedBox(height: 4),
                                    Text(
                                      'Try expanding your search area.',
                                      style: TextStyle(color: Colors.grey, fontSize: 13),
                                    ),
                                  ],
                                ),
                              )
                            : RefreshIndicator(
                                onRefresh: _loadLocations,
                                child: ListView.separated(
                                  padding: const EdgeInsets.all(16),
                                  itemCount: _locations.length,
                                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                                  itemBuilder: (context, index) {
                                    final location = _locations[index];
                                    return _LocationCard(
                                      location: location,
                                      onDirections: () => _openDirections(location),
                                      onCall: location.phone != null
                                          ? () => _callLocation(location.phone!)
                                          : null,
                                    );
                                  },
                                ),
                              ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14),
            const SizedBox(width: 4),
          ],
          Text(label),
        ],
      ),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}

class _LocationDeniedView extends StatelessWidget {
  final VoidCallback onRetry;
  const _LocationDeniedView({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.location_disabled, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'Location Access Required',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'We need your location to find nearby ATMs and branches. '
              'Please enable location services in your device settings.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () async {
                await LocationService.openSettings();
              },
              icon: const Icon(Icons.settings),
              label: const Text('Open Settings'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: onRetry,
              child: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}

class _LocationCard extends StatelessWidget {
  final BranchLocation location;
  final VoidCallback onDirections;
  final VoidCallback? onCall;

  const _LocationCard({
    required this.location,
    required this.onDirections,
    this.onCall,
  });

  @override
  Widget build(BuildContext context) {
    final isAtm = location.type == 'atm';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isAtm ? Colors.blue.shade50 : Colors.green.shade50,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isAtm ? Icons.atm : Icons.account_balance,
                    size: 20,
                    color: isAtm ? Colors.blue : Colors.green,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        location.name,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      Row(
                        children: [
                          Chip(
                            label: Text(
                              isAtm ? 'ATM' : 'Branch',
                              style: const TextStyle(fontSize: 10),
                            ),
                            padding: EdgeInsets.zero,
                            visualDensity: VisualDensity.compact,
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          const SizedBox(width: 6),
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: location.isOpen ? Colors.green : Colors.red,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            location.isOpen ? 'Open' : 'Closed',
                            style: TextStyle(
                              fontSize: 12,
                              color: location.isOpen ? Colors.green : Colors.red,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (location.distanceMiles != null)
                  Text(
                    '${location.distanceMiles!.toStringAsFixed(1)} mi',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Colors.grey,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            // Address
            Text(
              location.fullAddress,
              style: const TextStyle(fontSize: 13, color: Colors.grey),
            ),

            // Services
            if (location.services.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 4,
                runSpacing: 4,
                children: location.services
                    .take(4)
                    .map((s) => Chip(
                          label: Text(s, style: const TextStyle(fontSize: 10)),
                          padding: EdgeInsets.zero,
                          visualDensity: VisualDensity.compact,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ))
                    .toList(),
              ),
            ],

            // Network
            if (location.network != null) ...[
              const SizedBox(height: 4),
              Text(
                'Network: ${location.network}',
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],

            const SizedBox(height: 12),

            // Actions
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onDirections,
                    icon: const Icon(Icons.directions, size: 16),
                    label: const Text('Directions'),
                  ),
                ),
                if (onCall != null) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onCall,
                      icon: const Icon(Icons.phone, size: 16),
                      label: const Text('Call'),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

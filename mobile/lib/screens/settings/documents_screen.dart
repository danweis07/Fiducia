import 'package:flutter/material.dart';
import '../../services/gateway_client.dart';
import '../../models/banking.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  List<MemberDocument> _documents = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
    try {
      final documents = await GatewayClient.instance.getMemberDocuments();
      if (mounted) setState(() { _documents = documents; _isLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'drivers_license':
        return Icons.badge_outlined;
      case 'passport':
        return Icons.flight_outlined;
      case 'ssn':
        return Icons.security_outlined;
      case 'tax_id':
        return Icons.account_balance_outlined;
      default:
        return Icons.description_outlined;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'verified':
        return Colors.green;
      case 'expired':
        return Colors.red;
      case 'pending':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _documents.isEmpty
              ? const Center(child: Text('No documents on file'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _documents.length,
                  itemBuilder: (context, index) {
                    final doc = _documents[index];
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(_iconForType(doc.type), size: 28, color: Colors.grey.shade600),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          doc.label,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: _statusColor(doc.status).withAlpha(25),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Text(
                                          doc.status[0].toUpperCase() + doc.status.substring(1),
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w500,
                                            color: _statusColor(doc.status),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (doc.documentNumberMasked != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      doc.documentNumberMasked!,
                                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                                    ),
                                  ],
                                  if (doc.issuingAuthority != null) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      'Issued by: ${doc.issuingAuthority}',
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                    ),
                                  ],
                                  if (doc.issuedDate != null || doc.expirationDate != null) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      [
                                        if (doc.issuedDate != null) 'Issued: ${doc.issuedDate}',
                                        if (doc.expirationDate != null) 'Expires: ${doc.expirationDate}',
                                      ].join(' \u00B7 '),
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

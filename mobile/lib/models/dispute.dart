/// Dispute model — matches backend disputes handlers

class Dispute {
  final String id;
  final String transactionId;
  final String reason;
  final String? description;
  final int amountCents;
  final String status; // 'open', 'investigating', 'resolved', 'denied'
  final String? resolution;
  final String? assignedTo;
  final String createdAt;
  final String? resolvedAt;

  const Dispute({
    required this.id,
    required this.transactionId,
    required this.reason,
    this.description,
    required this.amountCents,
    this.status = 'open',
    this.resolution,
    this.assignedTo,
    required this.createdAt,
    this.resolvedAt,
  });

  factory Dispute.fromJson(Map<String, dynamic> json) {
    return Dispute(
      id: json['id'] as String,
      transactionId: json['transactionId'] as String? ?? json['transaction_id'] as String? ?? '',
      reason: json['reason'] as String,
      description: json['description'] as String?,
      amountCents: json['amountCents'] as int? ?? json['amount_cents'] as int? ?? 0,
      status: json['status'] as String? ?? 'open',
      resolution: json['resolution'] as String?,
      assignedTo: json['assignedTo'] as String? ?? json['assigned_to'] as String?,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
      resolvedAt: json['resolvedAt'] as String? ?? json['resolved_at'] as String?,
    );
  }
}

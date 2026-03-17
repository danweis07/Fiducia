/// Savings Goal model — matches backend savingsGoals handlers

class SavingsGoal {
  final String id;
  final String name;
  final int targetCents;
  final int currentCents;
  final String? accountId;
  final String? targetDate;
  final String status;
  final String createdAt;

  const SavingsGoal({
    required this.id,
    required this.name,
    required this.targetCents,
    required this.currentCents,
    this.accountId,
    this.targetDate,
    this.status = 'active',
    required this.createdAt,
  });

  double get percentComplete =>
      targetCents > 0 ? (currentCents / targetCents * 100).clamp(0, 100) : 0;

  int get remainingCents => (targetCents - currentCents).clamp(0, targetCents);

  factory SavingsGoal.fromJson(Map<String, dynamic> json) {
    return SavingsGoal(
      id: json['id'] as String,
      name: json['name'] as String,
      targetCents: json['targetCents'] as int? ?? json['target_cents'] as int? ?? 0,
      currentCents: json['currentCents'] as int? ?? json['current_cents'] as int? ?? 0,
      accountId: json['accountId'] as String? ?? json['account_id'] as String?,
      targetDate: json['targetDate'] as String? ?? json['target_date'] as String?,
      status: json['status'] as String? ?? 'active',
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'targetCents': targetCents,
    'currentCents': currentCents,
    if (accountId != null) 'accountId': accountId,
    if (targetDate != null) 'targetDate': targetDate,
    'status': status,
    'createdAt': createdAt,
  };
}

/// Financial Data & Card Offers domain models.
/// All monetary values are integer cents.

// =============================================================================
// FINANCIAL DATA — SPENDING
// =============================================================================

class TopMerchant {
  final String name;
  final int totalCents;
  final String? logoUrl;

  const TopMerchant({
    required this.name,
    required this.totalCents,
    this.logoUrl,
  });

  factory TopMerchant.fromJson(Map<String, dynamic> json) => TopMerchant(
        name: json['name'] as String? ?? '',
        totalCents: json['totalCents'] as int? ?? 0,
        logoUrl: json['logoUrl'] as String?,
      );
}

class SpendingByCategory {
  final String category;
  final int totalCents;
  final int transactionCount;
  final double percentOfTotal;
  final String trend;
  final int changeFromPreviousCents;
  final List<TopMerchant> topMerchants;

  const SpendingByCategory({
    required this.category,
    required this.totalCents,
    required this.transactionCount,
    required this.percentOfTotal,
    required this.trend,
    required this.changeFromPreviousCents,
    required this.topMerchants,
  });

  factory SpendingByCategory.fromJson(Map<String, dynamic> json) =>
      SpendingByCategory(
        category: json['category'] as String? ?? '',
        totalCents: json['totalCents'] as int? ?? 0,
        transactionCount: json['transactionCount'] as int? ?? 0,
        percentOfTotal: (json['percentOfTotal'] as num?)?.toDouble() ?? 0.0,
        trend: json['trend'] as String? ?? '',
        changeFromPreviousCents: json['changeFromPreviousCents'] as int? ?? 0,
        topMerchants: (json['topMerchants'] as List?)
                ?.map((e) =>
                    TopMerchant.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
      );
}

class SpendingSummary {
  final int totalSpendingCents;
  final int totalIncomeCents;
  final int netCashFlowCents;
  final int avgDailySpendingCents;
  final List<SpendingByCategory> byCategory;
  final String periodStart;
  final String periodEnd;

  const SpendingSummary({
    required this.totalSpendingCents,
    required this.totalIncomeCents,
    required this.netCashFlowCents,
    required this.avgDailySpendingCents,
    required this.byCategory,
    required this.periodStart,
    required this.periodEnd,
  });

  factory SpendingSummary.fromJson(Map<String, dynamic> json) =>
      SpendingSummary(
        totalSpendingCents: json['totalSpendingCents'] as int? ?? 0,
        totalIncomeCents: json['totalIncomeCents'] as int? ?? 0,
        netCashFlowCents: json['netCashFlowCents'] as int? ?? 0,
        avgDailySpendingCents: json['avgDailySpendingCents'] as int? ?? 0,
        byCategory: (json['byCategory'] as List?)
                ?.map((e) =>
                    SpendingByCategory.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
        periodStart: json['periodStart'] as String? ?? '',
        periodEnd: json['periodEnd'] as String? ?? '',
      );
}

// =============================================================================
// FINANCIAL DATA — TRENDS
// =============================================================================

class MonthlyTrend {
  final String month;
  final int spendingCents;
  final int incomeCents;
  final int savingsCents;
  final String topCategory;

  const MonthlyTrend({
    required this.month,
    required this.spendingCents,
    required this.incomeCents,
    required this.savingsCents,
    required this.topCategory,
  });

  factory MonthlyTrend.fromJson(Map<String, dynamic> json) => MonthlyTrend(
        month: json['month'] as String? ?? '',
        spendingCents: json['spendingCents'] as int? ?? 0,
        incomeCents: json['incomeCents'] as int? ?? 0,
        savingsCents: json['savingsCents'] as int? ?? 0,
        topCategory: json['topCategory'] as String? ?? '',
      );
}

// =============================================================================
// FINANCIAL DATA — BUDGETS
// =============================================================================

class Budget {
  final String budgetId;
  final String category;
  final int limitCents;
  final int spentCents;
  final int remainingCents;
  final double percentUsed;
  final bool isOverBudget;
  final int projectedCents;

  const Budget({
    required this.budgetId,
    required this.category,
    required this.limitCents,
    required this.spentCents,
    required this.remainingCents,
    required this.percentUsed,
    required this.isOverBudget,
    required this.projectedCents,
  });

  factory Budget.fromJson(Map<String, dynamic> json) => Budget(
        budgetId: json['budgetId'] as String? ?? '',
        category: json['category'] as String? ?? '',
        limitCents: json['limitCents'] as int? ?? 0,
        spentCents: json['spentCents'] as int? ?? 0,
        remainingCents: json['remainingCents'] as int? ?? 0,
        percentUsed: (json['percentUsed'] as num?)?.toDouble() ?? 0.0,
        isOverBudget: json['isOverBudget'] as bool? ?? false,
        projectedCents: json['projectedCents'] as int? ?? 0,
      );
}

class BudgetSummary {
  final List<Budget> budgets;
  final int totalBudgetCents;
  final int totalSpentCents;

  const BudgetSummary({
    required this.budgets,
    required this.totalBudgetCents,
    required this.totalSpentCents,
  });

  factory BudgetSummary.fromJson(Map<String, dynamic> json) => BudgetSummary(
        budgets: (json['budgets'] as List?)
                ?.map((e) => Budget.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
        totalBudgetCents: json['totalBudgetCents'] as int? ?? 0,
        totalSpentCents: json['totalSpentCents'] as int? ?? 0,
      );
}

// =============================================================================
// FINANCIAL DATA — NET WORTH
// =============================================================================

class NetWorthAccount {
  final String accountId;
  final String name;
  final String type;
  final int balanceCents;
  final String? institution;

  const NetWorthAccount({
    required this.accountId,
    required this.name,
    required this.type,
    required this.balanceCents,
    this.institution,
  });

  factory NetWorthAccount.fromJson(Map<String, dynamic> json) =>
      NetWorthAccount(
        accountId: json['accountId'] as String? ?? '',
        name: json['name'] as String? ?? '',
        type: json['type'] as String? ?? '',
        balanceCents: json['balanceCents'] as int? ?? 0,
        institution: json['institution'] as String?,
      );
}

class NetWorthSnapshot {
  final String date;
  final int totalAssetsCents;
  final int totalLiabilitiesCents;
  final int netWorthCents;
  final List<NetWorthAccount> accounts;

  const NetWorthSnapshot({
    required this.date,
    required this.totalAssetsCents,
    required this.totalLiabilitiesCents,
    required this.netWorthCents,
    required this.accounts,
  });

  factory NetWorthSnapshot.fromJson(Map<String, dynamic> json) =>
      NetWorthSnapshot(
        date: json['date'] as String? ?? '',
        totalAssetsCents: json['totalAssetsCents'] as int? ?? 0,
        totalLiabilitiesCents: json['totalLiabilitiesCents'] as int? ?? 0,
        netWorthCents: json['netWorthCents'] as int? ?? 0,
        accounts: (json['accounts'] as List?)
                ?.map((e) =>
                    NetWorthAccount.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
      );
}

// =============================================================================
// FINANCIAL DATA — RECURRING TRANSACTIONS
// =============================================================================

class RecurringTransaction {
  final String recurringId;
  final String merchantName;
  final String? merchantLogoUrl;
  final String category;
  final int averageAmountCents;
  final int lastAmountCents;
  final String frequency;
  final String nextExpectedDate;
  final bool isActive;
  final String lastChargeDate;
  final int chargeCount;

  const RecurringTransaction({
    required this.recurringId,
    required this.merchantName,
    this.merchantLogoUrl,
    required this.category,
    required this.averageAmountCents,
    required this.lastAmountCents,
    required this.frequency,
    required this.nextExpectedDate,
    required this.isActive,
    required this.lastChargeDate,
    required this.chargeCount,
  });

  factory RecurringTransaction.fromJson(Map<String, dynamic> json) =>
      RecurringTransaction(
        recurringId: json['recurringId'] as String? ?? '',
        merchantName: json['merchantName'] as String? ?? '',
        merchantLogoUrl: json['merchantLogoUrl'] as String?,
        category: json['category'] as String? ?? '',
        averageAmountCents: json['averageAmountCents'] as int? ?? 0,
        lastAmountCents: json['lastAmountCents'] as int? ?? 0,
        frequency: json['frequency'] as String? ?? '',
        nextExpectedDate: json['nextExpectedDate'] as String? ?? '',
        isActive: json['isActive'] as bool? ?? false,
        lastChargeDate: json['lastChargeDate'] as String? ?? '',
        chargeCount: json['chargeCount'] as int? ?? 0,
      );
}

class RecurringSummary {
  final List<RecurringTransaction> recurring;
  final int totalMonthlyCents;
  final int totalAnnualCents;

  const RecurringSummary({
    required this.recurring,
    required this.totalMonthlyCents,
    required this.totalAnnualCents,
  });

  factory RecurringSummary.fromJson(Map<String, dynamic> json) =>
      RecurringSummary(
        recurring: (json['recurring'] as List?)
                ?.map((e) =>
                    RecurringTransaction.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
        totalMonthlyCents: json['totalMonthlyCents'] as int? ?? 0,
        totalAnnualCents: json['totalAnnualCents'] as int? ?? 0,
      );
}

// =============================================================================
// CARD OFFERS — MERCHANT INFO
// =============================================================================

class MerchantInfo {
  final String merchantId;
  final String name;
  final String? logoUrl;
  final String category;

  const MerchantInfo({
    required this.merchantId,
    required this.name,
    this.logoUrl,
    required this.category,
  });

  factory MerchantInfo.fromJson(Map<String, dynamic> json) => MerchantInfo(
        merchantId: json['merchantId'] as String? ?? '',
        name: json['name'] as String? ?? '',
        logoUrl: json['logoUrl'] as String?,
        category: json['category'] as String? ?? '',
      );
}

// =============================================================================
// CARD OFFERS — MERCHANT OFFER
// =============================================================================

class MerchantOffer {
  final String offerId;
  final MerchantInfo merchant;
  final String headline;
  final String description;
  final String offerType;
  final String rewardValue;
  final int minimumSpendCents;
  final int maximumRewardCents;
  final String status;
  final String? expiresAt;
  final String? activatedAt;
  final bool isPersonalized;
  final double relevanceScore;
  final List<String> tags;

  const MerchantOffer({
    required this.offerId,
    required this.merchant,
    required this.headline,
    required this.description,
    required this.offerType,
    required this.rewardValue,
    required this.minimumSpendCents,
    required this.maximumRewardCents,
    required this.status,
    this.expiresAt,
    this.activatedAt,
    required this.isPersonalized,
    required this.relevanceScore,
    required this.tags,
  });

  factory MerchantOffer.fromJson(Map<String, dynamic> json) => MerchantOffer(
        offerId: json['offerId'] as String? ?? '',
        merchant:
            MerchantInfo.fromJson(json['merchant'] as Map<String, dynamic>),
        headline: json['headline'] as String? ?? '',
        description: json['description'] as String? ?? '',
        offerType: json['offerType'] as String? ?? '',
        rewardValue: json['rewardValue'] as String? ?? '',
        minimumSpendCents: json['minimumSpendCents'] as int? ?? 0,
        maximumRewardCents: json['maximumRewardCents'] as int? ?? 0,
        status: json['status'] as String? ?? '',
        expiresAt: json['expiresAt'] as String?,
        activatedAt: json['activatedAt'] as String?,
        isPersonalized: json['isPersonalized'] as bool? ?? false,
        relevanceScore:
            (json['relevanceScore'] as num?)?.toDouble() ?? 0.0,
        tags: (json['tags'] as List?)?.cast<String>() ?? const [],
      );
}

// =============================================================================
// CARD OFFERS — REDEMPTION
// =============================================================================

class OfferRedemption {
  final String redemptionId;
  final String offerId;
  final String transactionId;
  final int transactionAmountCents;
  final int rewardAmountCents;
  final String rewardType;
  final String merchantName;
  final String redeemedAt;
  final String payoutStatus;

  const OfferRedemption({
    required this.redemptionId,
    required this.offerId,
    required this.transactionId,
    required this.transactionAmountCents,
    required this.rewardAmountCents,
    required this.rewardType,
    required this.merchantName,
    required this.redeemedAt,
    required this.payoutStatus,
  });

  factory OfferRedemption.fromJson(Map<String, dynamic> json) =>
      OfferRedemption(
        redemptionId: json['redemptionId'] as String? ?? '',
        offerId: json['offerId'] as String? ?? '',
        transactionId: json['transactionId'] as String? ?? '',
        transactionAmountCents: json['transactionAmountCents'] as int? ?? 0,
        rewardAmountCents: json['rewardAmountCents'] as int? ?? 0,
        rewardType: json['rewardType'] as String? ?? '',
        merchantName: json['merchantName'] as String? ?? '',
        redeemedAt: json['redeemedAt'] as String? ?? '',
        payoutStatus: json['payoutStatus'] as String? ?? '',
      );
}

// =============================================================================
// CARD OFFERS — SUMMARY
// =============================================================================

class OfferSummary {
  final int availableCount;
  final int activatedCount;
  final int monthlyRewardsCents;
  final int totalRewardsCents;
  final List<MerchantOffer> topOffers;

  const OfferSummary({
    required this.availableCount,
    required this.activatedCount,
    required this.monthlyRewardsCents,
    required this.totalRewardsCents,
    required this.topOffers,
  });

  factory OfferSummary.fromJson(Map<String, dynamic> json) => OfferSummary(
        availableCount: json['availableCount'] as int? ?? 0,
        activatedCount: json['activatedCount'] as int? ?? 0,
        monthlyRewardsCents: json['monthlyRewardsCents'] as int? ?? 0,
        totalRewardsCents: json['totalRewardsCents'] as int? ?? 0,
        topOffers: (json['topOffers'] as List?)
                ?.map((e) =>
                    MerchantOffer.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
      );
}

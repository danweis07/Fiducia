/// A/B Experiment models — mirrors src/types/experiments.ts

// =============================================================================
// EXPERIMENT
// =============================================================================

class Experiment {
  final String id;
  final String firmId;
  final String name;
  final String? description;
  final String status; // draft | running | paused | completed
  final String metric;
  final int trafficPercent;
  final String? startedAt;
  final String? endedAt;
  final String createdAt;
  final String updatedAt;
  final List<ExperimentVariant>? variants;

  const Experiment({
    required this.id,
    required this.firmId,
    required this.name,
    this.description,
    required this.status,
    required this.metric,
    required this.trafficPercent,
    this.startedAt,
    this.endedAt,
    required this.createdAt,
    required this.updatedAt,
    this.variants,
  });

  factory Experiment.fromJson(Map<String, dynamic> json) => Experiment(
        id: json['id'] as String,
        firmId: json['firmId'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        status: json['status'] as String,
        metric: json['metric'] as String? ?? '',
        trafficPercent: json['trafficPercent'] as int? ?? 100,
        startedAt: json['startedAt'] as String?,
        endedAt: json['endedAt'] as String?,
        createdAt: json['createdAt'] as String,
        updatedAt: json['updatedAt'] as String,
        variants: json['variants'] != null
            ? (json['variants'] as List)
                .map((v) => ExperimentVariant.fromJson(v as Map<String, dynamic>))
                .toList()
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'firmId': firmId,
        'name': name,
        'description': description,
        'status': status,
        'metric': metric,
        'trafficPercent': trafficPercent,
        'startedAt': startedAt,
        'endedAt': endedAt,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
        if (variants != null) 'variants': variants!.map((v) => v.toJson()).toList(),
      };
}

// =============================================================================
// VARIANT
// =============================================================================

class ExperimentVariant {
  final String id;
  final String experimentId;
  final String name;
  final String? contentId;
  final int weight;
  final bool isControl;
  final String createdAt;

  const ExperimentVariant({
    required this.id,
    required this.experimentId,
    required this.name,
    this.contentId,
    required this.weight,
    required this.isControl,
    required this.createdAt,
  });

  factory ExperimentVariant.fromJson(Map<String, dynamic> json) => ExperimentVariant(
        id: json['id'] as String,
        experimentId: json['experimentId'] as String,
        name: json['name'] as String,
        contentId: json['contentId'] as String?,
        weight: json['weight'] as int? ?? 50,
        isControl: json['isControl'] as bool? ?? false,
        createdAt: json['createdAt'] as String,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'experimentId': experimentId,
        'name': name,
        'contentId': contentId,
        'weight': weight,
        'isControl': isControl,
        'createdAt': createdAt,
      };
}

// =============================================================================
// ASSIGNMENT
// =============================================================================

class ExperimentAssignment {
  final String id;
  final String experimentId;
  final String userId;
  final String variantId;
  final String assignedAt;

  const ExperimentAssignment({
    required this.id,
    required this.experimentId,
    required this.userId,
    required this.variantId,
    required this.assignedAt,
  });

  factory ExperimentAssignment.fromJson(Map<String, dynamic> json) => ExperimentAssignment(
        id: json['id'] as String,
        experimentId: json['experimentId'] as String,
        userId: json['userId'] as String,
        variantId: json['variantId'] as String,
        assignedAt: json['assignedAt'] as String,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'experimentId': experimentId,
        'userId': userId,
        'variantId': variantId,
        'assignedAt': assignedAt,
      };
}

// =============================================================================
// RESULTS
// =============================================================================

class VariantStats {
  final String variantId;
  final String variantName;
  final bool isControl;
  final int impressions;
  final int clicks;
  final int dismissals;
  final int conversions;
  final double clickRate;
  final double conversionRate;

  const VariantStats({
    required this.variantId,
    required this.variantName,
    required this.isControl,
    required this.impressions,
    required this.clicks,
    required this.dismissals,
    required this.conversions,
    required this.clickRate,
    required this.conversionRate,
  });

  factory VariantStats.fromJson(Map<String, dynamic> json) => VariantStats(
        variantId: json['variantId'] as String,
        variantName: json['variantName'] as String,
        isControl: json['isControl'] as bool? ?? false,
        impressions: json['impressions'] as int? ?? 0,
        clicks: json['clicks'] as int? ?? 0,
        dismissals: json['dismissals'] as int? ?? 0,
        conversions: json['conversions'] as int? ?? 0,
        clickRate: (json['clickRate'] as num?)?.toDouble() ?? 0.0,
        conversionRate: (json['conversionRate'] as num?)?.toDouble() ?? 0.0,
      );
}

class ExperimentResults {
  final String experimentId;
  final String experimentName;
  final String status;
  final List<VariantStats> variants;
  final int totalImpressions;
  final int totalConversions;

  const ExperimentResults({
    required this.experimentId,
    required this.experimentName,
    required this.status,
    required this.variants,
    required this.totalImpressions,
    required this.totalConversions,
  });

  factory ExperimentResults.fromJson(Map<String, dynamic> json) => ExperimentResults(
        experimentId: json['experimentId'] as String,
        experimentName: json['experimentName'] as String,
        status: json['status'] as String,
        variants: (json['variants'] as List)
            .map((v) => VariantStats.fromJson(v as Map<String, dynamic>))
            .toList(),
        totalImpressions: json['totalImpressions'] as int? ?? 0,
        totalConversions: json['totalConversions'] as int? ?? 0,
      );
}

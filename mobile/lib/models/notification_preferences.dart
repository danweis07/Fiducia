/// Notification Preferences model — matches backend notification-preferences.ts

class NotificationCategory {
  final bool enabled;
  final List<String> channels;

  const NotificationCategory({
    required this.enabled,
    required this.channels,
  });

  factory NotificationCategory.fromJson(Map<String, dynamic> json) {
    return NotificationCategory(
      enabled: json['enabled'] as bool? ?? true,
      channels: (json['channels'] as List?)?.cast<String>() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
    'enabled': enabled,
    'channels': channels,
  };

  NotificationCategory copyWith({bool? enabled, List<String>? channels}) {
    return NotificationCategory(
      enabled: enabled ?? this.enabled,
      channels: channels ?? this.channels,
    );
  }
}

class NotificationPreferences {
  final Map<String, bool> channels;
  final Map<String, NotificationCategory> categories;

  const NotificationPreferences({
    required this.channels,
    required this.categories,
  });

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    final channelsJson = json['channels'] as Map<String, dynamic>? ?? {};
    final categoriesJson = json['categories'] as Map<String, dynamic>? ?? {};
    return NotificationPreferences(
      channels: channelsJson.map((k, v) => MapEntry(k, v as bool)),
      categories: categoriesJson.map(
        (k, v) => MapEntry(k, NotificationCategory.fromJson(v as Map<String, dynamic>)),
      ),
    );
  }

  Map<String, dynamic> toJson() => {
    'channels': channels,
    'categories': categories.map((k, v) => MapEntry(k, v.toJson())),
  };

  /// Default preferences matching backend defaultPreferences()
  factory NotificationPreferences.defaults() {
    return const NotificationPreferences(
      channels: {
        'email': true,
        'sms': false,
        'push': true,
        'in_app': true,
      },
      categories: {
        'transactions': NotificationCategory(enabled: true, channels: ['push', 'in_app']),
        'transfers': NotificationCategory(enabled: true, channels: ['email', 'push', 'in_app']),
        'security': NotificationCategory(enabled: true, channels: ['email', 'sms', 'push', 'in_app']),
        'marketing': NotificationCategory(enabled: false, channels: ['email']),
        'account_alerts': NotificationCategory(enabled: true, channels: ['email', 'push', 'in_app']),
        'bill_reminders': NotificationCategory(enabled: true, channels: ['push', 'in_app']),
        'statements': NotificationCategory(enabled: true, channels: ['email', 'in_app']),
        'loan_updates': NotificationCategory(enabled: true, channels: ['email', 'push']),
      },
    );
  }

  NotificationPreferences copyWithChannel(String channel, bool value) {
    return NotificationPreferences(
      channels: {...channels, channel: value},
      categories: categories,
    );
  }

  NotificationPreferences copyWithCategory(String category, NotificationCategory value) {
    return NotificationPreferences(
      channels: channels,
      categories: {...categories, category: value},
    );
  }
}

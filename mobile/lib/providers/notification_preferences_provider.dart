import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/notification_preferences.dart';
import '../services/gateway_client.dart';

class NotificationPreferencesState {
  final NotificationPreferences? preferences;
  final bool isLoading;
  final bool isSaving;
  final String? error;

  const NotificationPreferencesState({
    this.preferences,
    this.isLoading = false,
    this.isSaving = false,
    this.error,
  });

  NotificationPreferencesState copyWith({
    NotificationPreferences? preferences,
    bool? isLoading,
    bool? isSaving,
    String? error,
  }) {
    return NotificationPreferencesState(
      preferences: preferences ?? this.preferences,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: error,
    );
  }
}

class NotificationPreferencesNotifier extends StateNotifier<NotificationPreferencesState> {
  NotificationPreferencesNotifier() : super(const NotificationPreferencesState());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final prefs = await GatewayClient.instance.getNotificationPreferences();
      state = state.copyWith(preferences: prefs, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> updateChannels(Map<String, bool> channels) async {
    final prev = state.preferences;
    if (prev == null) return;

    // Optimistic update
    final updated = NotificationPreferences(channels: {...prev.channels, ...channels}, categories: prev.categories);
    state = state.copyWith(preferences: updated, isSaving: true);

    try {
      final result = await GatewayClient.instance.updateNotificationPreferences(channels: channels);
      state = state.copyWith(preferences: result, isSaving: false);
    } catch (e) {
      // Revert on error
      state = state.copyWith(preferences: prev, isSaving: false, error: e.toString());
    }
  }

  Future<void> updateCategory(String category, {bool? enabled, List<String>? channels}) async {
    final prev = state.preferences;
    if (prev == null) return;

    final currentCat = prev.categories[category];
    if (currentCat == null) return;

    final updatedCat = NotificationCategory(
      enabled: enabled ?? currentCat.enabled,
      channels: channels ?? currentCat.channels,
    );

    // Optimistic update
    final updated = prev.copyWithCategory(category, updatedCat);
    state = state.copyWith(preferences: updated, isSaving: true);

    try {
      final result = await GatewayClient.instance.updateNotificationPreferences(
        categories: {category: updatedCat.toJson()},
      );
      state = state.copyWith(preferences: result, isSaving: false);
    } catch (e) {
      state = state.copyWith(preferences: prev, isSaving: false, error: e.toString());
    }
  }

  Future<Map<String, dynamic>> sendTestNotification(String channel) async {
    return GatewayClient.instance.testNotification(channel);
  }
}

final notificationPreferencesProvider =
    StateNotifierProvider<NotificationPreferencesNotifier, NotificationPreferencesState>((ref) {
  final notifier = NotificationPreferencesNotifier();
  notifier.load();
  return notifier;
});

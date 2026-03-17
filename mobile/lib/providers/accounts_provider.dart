import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/banking.dart';
import '../services/gateway_client.dart';

/// Accounts state — holds the list of accounts and loading/error state.
class AccountsState {
  final List<Account> accounts;
  final bool isLoading;
  final String? error;

  const AccountsState({
    this.accounts = const [],
    this.isLoading = false,
    this.error,
  });

  AccountsState copyWith({
    List<Account>? accounts,
    bool? isLoading,
    String? error,
  }) {
    return AccountsState(
      accounts: accounts ?? this.accounts,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  int get totalBalanceCents =>
      accounts.fold<int>(0, (sum, a) => sum + a.balanceCents);

  List<Account> get activeAccounts =>
      accounts.where((a) => a.status == 'active').toList();

  List<Account> get depositAccounts =>
      accounts.where((a) => a.type != 'cd' && a.status == 'active').toList();
}

class AccountsNotifier extends StateNotifier<AccountsState> {
  AccountsNotifier() : super(const AccountsState());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final accounts = await GatewayClient.instance.getAccounts();
      state = state.copyWith(accounts: accounts, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> refresh() => load();

  Account? getById(String id) {
    try {
      return state.accounts.firstWhere((a) => a.id == id);
    } catch (_) {
      return null;
    }
  }
}

final accountsProvider =
    StateNotifierProvider<AccountsNotifier, AccountsState>((ref) {
  final notifier = AccountsNotifier();
  notifier.load();
  return notifier;
});

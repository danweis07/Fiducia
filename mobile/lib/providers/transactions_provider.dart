import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/banking.dart';
import '../services/gateway_client.dart';

/// Transaction filter options.
enum TransactionFilter { all, credits, debits }

/// Transactions state — supports filtering, pagination, and per-account views.
class TransactionsState {
  final List<Transaction> transactions;
  final bool isLoading;
  final String? error;
  final TransactionFilter filter;
  final String? accountId;
  final bool hasMore;

  const TransactionsState({
    this.transactions = const [],
    this.isLoading = false,
    this.error,
    this.filter = TransactionFilter.all,
    this.accountId,
    this.hasMore = true,
  });

  TransactionsState copyWith({
    List<Transaction>? transactions,
    bool? isLoading,
    String? error,
    TransactionFilter? filter,
    String? accountId,
    bool? hasMore,
  }) {
    return TransactionsState(
      transactions: transactions ?? this.transactions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      filter: filter ?? this.filter,
      accountId: accountId ?? this.accountId,
      hasMore: hasMore ?? this.hasMore,
    );
  }

  List<Transaction> get filteredTransactions {
    switch (filter) {
      case TransactionFilter.credits:
        return transactions.where((t) => t.isCredit).toList();
      case TransactionFilter.debits:
        return transactions.where((t) => !t.isCredit).toList();
      case TransactionFilter.all:
        return transactions;
    }
  }

  List<Transaction> get pendingTransactions =>
      transactions.where((t) => t.status == 'pending').toList();

  List<Transaction> get postedTransactions =>
      transactions.where((t) => t.status != 'pending').toList();
}

class TransactionsNotifier extends StateNotifier<TransactionsState> {
  TransactionsNotifier() : super(const TransactionsState());

  Future<void> load({String? accountId, int limit = 50}) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
      accountId: accountId,
    );
    try {
      final txns = await GatewayClient.instance.getTransactions(
        accountId: accountId,
        limit: limit,
      );
      state = state.copyWith(
        transactions: txns,
        isLoading: false,
        hasMore: txns.length >= limit,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore) return;

    state = state.copyWith(isLoading: true);
    try {
      final txns = await GatewayClient.instance.getTransactions(
        accountId: state.accountId,
        limit: 50,
        offset: state.transactions.length,
      );
      state = state.copyWith(
        transactions: [...state.transactions, ...txns],
        isLoading: false,
        hasMore: txns.length >= 50,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setFilter(TransactionFilter filter) {
    state = state.copyWith(filter: filter);
  }

  Future<void> refresh() => load(accountId: state.accountId);
}

final transactionsProvider =
    StateNotifierProvider<TransactionsNotifier, TransactionsState>((ref) {
  return TransactionsNotifier();
});

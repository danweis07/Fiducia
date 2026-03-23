/**
 * Banking Hooks — Barrel Export
 *
 * Core banking domain hooks for accounts, transactions, transfers,
 * cards, loans, and other primary banking operations.
 *
 * @example
 *   import { useAccounts, useTransfer, useCards } from '@/hooks/banking';
 */

export { useAccounts, useAccount, useAccountSummary, accountKeys } from "./useAccounts";
export { useTransactions, useTransaction, transactionKeys } from "./useTransactions";
export type { TransactionListParams } from "./useTransactions";
export { useTransfers, useCreateTransfer, useCancelTransfer, transferKeys } from "./useTransfer";
export type { CreateTransferInput, TransferListParams } from "./useTransfer";
export * from "./useBeneficiaries";
export * from "./useCards";
export * from "./useStatements";
export * from "./useLoans";
export * from "./useCharges";
export * from "./useCDMaturity";
export * from "./useStandingInstructions";
export * from "./useOverdraft";
export * from "./useSavingsGoals";
export * from "./useJointAccounts";
export * from "./useCheckOrders";
export * from "./useStopPayments";
export * from "./useCashFlow";

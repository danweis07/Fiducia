/**
 * Stablecoin Settlement Adapter Interface
 *
 * Defines the contract for regulated stablecoin and digital asset settlement
 * rails for instant cross-border B2B settlement.
 *
 * Providers: Circle (USDC), Paxos (USDP/PYUSD), BVNK (fiat↔crypto bridge)
 *
 * These providers enable:
 *   - USDC/USDP minting and redemption (fiat ↔ stablecoin)
 *   - On-chain stablecoin transfers (Ethereum, Solana, etc.)
 *   - Fiat-in/crypto-out and crypto-in/fiat-out workflows
 *   - Regulated treasury management with stablecoin reserves
 *
 * All fiat monetary values are integer minor units (cents).
 * Stablecoin amounts use the token's native decimals (typically 6 for USDC).
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// STABLECOIN TYPES
// =============================================================================

/** Supported stablecoin assets */
export type StablecoinAsset = 'USDC' | 'USDP' | 'PYUSD' | 'EURC';

/** Supported blockchain networks */
export type BlockchainNetwork = 'ethereum' | 'solana' | 'polygon' | 'avalanche' | 'stellar' | 'algorand' | 'base' | 'arbitrum';

/** Transfer status */
export type StablecoinTransferStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Mint/Redeem (fiat↔stablecoin) status */
export type MintRedeemStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

// =============================================================================
// DATA MODELS
// =============================================================================

export interface StablecoinWallet {
  /** Wallet ID */
  walletId: string;
  /** Blockchain address */
  address: string;
  /** Stablecoin asset */
  asset: StablecoinAsset;
  /** Network */
  network: BlockchainNetwork;
  /** Balance in token's smallest unit (e.g., 6 decimals for USDC) */
  balanceSmallestUnit: string;
  /** Human-readable balance (e.g., "1000.50") */
  balanceDisplay: string;
  /** Status */
  status: 'active' | 'frozen' | 'closed';
  /** Created at (ISO 8601) */
  createdAt: string;
}

export interface StablecoinTransfer {
  /** Transfer ID */
  transferId: string;
  /** Source wallet/address */
  sourceAddress: string;
  /** Destination wallet/address */
  destinationAddress: string;
  /** Asset */
  asset: StablecoinAsset;
  /** Network */
  network: BlockchainNetwork;
  /** Amount in token's smallest unit */
  amountSmallestUnit: string;
  /** Human-readable amount */
  amountDisplay: string;
  /** On-chain transaction hash (null if pending) */
  txHash: string | null;
  /** Status */
  status: StablecoinTransferStatus;
  /** Fee in token's smallest unit */
  feeSmallestUnit: string;
  /** Created at (ISO 8601) */
  createdAt: string;
  /** Completed at (ISO 8601) */
  completedAt: string | null;
}

export interface MintRedeemOperation {
  /** Operation ID */
  operationId: string;
  /** Type: mint (fiat→stablecoin) or redeem (stablecoin→fiat) */
  type: 'mint' | 'redeem';
  /** Asset */
  asset: StablecoinAsset;
  /** Fiat amount in cents */
  fiatAmountCents: number;
  /** Fiat currency (ISO 4217) */
  fiatCurrency: string;
  /** Stablecoin amount in smallest unit */
  stablecoinAmountSmallestUnit: string;
  /** Wallet ID */
  walletId: string;
  /** Bank account ID (for fiat leg) */
  bankAccountId: string;
  /** Status */
  status: MintRedeemStatus;
  /** Fee in cents */
  feeCents: number;
  /** Created at (ISO 8601) */
  createdAt: string;
  /** Completed at (ISO 8601) */
  completedAt: string | null;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface CreateWalletRequest {
  tenantId: string;
  userId: string;
  asset: StablecoinAsset;
  network: BlockchainNetwork;
}

export interface ListWalletsRequest {
  tenantId: string;
  userId: string;
  asset?: StablecoinAsset;
  limit?: number;
  offset?: number;
}

export interface ListWalletsResponse {
  wallets: StablecoinWallet[];
  total: number;
}

export interface SendTransferRequest {
  tenantId: string;
  userId: string;
  /** Source wallet ID */
  sourceWalletId: string;
  /** Destination blockchain address */
  destinationAddress: string;
  /** Asset */
  asset: StablecoinAsset;
  /** Network */
  network: BlockchainNetwork;
  /** Amount in token's smallest unit */
  amountSmallestUnit: string;
  /** Idempotency key */
  idempotencyKey: string;
}

export interface GetTransferRequest {
  tenantId: string;
  transferId: string;
}

export interface ListTransfersRequest {
  tenantId: string;
  userId: string;
  walletId?: string;
  status?: StablecoinTransferStatus;
  limit?: number;
  offset?: number;
}

export interface ListTransfersResponse {
  transfers: StablecoinTransfer[];
  total: number;
}

export interface MintRequest {
  tenantId: string;
  userId: string;
  /** Wallet ID to mint into */
  walletId: string;
  /** Bank account ID to debit fiat from */
  bankAccountId: string;
  /** Fiat amount in cents */
  fiatAmountCents: number;
  /** Fiat currency */
  fiatCurrency: string;
  /** Target asset */
  asset: StablecoinAsset;
  /** Idempotency key */
  idempotencyKey: string;
}

export interface RedeemRequest {
  tenantId: string;
  userId: string;
  /** Wallet ID to redeem from */
  walletId: string;
  /** Bank account ID to credit fiat to */
  bankAccountId: string;
  /** Stablecoin amount in smallest unit */
  stablecoinAmountSmallestUnit: string;
  /** Target fiat currency */
  fiatCurrency: string;
  /** Asset */
  asset: StablecoinAsset;
  /** Idempotency key */
  idempotencyKey: string;
}

export interface GetOperationRequest {
  tenantId: string;
  operationId: string;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Stablecoin Settlement adapter — abstracts regulated stablecoin operations.
 *
 * Implementations handle provider-specific APIs (Circle, Paxos, BVNK)
 * while exposing a uniform interface for wallet management, transfers,
 * and fiat↔stablecoin conversions.
 */
export interface StablecoinAdapter extends BaseAdapter {
  /** Create a stablecoin wallet */
  createWallet(request: CreateWalletRequest): Promise<StablecoinWallet>;

  /** List wallets */
  listWallets(request: ListWalletsRequest): Promise<ListWalletsResponse>;

  /** Send stablecoin transfer */
  sendTransfer(request: SendTransferRequest): Promise<StablecoinTransfer>;

  /** Get transfer status */
  getTransfer(request: GetTransferRequest): Promise<StablecoinTransfer>;

  /** List transfers */
  listTransfers(request: ListTransfersRequest): Promise<ListTransfersResponse>;

  /** Mint stablecoins (fiat → stablecoin) */
  mint(request: MintRequest): Promise<MintRedeemOperation>;

  /** Redeem stablecoins (stablecoin → fiat) */
  redeem(request: RedeemRequest): Promise<MintRedeemOperation>;

  /** Get mint/redeem operation status */
  getOperation(request: GetOperationRequest): Promise<MintRedeemOperation>;
}

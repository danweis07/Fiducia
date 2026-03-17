/**
 * Mock Stablecoin Settlement Adapter
 *
 * Deterministic stablecoin operations for development and testing.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  StablecoinAdapter,
  CreateWalletRequest,
  StablecoinWallet,
  ListWalletsRequest,
  ListWalletsResponse,
  SendTransferRequest,
  StablecoinTransfer,
  GetTransferRequest,
  ListTransfersRequest,
  ListTransfersResponse,
  MintRequest,
  RedeemRequest,
  MintRedeemOperation,
  GetOperationRequest,
} from './types.ts';

const walletStore = new Map<string, StablecoinWallet>();
const transferStore = new Map<string, StablecoinTransfer>();
const operationStore = new Map<string, MintRedeemOperation>();

export class MockStablecoinAdapter implements StablecoinAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-stablecoin',
    name: 'Mock Stablecoin Settlement',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
  }

  async createWallet(request: CreateWalletRequest): Promise<StablecoinWallet> {
    await new Promise((r) => setTimeout(r, 300));
    const wallet: StablecoinWallet = {
      walletId: `mock_wallet_${crypto.randomUUID()}`,
      address: `0x${Array.from(crypto.getRandomValues(new Uint8Array(20))).map((b) => b.toString(16).padStart(2, '0')).join('')}`,
      asset: request.asset,
      network: request.network,
      balanceSmallestUnit: '0',
      balanceDisplay: '0.00',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    walletStore.set(wallet.walletId, wallet);
    return wallet;
  }

  async listWallets(request: ListWalletsRequest): Promise<ListWalletsResponse> {
    await new Promise((r) => setTimeout(r, 100));
    let wallets = Array.from(walletStore.values());
    if (request.asset) wallets = wallets.filter((w) => w.asset === request.asset);
    const total = wallets.length;
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 25;
    return { wallets: wallets.slice(offset, offset + limit), total };
  }

  async sendTransfer(request: SendTransferRequest): Promise<StablecoinTransfer> {
    await new Promise((r) => setTimeout(r, 500));
    const transfer: StablecoinTransfer = {
      transferId: `mock_tx_${crypto.randomUUID()}`,
      sourceAddress: '0xmocksource',
      destinationAddress: request.destinationAddress,
      asset: request.asset,
      network: request.network,
      amountSmallestUnit: request.amountSmallestUnit,
      amountDisplay: (parseInt(request.amountSmallestUnit, 10) / 1_000_000).toFixed(2),
      txHash: null,
      status: 'pending',
      feeSmallestUnit: '1000',
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    transferStore.set(transfer.transferId, transfer);
    return transfer;
  }

  async getTransfer(request: GetTransferRequest): Promise<StablecoinTransfer> {
    await new Promise((r) => setTimeout(r, 100));
    const transfer = transferStore.get(request.transferId);
    if (!transfer) throw new Error(`Transfer not found: ${request.transferId}`);
    return transfer;
  }

  async listTransfers(request: ListTransfersRequest): Promise<ListTransfersResponse> {
    await new Promise((r) => setTimeout(r, 100));
    let transfers = Array.from(transferStore.values());
    if (request.status) transfers = transfers.filter((t) => t.status === request.status);
    const total = transfers.length;
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 25;
    return { transfers: transfers.slice(offset, offset + limit), total };
  }

  async mint(request: MintRequest): Promise<MintRedeemOperation> {
    await new Promise((r) => setTimeout(r, 800));
    const stablecoinAmount = String(request.fiatAmountCents * 10000); // cents to 6 decimals
    const op: MintRedeemOperation = {
      operationId: `mock_mint_${crypto.randomUUID()}`,
      type: 'mint',
      asset: request.asset,
      fiatAmountCents: request.fiatAmountCents,
      fiatCurrency: request.fiatCurrency,
      stablecoinAmountSmallestUnit: stablecoinAmount,
      walletId: request.walletId,
      bankAccountId: request.bankAccountId,
      status: 'processing',
      feeCents: Math.round(request.fiatAmountCents * 0.001),
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    operationStore.set(op.operationId, op);
    return op;
  }

  async redeem(request: RedeemRequest): Promise<MintRedeemOperation> {
    await new Promise((r) => setTimeout(r, 800));
    const fiatCents = Math.floor(parseInt(request.stablecoinAmountSmallestUnit, 10) / 10000);
    const op: MintRedeemOperation = {
      operationId: `mock_redeem_${crypto.randomUUID()}`,
      type: 'redeem',
      asset: request.asset,
      fiatAmountCents: fiatCents,
      fiatCurrency: request.fiatCurrency,
      stablecoinAmountSmallestUnit: request.stablecoinAmountSmallestUnit,
      walletId: request.walletId,
      bankAccountId: request.bankAccountId,
      status: 'processing',
      feeCents: Math.round(fiatCents * 0.001),
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    operationStore.set(op.operationId, op);
    return op;
  }

  async getOperation(request: GetOperationRequest): Promise<MintRedeemOperation> {
    await new Promise((r) => setTimeout(r, 100));
    const op = operationStore.get(request.operationId);
    if (!op) throw new Error(`Operation not found: ${request.operationId}`);
    return op;
  }
}

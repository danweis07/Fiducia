// TODO: Provisional integration — not yet validated in production.
/**
 * Circle (USDC) Stablecoin Adapter
 *
 * Integrates with Circle's Programmable Wallets and Payments API for
 * USDC minting, redemption, and on-chain transfers. USDC is a regulated
 * stablecoin backed 1:1 by US dollars and short-term treasuries.
 *
 * Circle API docs: https://developers.circle.com
 * Auth: API key via Authorization Bearer header
 *
 * IMPORTANT: Wallet addresses and transaction details must be handled
 * carefully. Never log private keys or full wallet addresses in production.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
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
  StablecoinTransferStatus,
  MintRedeemStatus,
  BlockchainNetwork,
} from './types.ts';

// =============================================================================
// CIRCLE API TYPES
// =============================================================================

interface CircleWallet {
  walletId: string;
  entityId: string;
  address: string;
  blockchain: string;
  state: string;
  balances: Array<{ amount: string; currency: string }>;
  createDate: string;
}

interface CircleTransfer {
  id: string;
  source: { type: string; id: string; address: string };
  destination: { type: string; address: string; chain: string };
  amount: { amount: string; currency: string };
  transactionHash: string | null;
  status: string;
  fees: { amount: string; currency: string };
  createDate: string;
  updateDate: string;
}

interface CirclePayment {
  id: string;
  type: string;
  status: string;
  amount: { amount: string; currency: string };
  fees: { amount: string; currency: string };
  source: { type: string; id: string };
  destination: { type: string; id: string };
  createDate: string;
  updateDate: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapCircleChain(chain: string): BlockchainNetwork {
  const map: Record<string, BlockchainNetwork> = {
    ETH: 'ethereum', SOL: 'solana', MATIC: 'polygon', AVAX: 'avalanche',
    ALGO: 'algorand', XLM: 'stellar', BASE: 'base', ARB: 'arbitrum',
  };
  return map[chain.toUpperCase()] ?? 'ethereum';
}

function toCircleChain(network: BlockchainNetwork): string {
  const map: Record<BlockchainNetwork, string> = {
    ethereum: 'ETH', solana: 'SOL', polygon: 'MATIC', avalanche: 'AVAX',
    algorand: 'ALGO', stellar: 'XLM', base: 'BASE', arbitrum: 'ARB',
  };
  return map[network] ?? 'ETH';
}

function mapCircleTransferStatus(status: string): StablecoinTransferStatus {
  switch (status.toLowerCase()) {
    case 'pending': return 'pending';
    case 'confirmed': return 'confirmed';
    case 'complete': return 'completed';
    case 'failed': return 'failed';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function mapCirclePaymentStatus(status: string): MintRedeemStatus {
  switch (status.toLowerCase()) {
    case 'pending': return 'pending';
    case 'confirmed': case 'processing': return 'processing';
    case 'complete': case 'paid': return 'completed';
    case 'failed': return 'failed';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

/** Convert USDC display amount (e.g., "100.50") to smallest unit (6 decimals) */
function toSmallestUnit(displayAmount: string): string {
  const parts = displayAmount.split('.');
  const whole = parts[0] ?? '0';
  const frac = (parts[1] ?? '').padEnd(6, '0').slice(0, 6);
  return String(BigInt(whole) * BigInt(1_000_000) + BigInt(frac));
}

/** Convert smallest unit to display amount */
function toDisplayAmount(smallestUnit: string): string {
  const n = BigInt(smallestUnit);
  const whole = n / BigInt(1_000_000);
  const frac = (n % BigInt(1_000_000)).toString().padStart(6, '0');
  return `${whole}.${frac.replace(/0+$/, '') || '0'}`;
}

// =============================================================================
// ADAPTER
// =============================================================================

export class CircleStablecoinAdapter implements StablecoinAdapter {
  readonly config: AdapterConfig = {
    id: 'circle',
    name: 'Circle USDC',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = Deno.env.get('CIRCLE_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('CIRCLE_BASE_URL') ?? 'https://api-sandbox.circle.com/v1';
  }

  private get sandbox(): boolean { return !this.apiKey; }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }
    try {
      await this.request<unknown>('GET', '/ping');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Unknown' };
    }
  }

  async createWallet(request: CreateWalletRequest): Promise<StablecoinWallet> {
    const data = await this.request<{ data: CircleWallet }>('POST', '/wallets', {
      idempotencyKey: crypto.randomUUID(),
      blockchain: toCircleChain(request.network),
    });
    return this.mapWallet(data.data);
  }

  async listWallets(request: ListWalletsRequest): Promise<ListWalletsResponse> {
    const params = new URLSearchParams();
    params.set('pageSize', String(request.limit ?? 25));
    const data = await this.request<{ data: CircleWallet[] }>('GET', `/wallets?${params.toString()}`);
    const wallets = data.data.map((w) => this.mapWallet(w));
    return { wallets, total: wallets.length };
  }

  async sendTransfer(request: SendTransferRequest): Promise<StablecoinTransfer> {
    console.warn(JSON.stringify({ level: 'info', adapter: 'circle', action: 'sendTransfer', tenantId: request.tenantId, timestamp: new Date().toISOString() }));

    const data = await this.request<{ data: CircleTransfer }>('POST', '/transfers', {
      idempotencyKey: request.idempotencyKey,
      source: { type: 'wallet', id: request.sourceWalletId },
      destination: { type: 'blockchain', address: request.destinationAddress, chain: toCircleChain(request.network) },
      amount: { amount: toDisplayAmount(request.amountSmallestUnit), currency: 'USD' },
    });
    return this.mapTransfer(data.data);
  }

  async getTransfer(request: GetTransferRequest): Promise<StablecoinTransfer> {
    const data = await this.request<{ data: CircleTransfer }>('GET', `/transfers/${request.transferId}`);
    return this.mapTransfer(data.data);
  }

  async listTransfers(request: ListTransfersRequest): Promise<ListTransfersResponse> {
    const params = new URLSearchParams();
    if (request.walletId) params.set('walletId', request.walletId);
    params.set('pageSize', String(request.limit ?? 25));
    const data = await this.request<{ data: CircleTransfer[] }>('GET', `/transfers?${params.toString()}`);
    const transfers = data.data.map((t) => this.mapTransfer(t));
    return { transfers, total: transfers.length };
  }

  async mint(request: MintRequest): Promise<MintRedeemOperation> {
    const data = await this.request<{ data: CirclePayment }>('POST', '/payments', {
      idempotencyKey: request.idempotencyKey,
      source: { type: 'wire', id: request.bankAccountId },
      destination: { type: 'wallet', id: request.walletId },
      amount: { amount: (request.fiatAmountCents / 100).toFixed(2), currency: request.fiatCurrency },
    });
    return this.mapOperation(data.data, 'mint', request.walletId, request.bankAccountId, request.asset);
  }

  async redeem(request: RedeemRequest): Promise<MintRedeemOperation> {
    const displayAmount = toDisplayAmount(request.stablecoinAmountSmallestUnit);
    const data = await this.request<{ data: CirclePayment }>('POST', '/payouts', {
      idempotencyKey: request.idempotencyKey,
      source: { type: 'wallet', id: request.walletId },
      destination: { type: 'wire', id: request.bankAccountId },
      amount: { amount: displayAmount, currency: request.fiatCurrency },
    });
    return this.mapOperation(data.data, 'redeem', request.walletId, request.bankAccountId, request.asset);
  }

  async getOperation(request: GetOperationRequest): Promise<MintRedeemOperation> {
    const data = await this.request<{ data: CirclePayment }>('GET', `/payments/${request.operationId}`);
    return this.mapOperation(data.data, 'mint', '', '', 'USDC');
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) throw new Error('Circle adapter in sandbox mode — CIRCLE_API_KEY not configured');
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Circle API error (${res.status}): ${errBody}`);
    }
    return res.json();
  }

  private mapWallet(data: CircleWallet): StablecoinWallet {
    const usdcBalance = data.balances.find((b) => b.currency === 'USD') ?? { amount: '0', currency: 'USD' };
    return {
      walletId: data.walletId,
      address: data.address,
      asset: 'USDC',
      network: mapCircleChain(data.blockchain),
      balanceSmallestUnit: toSmallestUnit(usdcBalance.amount),
      balanceDisplay: usdcBalance.amount,
      status: data.state === 'active' ? 'active' : 'frozen',
      createdAt: data.createDate,
    };
  }

  private mapTransfer(data: CircleTransfer): StablecoinTransfer {
    return {
      transferId: data.id,
      sourceAddress: data.source.address ?? data.source.id,
      destinationAddress: data.destination.address,
      asset: 'USDC',
      network: mapCircleChain(data.destination.chain),
      amountSmallestUnit: toSmallestUnit(data.amount.amount),
      amountDisplay: data.amount.amount,
      txHash: data.transactionHash,
      status: mapCircleTransferStatus(data.status),
      feeSmallestUnit: toSmallestUnit(data.fees?.amount ?? '0'),
      createdAt: data.createDate,
      completedAt: data.status === 'complete' ? data.updateDate : null,
    };
  }

  private mapOperation(
    data: CirclePayment, type: 'mint' | 'redeem',
    walletId: string, bankAccountId: string, asset: import('./types.ts').StablecoinAsset,
  ): MintRedeemOperation {
    const amountCents = Math.round(parseFloat(data.amount.amount) * 100);
    const feeCents = Math.round(parseFloat(data.fees?.amount ?? '0') * 100);
    return {
      operationId: data.id,
      type,
      asset,
      fiatAmountCents: amountCents,
      fiatCurrency: data.amount.currency,
      stablecoinAmountSmallestUnit: toSmallestUnit(data.amount.amount),
      walletId,
      bankAccountId,
      status: mapCirclePaymentStatus(data.status),
      feeCents,
      createdAt: data.createDate,
      completedAt: data.status === 'complete' ? data.updateDate : null,
    };
  }
}

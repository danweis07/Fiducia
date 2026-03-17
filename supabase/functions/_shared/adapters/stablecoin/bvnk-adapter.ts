// TODO: Provisional integration — not yet validated in production.
/**
 * BVNK Stablecoin Adapter
 *
 * Integrates with BVNK's crypto-to-fiat bridge for hybrid settlement
 * workflows. BVNK specializes in bridging traditional banking (IBANs)
 * with stablecoin rails, enabling "crypto-in, fiat-out" workflows.
 *
 * BVNK API docs: https://docs.bvnk.com
 * Auth: API key via Authorization header
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
// MAPPING HELPERS
// =============================================================================

function mapBVNKStatus(status: string): StablecoinTransferStatus {
  switch (status.toUpperCase()) {
    case 'PENDING': case 'PROCESSING': return 'pending';
    case 'DETECTED': case 'CONFIRMING': return 'confirmed';
    case 'COMPLETE': return 'completed';
    case 'FAILED': case 'EXPIRED': return 'failed';
    case 'CANCELLED': return 'cancelled';
    default: return 'pending';
  }
}

function mapBVNKPaymentStatus(status: string): MintRedeemStatus {
  switch (status.toUpperCase()) {
    case 'PENDING': return 'pending';
    case 'PROCESSING': case 'DETECTED': return 'processing';
    case 'COMPLETE': return 'completed';
    case 'FAILED': case 'EXPIRED': return 'failed';
    case 'CANCELLED': return 'cancelled';
    default: return 'pending';
  }
}

function toSmallestUnit(amount: string): string {
  const parts = amount.split('.');
  const whole = parts[0] ?? '0';
  const frac = (parts[1] ?? '').padEnd(6, '0').slice(0, 6);
  return String(BigInt(whole) * BigInt(1_000_000) + BigInt(frac));
}

function fromSmallestUnit(smallest: string): string {
  const n = BigInt(smallest);
  const whole = n / BigInt(1_000_000);
  const frac = (n % BigInt(1_000_000)).toString().padStart(6, '0');
  return `${whole}.${frac.replace(/0+$/, '') || '0'}`;
}

// =============================================================================
// ADAPTER
// =============================================================================

export class BVNKStablecoinAdapter implements StablecoinAdapter {
  readonly config: AdapterConfig = {
    id: 'bvnk',
    name: 'BVNK Crypto-Fiat Bridge',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = Deno.env.get('BVNK_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('BVNK_BASE_URL') ?? 'https://api.sandbox.bvnk.com/api/v1';
  }

  private get sandbox(): boolean { return !this.apiKey; }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }
    try {
      await this.request<unknown>('GET', '/health');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Unknown' };
    }
  }

  async createWallet(request: CreateWalletRequest): Promise<StablecoinWallet> {
    const data = await this.request<{
      id: string; address: string; currency: string; protocol: string; balance: string; status: string; created_at: string;
    }>('POST', '/wallets', {
      currency: request.asset,
      protocol: request.network,
    });

    return {
      walletId: data.id,
      address: data.address,
      asset: request.asset,
      network: request.network,
      balanceSmallestUnit: toSmallestUnit(data.balance ?? '0'),
      balanceDisplay: data.balance ?? '0',
      status: 'active',
      createdAt: data.created_at,
    };
  }

  async listWallets(request: ListWalletsRequest): Promise<ListWalletsResponse> {
    const data = await this.request<{ items: Array<{
      id: string; address: string; currency: string; protocol: string; balance: string; status: string; created_at: string;
    }>; total: number }>('GET', '/wallets');

    const wallets: StablecoinWallet[] = data.items.map((w) => ({
      walletId: w.id,
      address: w.address,
      asset: (w.currency as import('./types.ts').StablecoinAsset) ?? 'USDC',
      network: (w.protocol as BlockchainNetwork) ?? 'ethereum',
      balanceSmallestUnit: toSmallestUnit(w.balance ?? '0'),
      balanceDisplay: w.balance ?? '0',
      status: w.status === 'ACTIVE' ? 'active' as const : 'frozen' as const,
      createdAt: w.created_at,
    }));

    return { wallets: wallets.slice(request.offset ?? 0, (request.offset ?? 0) + (request.limit ?? 25)), total: data.total };
  }

  async sendTransfer(request: SendTransferRequest): Promise<StablecoinTransfer> {
    console.warn(JSON.stringify({ level: 'info', adapter: 'bvnk', action: 'sendTransfer', tenantId: request.tenantId, timestamp: new Date().toISOString() }));

    const data = await this.request<{
      id: string; from_address: string; to_address: string; amount: string;
      currency: string; protocol: string; tx_hash: string | null; status: string;
      fee: string; created_at: string; updated_at: string;
    }>('POST', '/transfers', {
      from_wallet_id: request.sourceWalletId,
      to_address: request.destinationAddress,
      currency: request.asset,
      protocol: request.network,
      amount: fromSmallestUnit(request.amountSmallestUnit),
      reference: request.idempotencyKey,
    });

    return {
      transferId: data.id,
      sourceAddress: data.from_address,
      destinationAddress: data.to_address,
      asset: request.asset,
      network: request.network,
      amountSmallestUnit: toSmallestUnit(data.amount),
      amountDisplay: data.amount,
      txHash: data.tx_hash,
      status: mapBVNKStatus(data.status),
      feeSmallestUnit: toSmallestUnit(data.fee ?? '0'),
      createdAt: data.created_at,
      completedAt: data.status === 'COMPLETE' ? data.updated_at : null,
    };
  }

  async getTransfer(request: GetTransferRequest): Promise<StablecoinTransfer> {
    const data = await this.request<{
      id: string; from_address: string; to_address: string; amount: string;
      currency: string; protocol: string; tx_hash: string | null; status: string;
      fee: string; created_at: string; updated_at: string;
    }>('GET', `/transfers/${request.transferId}`);

    return {
      transferId: data.id,
      sourceAddress: data.from_address,
      destinationAddress: data.to_address,
      asset: (data.currency as import('./types.ts').StablecoinAsset) ?? 'USDC',
      network: (data.protocol as BlockchainNetwork) ?? 'ethereum',
      amountSmallestUnit: toSmallestUnit(data.amount),
      amountDisplay: data.amount,
      txHash: data.tx_hash,
      status: mapBVNKStatus(data.status),
      feeSmallestUnit: toSmallestUnit(data.fee ?? '0'),
      createdAt: data.created_at,
      completedAt: data.status === 'COMPLETE' ? data.updated_at : null,
    };
  }

  async listTransfers(request: ListTransfersRequest): Promise<ListTransfersResponse> {
    const params = new URLSearchParams();
    if (request.walletId) params.set('wallet_id', request.walletId);
    params.set('limit', String(request.limit ?? 25));
    params.set('offset', String(request.offset ?? 0));

    const data = await this.request<{ items: Array<{
      id: string; from_address: string; to_address: string; amount: string;
      currency: string; protocol: string; tx_hash: string | null; status: string;
      fee: string; created_at: string; updated_at: string;
    }>; total: number }>('GET', `/transfers?${params.toString()}`);

    return {
      transfers: data.items.map((t) => ({
        transferId: t.id,
        sourceAddress: t.from_address,
        destinationAddress: t.to_address,
        asset: (t.currency as import('./types.ts').StablecoinAsset) ?? 'USDC',
        network: (t.protocol as BlockchainNetwork) ?? 'ethereum',
        amountSmallestUnit: toSmallestUnit(t.amount),
        amountDisplay: t.amount,
        txHash: t.tx_hash,
        status: mapBVNKStatus(t.status),
        feeSmallestUnit: toSmallestUnit(t.fee ?? '0'),
        createdAt: t.created_at,
        completedAt: t.status === 'COMPLETE' ? t.updated_at : null,
      })),
      total: data.total,
    };
  }

  async mint(request: MintRequest): Promise<MintRedeemOperation> {
    // BVNK: "Pay-in" = fiat deposit that converts to crypto
    const data = await this.request<{
      id: string; status: string; fiat_amount: string; crypto_amount: string;
      fee: string; created_at: string; updated_at: string;
    }>('POST', '/pay/summary', {
      type: 'IN',
      currency: request.asset,
      amount: (request.fiatAmountCents / 100).toFixed(2),
      paid_currency: request.fiatCurrency,
      wallet_id: request.walletId,
      reference: request.idempotencyKey,
    });

    return {
      operationId: data.id,
      type: 'mint',
      asset: request.asset,
      fiatAmountCents: request.fiatAmountCents,
      fiatCurrency: request.fiatCurrency,
      stablecoinAmountSmallestUnit: toSmallestUnit(data.crypto_amount ?? '0'),
      walletId: request.walletId,
      bankAccountId: request.bankAccountId,
      status: mapBVNKPaymentStatus(data.status),
      feeCents: Math.round(parseFloat(data.fee ?? '0') * 100),
      createdAt: data.created_at,
      completedAt: data.status === 'COMPLETE' ? data.updated_at : null,
    };
  }

  async redeem(request: RedeemRequest): Promise<MintRedeemOperation> {
    // BVNK: "Pay-out" = crypto withdrawal that settles to fiat
    const data = await this.request<{
      id: string; status: string; fiat_amount: string; crypto_amount: string;
      fee: string; created_at: string; updated_at: string;
    }>('POST', '/pay/summary', {
      type: 'OUT',
      currency: request.asset,
      amount: fromSmallestUnit(request.stablecoinAmountSmallestUnit),
      paid_currency: request.fiatCurrency,
      wallet_id: request.walletId,
      reference: request.idempotencyKey,
    });

    return {
      operationId: data.id,
      type: 'redeem',
      asset: request.asset,
      fiatAmountCents: Math.round(parseFloat(data.fiat_amount ?? '0') * 100),
      fiatCurrency: request.fiatCurrency,
      stablecoinAmountSmallestUnit: request.stablecoinAmountSmallestUnit,
      walletId: request.walletId,
      bankAccountId: request.bankAccountId,
      status: mapBVNKPaymentStatus(data.status),
      feeCents: Math.round(parseFloat(data.fee ?? '0') * 100),
      createdAt: data.created_at,
      completedAt: data.status === 'COMPLETE' ? data.updated_at : null,
    };
  }

  async getOperation(request: GetOperationRequest): Promise<MintRedeemOperation> {
    const data = await this.request<{
      id: string; type: string; status: string; fiat_amount: string; crypto_amount: string;
      currency: string; paid_currency: string; fee: string; created_at: string; updated_at: string;
    }>('GET', `/pay/summary/${request.operationId}`);

    return {
      operationId: data.id,
      type: data.type === 'IN' ? 'mint' : 'redeem',
      asset: (data.currency as import('./types.ts').StablecoinAsset) ?? 'USDC',
      fiatAmountCents: Math.round(parseFloat(data.fiat_amount ?? '0') * 100),
      fiatCurrency: data.paid_currency ?? 'USD',
      stablecoinAmountSmallestUnit: toSmallestUnit(data.crypto_amount ?? '0'),
      walletId: '',
      bankAccountId: '',
      status: mapBVNKPaymentStatus(data.status),
      feeCents: Math.round(parseFloat(data.fee ?? '0') * 100),
      createdAt: data.created_at,
      completedAt: data.status === 'COMPLETE' ? data.updated_at : null,
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) throw new Error('BVNK adapter in sandbox mode — BVNK_API_KEY not configured');
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'Authorization': this.apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`BVNK API error (${res.status}): ${errBody}`);
    }
    return res.json();
  }
}

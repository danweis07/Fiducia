// TODO: Provisional integration — not yet validated in production.
/**
 * Paxos Stablecoin Adapter
 *
 * Integrates with Paxos's regulated stablecoin infrastructure for USDP
 * and PYUSD minting, redemption, and transfers. Paxos is a regulated
 * trust company providing institutional-grade stablecoin services.
 *
 * Paxos API docs: https://docs.paxos.com
 * Auth: OAuth2 client credentials
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
} from './types.ts';

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapPaxosTransferStatus(status: string): StablecoinTransferStatus {
  switch (status.toUpperCase()) {
    case 'PENDING': return 'pending';
    case 'CONFIRMED': return 'confirmed';
    case 'COMPLETED': case 'SETTLED': return 'completed';
    case 'FAILED': case 'REJECTED': return 'failed';
    case 'CANCELLED': return 'cancelled';
    default: return 'pending';
  }
}

function mapPaxosOperationStatus(status: string): MintRedeemStatus {
  switch (status.toUpperCase()) {
    case 'PENDING': return 'pending';
    case 'EXECUTING': case 'PROCESSING': return 'processing';
    case 'SETTLED': case 'COMPLETED': return 'completed';
    case 'FAILED': return 'failed';
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

export class PaxosStablecoinAdapter implements StablecoinAdapter {
  readonly config: AdapterConfig = {
    id: 'paxos',
    name: 'Paxos Stablecoin (USDP/PYUSD)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.clientId = Deno.env.get('PAXOS_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('PAXOS_CLIENT_SECRET') ?? '';
    this.baseUrl = Deno.env.get('PAXOS_BASE_URL') ?? 'https://api.sandbox.paxos.com/v2';
  }

  private get sandbox(): boolean { return !this.clientId || !this.clientSecret; }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }
    try {
      await this.ensureToken();
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Unknown' };
    }
  }

  async createWallet(request: CreateWalletRequest): Promise<StablecoinWallet> {
    const data = await this.request<{
      id: string; address: string; asset: string; blockchain: string; balance: string; status: string; created_at: string;
    }>('POST', '/transfer/deposit-addresses', {
      profile_id: request.userId,
      crypto_network: request.network.toUpperCase(),
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
      id: string; address: string; crypto_network: string; balance: string; status: string; created_at: string;
    }>; total: number }>('GET', '/transfer/deposit-addresses');

    const wallets: StablecoinWallet[] = data.items.map((w) => ({
      walletId: w.id,
      address: w.address,
      asset: request.asset ?? 'USDP',
      network: w.crypto_network.toLowerCase() as import('./types.ts').BlockchainNetwork,
      balanceSmallestUnit: toSmallestUnit(w.balance ?? '0'),
      balanceDisplay: w.balance ?? '0',
      status: w.status === 'ACTIVE' ? 'active' as const : 'frozen' as const,
      createdAt: w.created_at,
    }));

    return { wallets, total: data.total };
  }

  async sendTransfer(request: SendTransferRequest): Promise<StablecoinTransfer> {
    console.warn(JSON.stringify({ level: 'info', adapter: 'paxos', action: 'sendTransfer', tenantId: request.tenantId, timestamp: new Date().toISOString() }));

    const data = await this.request<{
      id: string; source_address: string; destination_address: string; amount: string;
      crypto_network: string; tx_hash: string | null; status: string; fee: string;
      created_at: string; updated_at: string;
    }>('POST', '/transfer/crypto-withdrawals', {
      profile_id: request.userId,
      destination_address: request.destinationAddress,
      asset: request.asset,
      crypto_network: request.network.toUpperCase(),
      amount: fromSmallestUnit(request.amountSmallestUnit),
      ref_id: request.idempotencyKey,
    });

    return {
      transferId: data.id,
      sourceAddress: data.source_address,
      destinationAddress: data.destination_address,
      asset: request.asset,
      network: request.network,
      amountSmallestUnit: toSmallestUnit(data.amount),
      amountDisplay: data.amount,
      txHash: data.tx_hash,
      status: mapPaxosTransferStatus(data.status),
      feeSmallestUnit: toSmallestUnit(data.fee ?? '0'),
      createdAt: data.created_at,
      completedAt: data.status === 'SETTLED' ? data.updated_at : null,
    };
  }

  async getTransfer(request: GetTransferRequest): Promise<StablecoinTransfer> {
    const data = await this.request<{
      id: string; source_address: string; destination_address: string; amount: string;
      asset: string; crypto_network: string; tx_hash: string | null; status: string;
      fee: string; created_at: string; updated_at: string;
    }>('GET', `/transfer/crypto-withdrawals/${request.transferId}`);

    return {
      transferId: data.id,
      sourceAddress: data.source_address,
      destinationAddress: data.destination_address,
      asset: (data.asset as import('./types.ts').StablecoinAsset) ?? 'USDP',
      network: data.crypto_network.toLowerCase() as import('./types.ts').BlockchainNetwork,
      amountSmallestUnit: toSmallestUnit(data.amount),
      amountDisplay: data.amount,
      txHash: data.tx_hash,
      status: mapPaxosTransferStatus(data.status),
      feeSmallestUnit: toSmallestUnit(data.fee ?? '0'),
      createdAt: data.created_at,
      completedAt: data.status === 'SETTLED' ? data.updated_at : null,
    };
  }

  async listTransfers(request: ListTransfersRequest): Promise<ListTransfersResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(request.limit ?? 25));
    params.set('offset', String(request.offset ?? 0));

    const data = await this.request<{ items: Array<{
      id: string; source_address: string; destination_address: string; amount: string;
      asset: string; crypto_network: string; tx_hash: string | null; status: string;
      fee: string; created_at: string; updated_at: string;
    }>; total: number }>('GET', `/transfer/crypto-withdrawals?${params.toString()}`);

    return {
      transfers: data.items.map((t) => ({
        transferId: t.id,
        sourceAddress: t.source_address,
        destinationAddress: t.destination_address,
        asset: (t.asset as import('./types.ts').StablecoinAsset) ?? 'USDP',
        network: t.crypto_network.toLowerCase() as import('./types.ts').BlockchainNetwork,
        amountSmallestUnit: toSmallestUnit(t.amount),
        amountDisplay: t.amount,
        txHash: t.tx_hash,
        status: mapPaxosTransferStatus(t.status),
        feeSmallestUnit: toSmallestUnit(t.fee ?? '0'),
        createdAt: t.created_at,
        completedAt: t.status === 'SETTLED' ? t.updated_at : null,
      })),
      total: data.total,
    };
  }

  async mint(request: MintRequest): Promise<MintRedeemOperation> {
    const data = await this.request<{
      id: string; status: string; amount: string; fee: string; created_at: string; updated_at: string;
    }>('POST', '/transfer/fiat-deposits', {
      profile_id: request.userId,
      amount: (request.fiatAmountCents / 100).toFixed(2),
      asset: request.asset,
      fiat_account_id: request.bankAccountId,
      ref_id: request.idempotencyKey,
    });

    return {
      operationId: data.id,
      type: 'mint',
      asset: request.asset,
      fiatAmountCents: request.fiatAmountCents,
      fiatCurrency: request.fiatCurrency,
      stablecoinAmountSmallestUnit: toSmallestUnit(data.amount),
      walletId: request.walletId,
      bankAccountId: request.bankAccountId,
      status: mapPaxosOperationStatus(data.status),
      feeCents: Math.round(parseFloat(data.fee ?? '0') * 100),
      createdAt: data.created_at,
      completedAt: data.status === 'SETTLED' ? data.updated_at : null,
    };
  }

  async redeem(request: RedeemRequest): Promise<MintRedeemOperation> {
    const displayAmount = fromSmallestUnit(request.stablecoinAmountSmallestUnit);
    const data = await this.request<{
      id: string; status: string; amount: string; fee: string; created_at: string; updated_at: string;
    }>('POST', '/transfer/fiat-withdrawals', {
      profile_id: request.userId,
      amount: displayAmount,
      asset: request.asset,
      fiat_account_id: request.bankAccountId,
      ref_id: request.idempotencyKey,
    });

    return {
      operationId: data.id,
      type: 'redeem',
      asset: request.asset,
      fiatAmountCents: Math.round(parseFloat(data.amount) * 100),
      fiatCurrency: request.fiatCurrency,
      stablecoinAmountSmallestUnit: request.stablecoinAmountSmallestUnit,
      walletId: request.walletId,
      bankAccountId: request.bankAccountId,
      status: mapPaxosOperationStatus(data.status),
      feeCents: Math.round(parseFloat(data.fee ?? '0') * 100),
      createdAt: data.created_at,
      completedAt: data.status === 'SETTLED' ? data.updated_at : null,
    };
  }

  async getOperation(request: GetOperationRequest): Promise<MintRedeemOperation> {
    const data = await this.request<{
      id: string; type: string; status: string; amount: string; asset: string;
      fee: string; created_at: string; updated_at: string;
    }>('GET', `/transfer/operations/${request.operationId}`);

    return {
      operationId: data.id,
      type: data.type === 'DEPOSIT' ? 'mint' : 'redeem',
      asset: (data.asset as import('./types.ts').StablecoinAsset) ?? 'USDP',
      fiatAmountCents: Math.round(parseFloat(data.amount) * 100),
      fiatCurrency: 'USD',
      stablecoinAmountSmallestUnit: toSmallestUnit(data.amount),
      walletId: '',
      bankAccountId: '',
      status: mapPaxosOperationStatus(data.status),
      feeCents: Math.round(parseFloat(data.fee ?? '0') * 100),
      createdAt: data.created_at,
      completedAt: data.status === 'SETTLED' ? data.updated_at : null,
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return;
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(this.clientId)}&client_secret=${encodeURIComponent(this.clientSecret)}&scope=transfer:read_crypto_deposit_address transfer:write_crypto_withdrawal`,
    });
    if (!res.ok) throw new Error(`Paxos auth failed: ${res.status}`);
    const token = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = token.access_token;
    this.tokenExpiresAt = Date.now() + (token.expires_in - 60) * 1000;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) throw new Error('Paxos adapter in sandbox mode — credentials not configured');
    await this.ensureToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Paxos API error (${res.status}): ${errBody}`);
    }
    return res.json();
  }
}

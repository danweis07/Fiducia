/**
 * Mock Card Provisioning Adapter
 *
 * Sandbox implementation with realistic card provisioning flows
 * for digital wallets, digital issuance, and digital-only cards.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CardProvisioningAdapter,
  CheckProvisioningEligibilityRequest,
  ProvisioningEligibility,
  InitiateProvisioningRequest,
  InitiateProvisioningResponse,
  CompleteProvisioningRequest,
  CompleteProvisioningResponse,
  GetCardCredentialsRequest,
  CardCredentials,
  SetTemporaryExpirationRequest,
  SetTemporaryExpirationResponse,
  RequestDigitalOnlyCardRequest,
  DigitalOnlyCard,
  RequestPhysicalCardRequest,
  RequestPhysicalCardResponse,
  ReportAndReplaceCardRequest,
  ReportAndReplaceCardResponse,
  GetProvisioningConfigRequest,
  ProvisioningConfig,
} from './types.ts';

// In-memory state for mock provisioned cards
const provisionedCards = new Map<string, Set<string>>();
let mockProvisioningCounter = 0;

export class MockCardProvisioningAdapter implements CardProvisioningAdapter {
  readonly config: AdapterConfig = {
    id: 'mock',
    name: 'Mock Card Provisioning (Sandbox)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
  }

  async getProvisioningConfig(_request: GetProvisioningConfigRequest): Promise<ProvisioningConfig> {
    return {
      provisioningEnabled: true,
      provisionPlusEnabled: true,
      digitalIssuanceEnabled: true,
      digitalOnlyEnabled: true,
      supportedWallets: ['apple_pay', 'google_pay', 'samsung_pay'],
      coreSystem: 'symitar',
      pinSelectionBeforeActivation: true,
    };
  }

  async checkEligibility(request: CheckProvisioningEligibilityRequest): Promise<ProvisioningEligibility> {
    const _walletKey = `${request.cardId}:${request.walletProvider}`;
    const alreadyInWallet = provisionedCards.get(request.cardId)?.has(request.walletProvider) ?? false;

    return {
      cardId: request.cardId,
      lastFour: '4321',
      walletProvider: request.walletProvider,
      status: alreadyInWallet ? 'already_provisioned' : 'eligible',
      activationStatus: 'issued_not_activated',
      cardCategory: 'physical',
      allowNonActivatedProvisioning: true,
      alreadyInWallet,
      supportedWallets: ['apple_pay', 'google_pay', 'samsung_pay'],
    };
  }

  async initiateProvisioning(request: InitiateProvisioningRequest): Promise<InitiateProvisioningResponse> {
    mockProvisioningCounter++;
    const provisioningId = `prov_mock_${mockProvisioningCounter}`;

    return {
      provisioningId,
      cardId: request.cardId,
      walletProvider: request.walletProvider,
      activationData: `mock_activation_data_${provisioningId}`,
      encryptedPassData: `mock_encrypted_pass_${provisioningId}`,
      ephemeralPublicKey: `mock_ephemeral_key_${provisioningId}`,
      status: 'pending',
    };
  }

  async completeProvisioning(request: CompleteProvisioningRequest): Promise<CompleteProvisioningResponse> {
    // Track provisioned card
    if (!provisionedCards.has(request.cardId)) {
      provisionedCards.set(request.cardId, new Set());
    }
    provisionedCards.get(request.cardId)!.add(request.walletProvider);

    return {
      provisioningId: request.provisioningId,
      cardId: request.cardId,
      lastFour: '4321',
      walletProvider: request.walletProvider,
      status: 'provisioned',
      digitalIssueStatus: 'pending_plastic',
      provisionedAt: new Date().toISOString(),
    };
  }

  async getCardCredentials(request: GetCardCredentialsRequest): Promise<CardCredentials> {
    // Mock: return sandbox credentials — NEVER use real data
    return {
      cardId: request.cardId,
      lastFour: '4321',
      pan: '4111111111114321',
      expirationDate: '04/27',
      cvv: '012',
      cardholderName: 'JANE DOE',
      isTemporaryExpiration: true,
      temporaryExpirationWarning: 'This is a temporary expiration date. If you add this card to subscription services, you may need to update credentials when your permanent card arrives.',
    };
  }

  async setTemporaryExpiration(request: SetTemporaryExpirationRequest): Promise<SetTemporaryExpirationResponse> {
    // Set to end of following month per Jack Henry spec
    const now = new Date();
    const endOfFollowingMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const tempExp = `${String(endOfFollowingMonth.getMonth() + 1).padStart(2, '0')}/${String(endOfFollowingMonth.getFullYear()).slice(-2)}`;

    return {
      cardId: request.cardId,
      temporaryExpirationDate: tempExp,
      setOnSwitch: true,
      setOnCore: true,
    };
  }

  async requestDigitalOnlyCard(request: RequestDigitalOnlyCardRequest): Promise<DigitalOnlyCard> {
    mockProvisioningCounter++;
    return {
      cardId: `card_dgt_${mockProvisioningCounter}`,
      accountId: request.accountId,
      lastFour: '9876',
      cardCategory: 'digital_only',
      activationStatus: 'active',
      expirationDate: '03/29',
      supportedWallets: ['apple_pay', 'google_pay', 'samsung_pay'],
      createdAt: new Date().toISOString(),
    };
  }

  async requestPhysicalCard(request: RequestPhysicalCardRequest): Promise<RequestPhysicalCardResponse> {
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    return {
      cardId: request.cardId,
      lastFour: '9876',
      cardCategory: 'physical',
      activationStatus: 'issued_not_activated',
      estimatedDeliveryDate: estimatedDelivery.toISOString().split('T')[0],
    };
  }

  async reportAndReplaceCard(request: ReportAndReplaceCardRequest): Promise<ReportAndReplaceCardResponse> {
    mockProvisioningCounter++;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    return {
      originalCardId: request.cardId,
      replacementCardId: `card_repl_${mockProvisioningCounter}`,
      lastFour: '5678',
      cardCategory: request.digitalOnly ? 'digital_only' : 'physical',
      activationStatus: request.digitalOnly ? 'active' : 'issued_not_activated',
      digitalIssueStatus: request.digitalOnly ? 'complete' : 'pending_plastic',
      supportedWallets: ['apple_pay', 'google_pay', 'samsung_pay'],
      estimatedDeliveryDate: request.digitalOnly ? undefined : estimatedDelivery.toISOString().split('T')[0],
    };
  }
}

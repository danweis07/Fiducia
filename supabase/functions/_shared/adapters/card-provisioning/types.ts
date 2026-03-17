/**
 * Card Provisioning Adapter Interface
 *
 * Defines the contract for digital card provisioning services that enable
 * push provisioning to digital wallets (Apple Pay, Google Pay, Samsung Pay),
 * digital issuance (view card credentials), and digital-only card management.
 *
 * Providers: Jack Henry (jXchange/CPS), mock.
 *
 * Key concepts:
 *   - Provisioning: Securely pushing card info to a digital wallet
 *   - Digital Issuance: Viewing card credentials (PAN, exp, CVV) before plastic arrives
 *   - Digital Only: Card issued without physical plastic
 *   - Provision Plus: Rules engine for approving token provisioning on non-activated cards
 *
 * All monetary values are integer cents.
 * PAN values are NEVER logged — only masked lastFour.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// CARD & WALLET TYPES
// =============================================================================

export type CardActivationStatus =
  | 'active'
  | 'issued_not_activated'    // InstantIssMail, OrderCard, OrderInProc, ReOrderCard
  | 'order_in_process'
  | 'lost'
  | 'stolen'
  | 'closed';

export type CardCategory =
  | 'physical'       // Standard physical card (EMV/DIC)
  | 'digital_only'   // Digital-only card (DGT) — no plastic issued
  | 'both';          // Both physical and digital-only cards on account

export type WalletProvider = 'apple_pay' | 'google_pay' | 'samsung_pay';

export type ProvisioningStatus =
  | 'eligible'              // Card can be provisioned
  | 'already_provisioned'   // Card already in wallet
  | 'not_eligible'          // Card not eligible (e.g., FI config)
  | 'requires_activation'   // Provision Plus not enabled; card must be activated first
  | 'pending';              // Provisioning in progress

export type DigitalIssueStatus =
  | 'not_issued'
  | 'pending_plastic'       // Status 4: Digital issue success, pending plastic
  | 'complete'              // Status 6: Digital issue complete
  | 'failed';

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

/** Check if a card is eligible for digital wallet provisioning */
export interface CheckProvisioningEligibilityRequest {
  userId: string;
  tenantId: string;
  cardId: string;
  walletProvider: WalletProvider;
}

export interface ProvisioningEligibility {
  cardId: string;
  lastFour: string;
  walletProvider: WalletProvider;
  status: ProvisioningStatus;
  activationStatus: CardActivationStatus;
  cardCategory: CardCategory;
  /** Whether the FI allows provisioning non-activated cards (Provision Plus) */
  allowNonActivatedProvisioning: boolean;
  /** Whether the card is already in the specified wallet */
  alreadyInWallet: boolean;
  supportedWallets: WalletProvider[];
}

/** Initiate push provisioning to a digital wallet */
export interface InitiateProvisioningRequest {
  userId: string;
  tenantId: string;
  cardId: string;
  walletProvider: WalletProvider;
  /** Device ID for web push provisioning (optional for in-app) */
  deviceId?: string;
}

export interface InitiateProvisioningResponse {
  provisioningId: string;
  cardId: string;
  walletProvider: WalletProvider;
  /** Opaque activation data for the wallet SDK */
  activationData: string;
  /** Encrypted card data for the wallet SDK */
  encryptedPassData: string;
  /** Ephemeral public key from the wallet provider */
  ephemeralPublicKey?: string;
  status: ProvisioningStatus;
}

/** Complete provisioning after wallet SDK callback */
export interface CompleteProvisioningRequest {
  userId: string;
  tenantId: string;
  provisioningId: string;
  cardId: string;
  walletProvider: WalletProvider;
  /** Token reference from the wallet provider */
  walletToken: string;
}

export interface CompleteProvisioningResponse {
  provisioningId: string;
  cardId: string;
  lastFour: string;
  walletProvider: WalletProvider;
  status: 'provisioned';
  digitalIssueStatus: DigitalIssueStatus;
  provisionedAt: string;
}

/** Retrieve card credentials for digital issuance (view card details) */
export interface GetCardCredentialsRequest {
  userId: string;
  tenantId: string;
  cardId: string;
}

export interface CardCredentials {
  cardId: string;
  lastFour: string;
  /** Full PAN — RESTRICTED, requires strong auth, NEVER log */
  pan: string;
  /** Expiration date in MM/YY format (uses temp exp if card not activated) */
  expirationDate: string;
  /** CVV2/CVC2 — always 3 digits (leading zeros padded) */
  cvv: string;
  /** Cardholder name */
  cardholderName: string;
  /** Whether a temporary expiration date is being used */
  isTemporaryExpiration: boolean;
  /** Warning if using temp exp for subscriptions */
  temporaryExpirationWarning?: string;
}

/** Request a digital-only card (no plastic) */
export interface RequestDigitalOnlyCardRequest {
  userId: string;
  tenantId: string;
  accountId: string;
}

export interface DigitalOnlyCard {
  cardId: string;
  accountId: string;
  lastFour: string;
  cardCategory: 'digital_only';
  activationStatus: 'active';
  expirationDate: string;
  supportedWallets: WalletProvider[];
  createdAt: string;
}

/** Request a physical card for an existing digital-only account */
export interface RequestPhysicalCardRequest {
  userId: string;
  tenantId: string;
  cardId: string;
}

export interface RequestPhysicalCardResponse {
  cardId: string;
  lastFour: string;
  cardCategory: 'physical';
  activationStatus: CardActivationStatus;
  estimatedDeliveryDate?: string;
}

/** Report card lost/stolen and request replacement */
export interface ReportAndReplaceCardRequest {
  userId: string;
  tenantId: string;
  cardId: string;
  reason: 'lost' | 'stolen';
  /** Whether to issue digital-only replacement (no plastic) */
  digitalOnly?: boolean;
}

export interface ReportAndReplaceCardResponse {
  originalCardId: string;
  replacementCardId: string;
  lastFour: string;
  cardCategory: CardCategory;
  activationStatus: CardActivationStatus;
  digitalIssueStatus: DigitalIssueStatus;
  supportedWallets: WalletProvider[];
  estimatedDeliveryDate?: string;
}

/** Get provisioning configuration for a tenant */
export interface GetProvisioningConfigRequest {
  tenantId: string;
}

export interface ProvisioningConfig {
  /** Whether digital provisioning is enabled for this tenant */
  provisioningEnabled: boolean;
  /** Whether Provision Plus (non-activated card provisioning) is enabled */
  provisionPlusEnabled: boolean;
  /** Whether digital issuance (view card credentials) is enabled */
  digitalIssuanceEnabled: boolean;
  /** Whether digital-only cards are available */
  digitalOnlyEnabled: boolean;
  /** Supported wallet providers */
  supportedWallets: WalletProvider[];
  /** Core system type for integration-specific behavior */
  coreSystem?: 'silverlake' | 'cif2020' | 'core_director' | 'symitar' | 'other';
  /** Whether PIN selection is available before card activation */
  pinSelectionBeforeActivation: boolean;
}

/** Set a temporary expiration date (for digital issuance on non-activated cards) */
export interface SetTemporaryExpirationRequest {
  userId: string;
  tenantId: string;
  cardId: string;
}

export interface SetTemporaryExpirationResponse {
  cardId: string;
  temporaryExpirationDate: string;
  setOnSwitch: boolean;
  setOnCore: boolean;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface CardProvisioningAdapter extends BaseAdapter {
  /** Get provisioning configuration for a tenant */
  getProvisioningConfig(request: GetProvisioningConfigRequest): Promise<ProvisioningConfig>;

  /** Check if a card is eligible for provisioning to a specific wallet */
  checkEligibility(request: CheckProvisioningEligibilityRequest): Promise<ProvisioningEligibility>;

  /** Initiate push provisioning to a digital wallet */
  initiateProvisioning(request: InitiateProvisioningRequest): Promise<InitiateProvisioningResponse>;

  /** Complete provisioning after wallet SDK callback */
  completeProvisioning(request: CompleteProvisioningRequest): Promise<CompleteProvisioningResponse>;

  /** Get card credentials for digital issuance (requires strong auth upstream) */
  getCardCredentials(request: GetCardCredentialsRequest): Promise<CardCredentials>;

  /** Set a temporary expiration date for non-activated cards */
  setTemporaryExpiration(request: SetTemporaryExpirationRequest): Promise<SetTemporaryExpirationResponse>;

  /** Request a digital-only card */
  requestDigitalOnlyCard(request: RequestDigitalOnlyCardRequest): Promise<DigitalOnlyCard>;

  /** Request physical plastic for a digital-only card */
  requestPhysicalCard(request: RequestPhysicalCardRequest): Promise<RequestPhysicalCardResponse>;

  /** Report card lost/stolen and issue replacement */
  reportAndReplaceCard(request: ReportAndReplaceCardRequest): Promise<ReportAndReplaceCardResponse>;
}

/**
 * Card Types
 *
 * Card entities including provisioning, digital wallets, travel notices,
 * and replacements.
 */

// =============================================================================
// CARDS
// =============================================================================

export type CardType = 'debit' | 'credit';
export type CardStatus = 'active' | 'locked' | 'lost' | 'stolen' | 'expired' | 'cancelled';

export interface Card {
  id: string;
  accountId: string;
  tenantId: string;
  userId: string;
  type: CardType;
  lastFour: string;
  cardholderName: string;
  status: CardStatus;
  dailyLimitCents: number;
  singleTransactionLimitCents: number;
  expirationDate: string;           // "MM/YY"
  isContactless: boolean;
  isVirtual: boolean;
  createdAt: string;
}

// =============================================================================
// CARD PROVISIONING — DIGITAL WALLETS & DIGITAL ISSUANCE
// =============================================================================

export type CardActivationStatus =
  | 'active'
  | 'issued_not_activated'
  | 'order_in_process'
  | 'lost'
  | 'stolen'
  | 'closed';

export type CardCategoryType = 'physical' | 'digital_only' | 'both';

export type WalletProvider = 'apple_pay' | 'google_pay' | 'samsung_pay';

export type ProvisioningStatus =
  | 'eligible'
  | 'already_provisioned'
  | 'not_eligible'
  | 'requires_activation'
  | 'pending';

export type DigitalIssueStatus =
  | 'not_issued'
  | 'pending_plastic'
  | 'complete'
  | 'failed';

export interface ProvisioningConfig {
  provisioningEnabled: boolean;
  provisionPlusEnabled: boolean;
  digitalIssuanceEnabled: boolean;
  digitalOnlyEnabled: boolean;
  supportedWallets: WalletProvider[];
  coreSystem?: string;
  pinSelectionBeforeActivation: boolean;
}

export interface ProvisioningEligibility {
  cardId: string;
  lastFour: string;
  walletProvider: WalletProvider;
  status: ProvisioningStatus;
  activationStatus: CardActivationStatus;
  cardCategory: CardCategoryType;
  allowNonActivatedProvisioning: boolean;
  alreadyInWallet: boolean;
  supportedWallets: WalletProvider[];
}

export interface ProvisioningResult {
  provisioningId: string;
  cardId: string;
  walletProvider: WalletProvider;
  activationData: string;
  encryptedPassData: string;
  ephemeralPublicKey?: string;
  status: ProvisioningStatus;
}

export interface ProvisioningCompletion {
  provisioningId: string;
  cardId: string;
  lastFour: string;
  walletProvider: WalletProvider;
  status: 'provisioned';
  digitalIssueStatus: DigitalIssueStatus;
  provisionedAt: string;
}

export interface CardCredentials {
  cardId: string;
  lastFour: string;
  pan: string;
  expirationDate: string;
  cvv: string;
  cardholderName: string;
  isTemporaryExpiration: boolean;
  temporaryExpirationWarning?: string;
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

export interface CardReplacementResult {
  originalCardId: string;
  replacementCardId: string;
  lastFour: string;
  cardCategory: CardCategoryType;
  activationStatus: CardActivationStatus;
  digitalIssueStatus: DigitalIssueStatus;
  supportedWallets: WalletProvider[];
  estimatedDeliveryDate?: string;
}

// =============================================================================
// CARD SERVICES (TRAVEL NOTICES + REPLACEMENT)
// =============================================================================

export interface TravelNotice {
  id: string;
  cardId: string;
  cardLastFour: string;
  destinations: { country: string; region?: string }[];
  startDate: string;
  endDate: string;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: string;
}

export type CardReplacementReason = 'lost' | 'stolen' | 'damaged' | 'expired' | 'name_change';
export type CardReplacementStatus = 'requested' | 'processing' | 'shipped' | 'delivered' | 'activated' | 'cancelled';

export interface CardReplacement {
  id: string;
  cardId: string;
  cardLastFour: string;
  reason: CardReplacementReason;
  shippingMethod: 'standard' | 'expedited';
  status: CardReplacementStatus;
  feeCents: number;
  newCardLastFour: string | null;
  trackingNumber: string | null;
  estimatedDeliveryDate: string | null;
  fraudReported: boolean;
  createdAt: string;
  updatedAt: string;
}

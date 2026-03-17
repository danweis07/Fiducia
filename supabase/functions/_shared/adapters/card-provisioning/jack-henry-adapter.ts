// TODO: Provisional integration — not yet validated in production.
/**
 * Jack Henry Digital Provisioning Enablement Adapter
 *
 * Integrates with Jack Henry jXchange APIs and CPS switch to support:
 *   - Digital Provisioning: Push cards to Apple Pay, Google Pay, Samsung Pay
 *   - Digital Issuance: View card credentials (PAN, CVV, expiration) before plastic arrives
 *   - Digital Only: Issue cards without physical plastic
 *   - Provision Plus: Approve provisioning for non-activated cards
 *
 * Supported core systems:
 *   - SilverLake / CIF 20/20 (Release 2023+)
 *   - Core Director (Release 2026+ for CPS FIs)
 *   - Symitar (Release 2021.01+)
 *
 * jXchange API calls used:
 *   - EFTCardInq: Card status, activation, digital provisioning flags
 *   - ParmValSrch: ISO-level configuration (AllowDigitalInActType, AllowDigitalOnlyType)
 *   - CardCVVInq: Retrieve CVV2/CVC2 for digital issuance
 *   - CardTempExpDtMod: Set temporary expiration date on CPS switch
 *   - EFTCardMod: Update card fields on core (temp exp, card category)
 *   - EFTCardAdd: Create new digital-only card
 *   - CrCardHolderInq: Full-service credit card holder inquiry
 *
 * SECURITY:
 *   - PAN values are NEVER logged
 *   - CVV values are NEVER logged
 *   - All card data in transit uses TLS
 *   - Card credentials require strong authentication upstream
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CardProvisioningAdapter,
  CardActivationStatus,
  CardCategory,
  ProvisioningStatus,
  DigitalIssueStatus,
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

// =============================================================================
// JXCHANGE RESPONSE TYPES
// =============================================================================

interface JXchangeEFTCardInqResponse {
  EFTCardStatType: string;        // Card status (OrderCard, InstantIssMail, etc.)
  AllowDigitalInActType: boolean; // Allow provisioning of non-activated cards
  AllowDigitalOnlyType: boolean;  // Allow digital-only cards
  EFTCardCat: string;             // Card category (DGT = digital only)
  EFTCardExpDt: string;           // Current expiration date
  EFTCardPrevExpDt: string;       // Previous expiration date
  EFTCardTempExpDt: string;       // Temporary expiration date
  DigitalIssueStatus: number;     // 0=not issued, 4=pending plastic, 6=complete
  CardActDt: string;              // Card activation date
  CardNum: string;                // Card number (PAN) — RESTRICTED
  CardHolderName: string;
}

interface JXchangeCardCVVInqResponse {
  CardVerifId: number;  // CVV2/CVC2 as number (may lose leading zeros)
  CardCVVId: string;    // CVV2/CVC2 as string
}

interface JXchangeParmValSrchResponse {
  ParmValSrchRec: Array<{
    ParmValCode: string;
    ParmValDesc: string;
    ParmValInfoArray: Array<{
      ParmValDetail: string;
      ParmValTxt: string;
    }>;
  }>;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Map jXchange card status to our normalized activation status */
function mapActivationStatus(eftCardStatType: string, cardActDt: string): CardActivationStatus {
  // If activation date is populated and not the sentinel value, card is active
  if (cardActDt && cardActDt !== '0001-01-01') {
    return 'active';
  }

  switch (eftCardStatType) {
    case 'InstantIssMail':
    case 'OrderCard':
    case 'OrderInProc':
    case 'ReOrderCard':
      return 'issued_not_activated';
    case 'Lost':
      return 'lost';
    case 'Stolen':
      return 'stolen';
    case 'Closed':
      return 'closed';
    default:
      return 'active';
  }
}

/** Map jXchange card category to our normalized type */
function mapCardCategory(eftCardCat: string): CardCategory {
  return eftCardCat === 'DGT' ? 'digital_only' : 'physical';
}

/** Pad CVV to 3 digits with leading zeros per Jack Henry spec */
function padCvv(cvvId: string | undefined, cvvNumeric: number | undefined): string {
  if (cvvId) {
    return cvvId.padStart(3, '0');
  }
  if (cvvNumeric !== undefined) {
    return String(cvvNumeric).padStart(3, '0');
  }
  return '000';
}

/** Calculate end of following month for temporary expiration per JH spec */
function getTemporaryExpirationDate(): string {
  const now = new Date();
  const endOfFollowingMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const month = String(endOfFollowingMonth.getMonth() + 1).padStart(2, '0');
  const year = String(endOfFollowingMonth.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

/** Determine which expiration date to use for CVV inquiry per JH spec */
function resolveExpirationForCvv(
  cardInq: JXchangeEFTCardInqResponse,
): { expirationDate: string; isTemporary: boolean } {
  // If card is activated, use current expiration
  if (cardInq.CardActDt && cardInq.CardActDt !== '0001-01-01') {
    return { expirationDate: cardInq.EFTCardExpDt, isTemporary: false };
  }

  // If not activated: check previous expiration first
  if (cardInq.EFTCardPrevExpDt && cardInq.EFTCardPrevExpDt !== '0001-01-01') {
    return { expirationDate: cardInq.EFTCardPrevExpDt, isTemporary: false };
  }

  // Then check temporary expiration
  if (cardInq.EFTCardTempExpDt && cardInq.EFTCardTempExpDt !== '0001-01-01') {
    return { expirationDate: cardInq.EFTCardTempExpDt, isTemporary: true };
  }

  // No valid expiration — caller must set a temporary one first
  return { expirationDate: '', isTemporary: true };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class JackHenryCardProvisioningAdapter implements CardProvisioningAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly institutionId: string;
  private readonly coreSystem: 'silverlake' | 'cif2020' | 'core_director' | 'symitar';

  readonly config: AdapterConfig = {
    id: 'jack_henry',
    name: 'Jack Henry Digital Provisioning Enablement',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.baseUrl = Deno.env.get('JACK_HENRY_JXCHANGE_URL') ?? '';
    this.apiKey = Deno.env.get('JACK_HENRY_API_KEY') ?? '';
    this.institutionId = Deno.env.get('JACK_HENRY_INSTITUTION_ID') ?? '';

    const coreEnv = Deno.env.get('JACK_HENRY_CORE_SYSTEM') ?? 'symitar';
    this.coreSystem = coreEnv as typeof this.coreSystem;
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      // Lightweight call to verify jXchange connectivity
      await this.jxchangeCall('ParmValSrch', {
        ParmName: 'EFTCardProdCode',
        ParmSvcName: 'EFTCard',
      });
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'jXchange health check failed',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // PROVISIONING CONFIG
  // ---------------------------------------------------------------------------

  async getProvisioningConfig(_request: GetProvisioningConfigRequest): Promise<ProvisioningConfig> {
    const parmResponse = await this.getISOConfig();

    const allowDigitalInAct = parmResponse.some(
      p => p.ParmValTxt === 'AllowDigitalInActType' && p.ParmValDetail === 'true'
    );
    const allowDigitalOnly = parmResponse.some(
      p => p.ParmValTxt === 'AllowDigitalOnlyType' && p.ParmValDetail === 'true'
    );

    return {
      provisioningEnabled: true,
      provisionPlusEnabled: allowDigitalInAct,
      digitalIssuanceEnabled: allowDigitalInAct,
      digitalOnlyEnabled: allowDigitalOnly,
      supportedWallets: ['apple_pay', 'google_pay', 'samsung_pay'],
      coreSystem: this.coreSystem,
      pinSelectionBeforeActivation: this.coreSystem === 'symitar',
    };
  }

  // ---------------------------------------------------------------------------
  // ELIGIBILITY CHECK
  // ---------------------------------------------------------------------------

  async checkEligibility(request: CheckProvisioningEligibilityRequest): Promise<ProvisioningEligibility> {
    const cardInq = await this.eftCardInquiry(request.cardId);
    const activationStatus = mapActivationStatus(cardInq.EFTCardStatType, cardInq.CardActDt);
    const cardCategory = mapCardCategory(cardInq.EFTCardCat);

    let status: ProvisioningStatus = 'eligible';

    // If card is not activated and Provision Plus is not enabled, requires activation
    if (activationStatus === 'issued_not_activated' && !cardInq.AllowDigitalInActType) {
      status = 'requires_activation';
    }

    if (activationStatus === 'lost' || activationStatus === 'stolen' || activationStatus === 'closed') {
      status = 'not_eligible';
    }

    return {
      cardId: request.cardId,
      lastFour: cardInq.CardNum.slice(-4),
      walletProvider: request.walletProvider,
      status,
      activationStatus,
      cardCategory,
      allowNonActivatedProvisioning: cardInq.AllowDigitalInActType,
      alreadyInWallet: false, // Wallet-side check is handled by wallet SDK
      supportedWallets: ['apple_pay', 'google_pay', 'samsung_pay'],
    };
  }

  // ---------------------------------------------------------------------------
  // PROVISIONING FLOW
  // ---------------------------------------------------------------------------

  async initiateProvisioning(request: InitiateProvisioningRequest): Promise<InitiateProvisioningResponse> {
    // Verify card eligibility before provisioning
    const cardInq = await this.eftCardInquiry(request.cardId);
    const activationStatus = mapActivationStatus(cardInq.EFTCardStatType, cardInq.CardActDt);

    if (activationStatus === 'issued_not_activated' && !cardInq.AllowDigitalInActType) {
      throw new Error('Card must be activated before provisioning. Provision Plus is not enabled for this ISO.');
    }

    // For Symitar: if card is not activated, digital banking provider must update Digital Issue Status
    if (this.coreSystem === 'symitar' && activationStatus === 'issued_not_activated') {
      await this.updateSymitarDigitalIssueStatus(request.cardId, cardInq);
    }

    // Request provisioning data from CPS switch via token service
    const provisionData = await this.jxchangeCall('CardProvisionReq', {
      CardNum: cardInq.CardNum,
      WalletProvider: request.walletProvider,
      DeviceId: request.deviceId,
      InstitutionId: this.institutionId,
    });

    return {
      provisioningId: provisionData.ProvisionId ?? `prov_jh_${Date.now()}`,
      cardId: request.cardId,
      walletProvider: request.walletProvider,
      activationData: provisionData.ActivationData ?? '',
      encryptedPassData: provisionData.EncryptedPassData ?? '',
      ephemeralPublicKey: provisionData.EphemeralPublicKey,
      status: 'pending',
    };
  }

  async completeProvisioning(request: CompleteProvisioningRequest): Promise<CompleteProvisioningResponse> {
    const cardInq = await this.eftCardInquiry(request.cardId);

    // Notify CPS switch of successful provisioning
    await this.jxchangeCall('CardProvisionComplete', {
      ProvisionId: request.provisioningId,
      CardNum: cardInq.CardNum,
      WalletToken: request.walletToken,
      WalletProvider: request.walletProvider,
    });

    // For Symitar: update Digital Issue Status to 6 (complete) if card is already issued
    if (this.coreSystem === 'symitar') {
      const isIssued = cardInq.EFTCardStatType !== 'OrderCard' && cardInq.EFTCardStatType !== 'OrderInProc';
      if (isIssued && cardInq.DigitalIssueStatus !== 4) {
        await this.eftCardModify(request.cardId, { DigitalIssueStatus: 6 });
      }
    }

    return {
      provisioningId: request.provisioningId,
      cardId: request.cardId,
      lastFour: cardInq.CardNum.slice(-4),
      walletProvider: request.walletProvider,
      status: 'provisioned',
      digitalIssueStatus: this.mapDigitalIssueStatus(cardInq.DigitalIssueStatus),
      provisionedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // DIGITAL ISSUANCE — VIEW CARD CREDENTIALS
  // ---------------------------------------------------------------------------

  async getCardCredentials(request: GetCardCredentialsRequest): Promise<CardCredentials> {
    const cardInq = await this.eftCardInquiry(request.cardId);
    const { expirationDate, isTemporary } = resolveExpirationForCvv(cardInq);

    // If no valid expiration exists, we need to set a temporary one first
    let effectiveExpDate = expirationDate;
    if (!effectiveExpDate) {
      const tempResult = await this.setTemporaryExpiration({
        userId: request.userId,
        tenantId: request.tenantId,
        cardId: request.cardId,
      });
      effectiveExpDate = tempResult.temporaryExpirationDate;
    }

    // Obtain CVV2/CVC2 via jXchange CardCVVInq
    const cvvResponse = await this.jxchangeCall<JXchangeCardCVVInqResponse>('CardCVVInq', {
      CardNum: cardInq.CardNum,
      ExpDt: effectiveExpDate,
    });

    const cvv = padCvv(cvvResponse.CardCVVId, cvvResponse.CardVerifId);

    return {
      cardId: request.cardId,
      lastFour: cardInq.CardNum.slice(-4),
      pan: cardInq.CardNum,
      expirationDate: effectiveExpDate,
      cvv,
      cardholderName: cardInq.CardHolderName,
      isTemporaryExpiration: isTemporary || !expirationDate,
      temporaryExpirationWarning: (isTemporary || !expirationDate)
        ? 'This is a temporary expiration date. If you add this card to subscription services or recurring payments, you may need to update credentials when your permanent card arrives.'
        : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // TEMPORARY EXPIRATION
  // ---------------------------------------------------------------------------

  async setTemporaryExpiration(request: SetTemporaryExpirationRequest): Promise<SetTemporaryExpirationResponse> {
    const tempExpDate = getTemporaryExpirationDate();
    const cardInq = await this.eftCardInquiry(request.cardId);

    // Step 1: Set on CPS switch via CardTempExpDtMod
    await this.jxchangeCall('CardTempExpDtMod', {
      CardNum: cardInq.CardNum,
      TempExpDt: tempExpDate,
    });

    // Step 2: Set on core (varies by core system)
    let setOnCore = false;
    try {
      if (this.coreSystem === 'silverlake' || this.coreSystem === 'cif2020') {
        // EFTCardMod with EFTCardTempExpDt
        await this.eftCardModify(request.cardId, { EFTCardTempExpDt: tempExpDate });
        setOnCore = true;
      } else if (this.coreSystem === 'core_director') {
        // EFTCardMod with EFTCardAltExpDt (Credential Expiration Date)
        await this.eftCardModify(request.cardId, { EFTCardAltExpDt: tempExpDate });
        setOnCore = true;
      } else if (this.coreSystem === 'symitar') {
        // SymXchange: load temp exp into Previous Expiration Date field
        await this.symxchangeCall('CardRecord.Modify', {
          CardId: request.cardId,
          PreviousExpirationDate: tempExpDate,
        });
        setOnCore = true;
      }
    } catch (err) {
      console.error(`[JackHenry] Failed to set temp exp on core for card (lastFour: ${cardInq.CardNum.slice(-4)}):`, err instanceof Error ? err.message : 'Unknown error');
    }

    return {
      cardId: request.cardId,
      temporaryExpirationDate: tempExpDate,
      setOnSwitch: true,
      setOnCore,
    };
  }

  // ---------------------------------------------------------------------------
  // DIGITAL ONLY
  // ---------------------------------------------------------------------------

  async requestDigitalOnlyCard(request: RequestDigitalOnlyCardRequest): Promise<DigitalOnlyCard> {
    // Issue card with category DGT — no plastic produced, activated immediately
    const response = await this.jxchangeCall('EFTCardAdd', {
      AccountId: request.accountId,
      EFTCardCat: 'DGT',
      InstitutionId: this.institutionId,
    });

    return {
      cardId: response.CardId ?? `card_jh_${Date.now()}`,
      accountId: request.accountId,
      lastFour: (response.CardNum ?? '').slice(-4),
      cardCategory: 'digital_only',
      activationStatus: 'active',
      expirationDate: response.ExpDt ?? '',
      supportedWallets: ['apple_pay', 'google_pay', 'samsung_pay'],
      createdAt: new Date().toISOString(),
    };
  }

  async requestPhysicalCard(request: RequestPhysicalCardRequest): Promise<RequestPhysicalCardResponse> {
    const cardInq = await this.eftCardInquiry(request.cardId);

    if (this.coreSystem === 'core_director') {
      // Core Director requires a separate account record for physical card
      throw new Error('Core Director requires creating a separate account record for physical plastic. Contact your FI administrator.');
    }

    // For SilverLake/CIF 20/20: change card category from DGT to default
    // Get default card category from ISO config
    const isoConfig = await this.getISOConfig();
    const defaultCat = isoConfig.find(p => p.ParmValTxt === 'DefaultCardCategory');
    const targetCategory = defaultCat?.ParmValDetail ?? 'EMV';

    await this.eftCardModify(request.cardId, { EFTCardCat: targetCategory });

    return {
      cardId: request.cardId,
      lastFour: cardInq.CardNum.slice(-4),
      cardCategory: 'physical',
      activationStatus: 'issued_not_activated',
      estimatedDeliveryDate: this.estimateDeliveryDate(),
    };
  }

  // ---------------------------------------------------------------------------
  // LOST/STOLEN REPLACEMENT
  // ---------------------------------------------------------------------------

  async reportAndReplaceCard(request: ReportAndReplaceCardRequest): Promise<ReportAndReplaceCardResponse> {
    const cardInq = await this.eftCardInquiry(request.cardId);

    // Flag original card as lost/stolen on core and switch
    await this.eftCardModify(request.cardId, {
      EFTCardStatType: request.reason === 'lost' ? 'Lost' : 'Stolen',
    });

    // Request replacement card
    const replaceResponse = await this.jxchangeCall('EFTCardAdd', {
      AccountId: cardInq.CardNum, // Link to same account
      EFTCardCat: request.digitalOnly ? 'DGT' : undefined,
      ReplaceCardId: request.cardId,
      InstitutionId: this.institutionId,
    });

    const replacementCardId = replaceResponse.CardId ?? `card_repl_${Date.now()}`;
    const newLastFour = (replaceResponse.CardNum ?? '').slice(-4);

    return {
      originalCardId: request.cardId,
      replacementCardId,
      lastFour: newLastFour,
      cardCategory: request.digitalOnly ? 'digital_only' : 'physical',
      activationStatus: request.digitalOnly ? 'active' : 'issued_not_activated',
      digitalIssueStatus: request.digitalOnly ? 'complete' : 'not_issued',
      supportedWallets: ['apple_pay', 'google_pay', 'samsung_pay'],
      estimatedDeliveryDate: request.digitalOnly ? undefined : this.estimateDeliveryDate(),
    };
  }

  // =============================================================================
  // PRIVATE — jXchange API Client
  // =============================================================================

  private async jxchangeCall<T = Record<string, unknown>>(
    operation: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}/jxchange/v1/${operation}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Institution-Id': this.institutionId,
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(`jXchange ${operation} failed (${response.status}): ${errorBody}`);
    }

    return await response.json() as T;
  }

  private async symxchangeCall<T = Record<string, unknown>>(
    operation: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    const symxchangeUrl = Deno.env.get('JACK_HENRY_SYMXCHANGE_URL') ?? this.baseUrl;
    const url = `${symxchangeUrl}/symxchange/v1/${operation}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Institution-Id': this.institutionId,
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(`SymXchange ${operation} failed (${response.status}): ${errorBody}`);
    }

    return await response.json() as T;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE — Convenience wrappers
  // ---------------------------------------------------------------------------

  private async eftCardInquiry(cardId: string): Promise<JXchangeEFTCardInqResponse> {
    return this.jxchangeCall<JXchangeEFTCardInqResponse>('EFTCardInq', { CardId: cardId });
  }

  private async eftCardModify(cardId: string, fields: Record<string, unknown>): Promise<void> {
    await this.jxchangeCall('EFTCardMod', { CardId: cardId, ...fields });
  }

  private async getISOConfig(): Promise<Array<{ ParmValDetail: string; ParmValTxt: string }>> {
    const parmName = this.coreSystem === 'core_director' ? 'EFTCardISOCode' : 'EFTCardProdCode';

    const response = await this.jxchangeCall<JXchangeParmValSrchResponse>('ParmValSrch', {
      ParmName: parmName,
      ParmSvcName: 'EFTCard',
    });

    return response.ParmValSrchRec?.flatMap(rec =>
      rec.ParmValInfoArray?.map(info => ({
        ParmValDetail: info.ParmValDetail,
        ParmValTxt: info.ParmValTxt,
      })) ?? []
    ) ?? [];
  }

  /** Update Symitar Digital Issue Status and card fields per JH spec */
  private async updateSymitarDigitalIssueStatus(
    cardId: string,
    cardInq: JXchangeEFTCardInqResponse,
  ): Promise<void> {
    const isIssued = cardInq.EFTCardStatType !== 'OrderCard' && cardInq.EFTCardStatType !== 'OrderInProc';

    if (isIssued) {
      // Card already issued: set Digital Issue Status to 6 (complete)
      // unless it's already 4 (pending plastic) — do NOT change 4 to 6 per spec
      if (cardInq.DigitalIssueStatus !== 4) {
        await this.eftCardModify(cardId, { DigitalIssueStatus: 6 });
      }
    } else {
      // Card in pending order status: set fields per Symitar spec
      await this.eftCardModify(cardId, {
        DigitalIssueStatus: 4,   // Digital Issue Success - Pending Plastic
        CardStatus: 1,           // Issued
        EffectiveDate: new Date().toISOString().split('T')[0],
      });
    }
  }

  private mapDigitalIssueStatus(status: number): DigitalIssueStatus {
    switch (status) {
      case 4: return 'pending_plastic';
      case 6: return 'complete';
      default: return 'not_issued';
    }
  }

  private estimateDeliveryDate(): string {
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + 7);
    return delivery.toISOString().split('T')[0];
  }
}

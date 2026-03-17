/**
 * Gateway Domain — Cards, Card Provisioning, Card Replacements
 */

import type { CallGatewayFn } from './client';
import type {
  Card,
  ProvisioningConfig,
  ProvisioningEligibility,
  ProvisioningResult,
  ProvisioningCompletion,
  CardCredentials,
  DigitalOnlyCard,
  CardReplacementResult,
  WalletProvider,
  CardReplacement,
  CardReplacementReason,
} from '@/types';

export function createCardsDomain(callGateway: CallGatewayFn) {
  return {
    cards: {
      async list() {
        return callGateway<{ cards: Card[] }>('cards.list', {});
      },

      async lock(id: string) {
        return callGateway<{ card: Card }>('cards.lock', { id });
      },

      async unlock(id: string) {
        return callGateway<{ card: Card }>('cards.unlock', { id });
      },

      async setLimit(id: string, dailyLimitCents: number) {
        return callGateway<{ card: Card }>('cards.setLimit', { id, dailyLimitCents });
      },
    },

    cardProvisioning: {
      async config() {
        return callGateway<{ config: ProvisioningConfig }>('cardProvisioning.config', {});
      },

      async checkEligibility(cardId: string, walletProvider: WalletProvider) {
        return callGateway<{ eligibility: ProvisioningEligibility }>('cardProvisioning.checkEligibility', { cardId, walletProvider });
      },

      async initiate(cardId: string, walletProvider: WalletProvider, deviceId?: string) {
        return callGateway<ProvisioningResult>('cardProvisioning.initiate', { cardId, walletProvider, deviceId });
      },

      async complete(provisioningId: string, cardId: string, walletProvider: WalletProvider, walletToken: string) {
        return callGateway<ProvisioningCompletion>('cardProvisioning.complete', { provisioningId, cardId, walletProvider, walletToken });
      },

      async credentials(cardId: string) {
        return callGateway<{ credentials: CardCredentials }>('cardProvisioning.credentials', { cardId });
      },

      async setTempExpiration(cardId: string) {
        return callGateway<{ cardId: string; temporaryExpirationDate: string; setOnSwitch: boolean; setOnCore: boolean }>('cardProvisioning.setTempExpiration', { cardId });
      },

      async requestDigitalOnly(accountId: string) {
        return callGateway<{ card: DigitalOnlyCard }>('cardProvisioning.digitalOnly', { accountId });
      },

      async requestPhysical(cardId: string) {
        return callGateway<{ cardId: string; lastFour: string; cardCategory: string; activationStatus: string; estimatedDeliveryDate?: string }>('cardProvisioning.requestPhysical', { cardId });
      },

      async reportAndReplace(cardId: string, reason: 'lost' | 'stolen', digitalOnly?: boolean) {
        return callGateway<CardReplacementResult>('cardProvisioning.reportReplace', { cardId, reason, digitalOnly });
      },
    },

    cardReplacements: {
      async request(params: {
        cardId: string;
        reason: CardReplacementReason;
        shippingMethod: 'standard' | 'expedited';
        reportFraud?: boolean;
      }) {
        return callGateway<{ replacement: CardReplacement }>('cardServices.replacement.request', params);
      },
      async list(params: { limit?: number; offset?: number } = {}) {
        return callGateway<{ replacements: CardReplacement[] }>('cardServices.replacement.list', params);
      },
      async status(replacementId: string) {
        return callGateway<{ replacement: CardReplacement }>('cardServices.replacement.status', { replacementId });
      },
      async activate(replacementId: string, lastFourDigits: string) {
        return callGateway<{ success: boolean; replacementId: string }>('cardServices.replacement.activate', { replacementId, lastFourDigits });
      },
    },
  };
}

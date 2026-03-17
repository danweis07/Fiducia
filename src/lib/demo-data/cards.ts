/**
 * Demo data for cards and card provisioning.
 */

import {
  ActionHandler,
  TENANT_ID,
  CHECKING_ID,
  CARD_DEBIT_ID,
  CARD_CREDIT_ID,
  DEMO_USER,
} from './types';

// =============================================================================
// CARDS
// =============================================================================

const CARDS = [
  {
    id: CARD_DEBIT_ID,
    accountId: CHECKING_ID,
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    type: 'debit' as const,
    lastFour: '4521',
    cardholderName: 'DEMO USER',
    status: 'active' as const,
    dailyLimitCents: 500000,
    singleTransactionLimitCents: 250000,
    expirationDate: '12/28',
    isContactless: true,
    isVirtual: false,
    createdAt: '2023-01-15T00:00:00Z',
  },
  {
    id: CARD_CREDIT_ID,
    accountId: CHECKING_ID,
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    type: 'credit' as const,
    lastFour: '9832',
    cardholderName: 'DEMO USER',
    status: 'locked' as const,
    dailyLimitCents: 1000000,
    singleTransactionLimitCents: 500000,
    expirationDate: '03/27',
    isContactless: true,
    isVirtual: false,
    createdAt: '2023-06-01T00:00:00Z',
  },
];

// =============================================================================
// HANDLERS
// =============================================================================

export const cardHandlers: Record<string, ActionHandler> = {
  'cards.list': () => ({ cards: CARDS }),
  'cards.lock': (p) => ({
    card: { ...(CARDS.find((c) => c.id === p.id) || CARDS[0]), status: 'locked' },
  }),
  'cards.unlock': (p) => ({
    card: { ...(CARDS.find((c) => c.id === p.id) || CARDS[0]), status: 'active' },
  }),
  'cards.setLimit': (p) => ({
    card: { ...(CARDS.find((c) => c.id === p.id) || CARDS[0]), dailyLimitCents: p.dailyLimitCents },
  }),
};

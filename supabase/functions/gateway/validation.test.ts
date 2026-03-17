/**
 * Unit Tests for Gateway Validation Schemas
 *
 * Tests input validation for all gateway handler actions.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Deno for Node test runner
vi.stubGlobal('Deno', { env: { get: () => undefined } });

import { validateParams, ValidationError } from './validation.ts';

describe('validateParams', () => {
  // -------------------------------------------------------------------------
  // Accounts
  // -------------------------------------------------------------------------
  describe('accounts.list', () => {
    it('should apply defaults for limit and offset', () => {
      const result = validateParams('accounts.list', {});
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should coerce string numbers', () => {
      const result = validateParams('accounts.list', { limit: '10', offset: '5' });
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
    });
  });

  describe('accounts.get', () => {
    it('should require id', () => {
      expect(() => validateParams('accounts.get', {})).toThrow(ValidationError);
    });

    it('should accept valid id', () => {
      const result = validateParams('accounts.get', { id: 'abc-123' });
      expect(result.id).toBe('abc-123');
    });
  });

  // -------------------------------------------------------------------------
  // Transfers
  // -------------------------------------------------------------------------
  describe('transfers.create', () => {
    it('should require positive amountCents', () => {
      expect(() => validateParams('transfers.create', {
        fromAccountId: 'a', toAccountId: 'b', type: 'internal', amountCents: -100,
      })).toThrow(ValidationError);
    });

    it('should require either toAccountId or toBeneficiaryId', () => {
      expect(() => validateParams('transfers.create', {
        fromAccountId: 'a', type: 'internal', amountCents: 100,
      })).toThrow(ValidationError);
    });

    it('should accept valid transfer', () => {
      const result = validateParams('transfers.create', {
        fromAccountId: 'a', toAccountId: 'b', type: 'internal', amountCents: 5000,
      });
      expect(result.amountCents).toBe(5000);
    });
  });

  // -------------------------------------------------------------------------
  // RDC
  // -------------------------------------------------------------------------
  describe('rdc.deposit', () => {
    it('should require all fields', () => {
      expect(() => validateParams('rdc.deposit', {})).toThrow(ValidationError);
    });

    it('should accept valid deposit', () => {
      const result = validateParams('rdc.deposit', {
        accountId: 'acc-1',
        amountCents: 50000,
        frontImageBase64: 'data:image/png;base64,abc',
        backImageBase64: 'data:image/png;base64,def',
      });
      expect(result.amountCents).toBe(50000);
    });
  });

  // -------------------------------------------------------------------------
  // Bill Pay (adapter-backed)
  // -------------------------------------------------------------------------
  describe('billpay.billers.search', () => {
    it('should require search query', () => {
      expect(() => validateParams('billpay.billers.search', {})).toThrow(ValidationError);
    });

    it('should apply default limit', () => {
      const result = validateParams('billpay.billers.search', { query: 'electric' });
      expect(result.query).toBe('electric');
      expect(result.limit).toBe(20);
    });
  });

  describe('billpay.payees.enroll', () => {
    it('should require billerId and accountNumber', () => {
      expect(() => validateParams('billpay.payees.enroll', {})).toThrow(ValidationError);
    });

    it('should accept valid enrollment', () => {
      const result = validateParams('billpay.payees.enroll', {
        billerId: 'biller-1',
        accountNumber: '1234567890',
        nickname: 'Electric',
      });
      expect(result.billerId).toBe('biller-1');
    });
  });

  describe('billpay.payments.schedule', () => {
    it('should require positive amountCents', () => {
      expect(() => validateParams('billpay.payments.schedule', {
        payeeId: 'p1', fromAccountId: 'a1', amountCents: 0, scheduledDate: '2026-04-01',
      })).toThrow(ValidationError);
    });

    it('should accept valid payment', () => {
      const result = validateParams('billpay.payments.schedule', {
        payeeId: 'p1', fromAccountId: 'a1', amountCents: 5000, scheduledDate: '2026-04-01',
      });
      expect(result.amountCents).toBe(5000);
    });
  });

  // -------------------------------------------------------------------------
  // Financial Data
  // -------------------------------------------------------------------------
  describe('financial.enrich', () => {
    it('should require at least one transaction', () => {
      expect(() => validateParams('financial.enrich', { transactions: [] })).toThrow(ValidationError);
    });

    it('should accept valid transactions', () => {
      const result = validateParams('financial.enrich', {
        transactions: [{
          transactionId: 'txn-1',
          description: 'STARBUCKS #1234',
          amountCents: 550,
          date: '2026-03-14',
          type: 'debit',
        }],
      });
      expect((result.transactions as unknown[]).length).toBe(1);
    });
  });

  describe('financial.budgets.set', () => {
    it('should require positive limitCents', () => {
      expect(() => validateParams('financial.budgets.set', {
        category: 'food_dining', limitCents: -100,
      })).toThrow(ValidationError);
    });

    it('should accept valid budget', () => {
      const result = validateParams('financial.budgets.set', {
        category: 'groceries', limitCents: 50000,
      });
      expect(result.category).toBe('groceries');
      expect(result.limitCents).toBe(50000);
    });
  });

  // -------------------------------------------------------------------------
  // Card Offers
  // -------------------------------------------------------------------------
  describe('offers.activate', () => {
    it('should require offerId and cardId', () => {
      expect(() => validateParams('offers.activate', {})).toThrow(ValidationError);
    });

    it('should accept valid activation', () => {
      const result = validateParams('offers.activate', {
        offerId: 'offer-1', cardId: 'card-1',
      });
      expect(result.offerId).toBe('offer-1');
    });
  });

  // -------------------------------------------------------------------------
  // Locations
  // -------------------------------------------------------------------------
  describe('locations.search', () => {
    it('should require valid coordinates', () => {
      expect(() => validateParams('locations.search', {
        latitude: 100, longitude: 200,
      })).toThrow(ValidationError);
    });

    it('should accept valid search', () => {
      const result = validateParams('locations.search', {
        latitude: 37.7749, longitude: -122.4194,
      });
      expect(result.radiusMiles).toBe(25);
    });
  });

  // -------------------------------------------------------------------------
  // Unknown actions
  // -------------------------------------------------------------------------
  describe('unknown action', () => {
    it('should pass through params for unknown actions', () => {
      const result = validateParams('unknown.action', { foo: 'bar' });
      expect(result.foo).toBe('bar');
    });
  });
});

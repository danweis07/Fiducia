import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProvider = {
  captureException: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
};

vi.mock('@/lib/services', () => ({
  getErrorTracking: vi.fn(() => mockProvider),
}));

import { initSentry, captureError, setUserContext, addBreadcrumb } from '../sentry';
import { getErrorTracking } from '@/lib/services';

describe('sentry compatibility layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initSentry calls getErrorTracking to initialise the provider', () => {
    initSentry();
    expect(getErrorTracking).toHaveBeenCalled();
  });

  it('captureError delegates to provider.captureException', () => {
    const err = new Error('boom');
    const ctx = { extra: 'info' };
    captureError(err, ctx);
    expect(mockProvider.captureException).toHaveBeenCalledWith(err, ctx);
  });

  it('captureError works without context', () => {
    const err = new Error('no ctx');
    captureError(err);
    expect(mockProvider.captureException).toHaveBeenCalledWith(err, undefined);
  });

  it('setUserContext delegates to provider.setUser', () => {
    const user = { id: 'u1', email: 'a@b.com' };
    setUserContext(user);
    expect(mockProvider.setUser).toHaveBeenCalledWith(user);
  });

  it('setUserContext passes null to clear user', () => {
    setUserContext(null);
    expect(mockProvider.setUser).toHaveBeenCalledWith(null);
  });

  it('addBreadcrumb delegates to provider.addBreadcrumb', () => {
    const crumb = { category: 'nav', message: 'clicked', level: 'info' as const };
    addBreadcrumb(crumb);
    expect(mockProvider.addBreadcrumb).toHaveBeenCalledWith(crumb);
  });
});

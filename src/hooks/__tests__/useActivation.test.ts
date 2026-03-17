import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('@/lib/gateway', () => ({
  gateway: {
    activation: {
      config: vi.fn(),
      verifyIdentity: vi.fn(),
      acceptTerms: vi.fn(),
      createCredentials: vi.fn(),
      enrollMFA: vi.fn(),
      verifyMFA: vi.fn(),
      passkeyOptions: vi.fn(),
      registerPasskey: vi.fn(),
      registerDevice: vi.fn(),
      complete: vi.fn(),
      checkTermsStatus: vi.fn(),
      getTerms: vi.fn(),
      createTermsVersion: vi.fn(),
      getTermsAcceptances: vi.fn(),
    },
  },
}));

import {
  useActivationConfig,
  useVerifyIdentity,
  useAcceptTerms,
  useCreateCredentials,
  useEnrollMFA,
  useVerifyMFA,
  useRegisterDevice,
  useCompleteActivation,
  useTermsStatus,
  useTermsDocuments,
  activationKeys,
} from '../useActivation';
import { gateway } from '@/lib/gateway';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('activationKeys', () => {
  it('has correct all key', () => {
    expect(activationKeys.all).toEqual(['activation']);
  });

  it('has correct config key', () => {
    expect(activationKeys.config()).toEqual(['activation', 'config']);
  });

  it('has correct termsStatus key', () => {
    expect(activationKeys.termsStatus()).toEqual(['activation', 'terms-status']);
  });

  it('has correct terms key with type', () => {
    expect(activationKeys.terms('disclosure')).toEqual(['activation', 'terms', 'disclosure']);
  });
});

describe('useActivationConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches activation config', async () => {
    vi.mocked(gateway.activation.config).mockResolvedValue({
      steps: ['identity', 'terms', 'credentials', 'mfa', 'device'],
      requiredFields: ['memberNumber', 'ssn', 'dateOfBirth'],
      mfaMethods: ['sms', 'email', 'totp'],
    } as never);

    const { result } = renderHook(() => useActivationConfig(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });

  it('handles error', async () => {
    vi.mocked(gateway.activation.config).mockRejectedValue(new Error('Config not available'));

    const { result } = renderHook(() => useActivationConfig(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useVerifyIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies identity successfully', async () => {
    vi.mocked(gateway.activation.verifyIdentity).mockResolvedValue({
      verified: true,
      activationToken: 'tok_abc123',
      memberName: 'John Doe',
    } as never);

    const { result } = renderHook(() => useVerifyIdentity(), { wrapper: createWrapper() });

    await act(async () => {
      const response = await result.current.mutateAsync({
        memberNumber: '12345',
        ssn: '123-45-6789',
        dateOfBirth: '1990-01-15',
      } as never);
      expect(response).toMatchObject({ verified: true });
    });
  });

  it('handles identity verification failure', async () => {
    vi.mocked(gateway.activation.verifyIdentity).mockResolvedValue({
      verified: false,
      error: 'Member not found',
    } as never);

    const { result } = renderHook(() => useVerifyIdentity(), { wrapper: createWrapper() });

    await act(async () => {
      const response = await result.current.mutateAsync({
        memberNumber: '99999',
        ssn: '000-00-0000',
        dateOfBirth: '2000-01-01',
      } as never);
      expect(response).toMatchObject({ verified: false });
    });
  });

  it('handles network error during verification', async () => {
    vi.mocked(gateway.activation.verifyIdentity).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useVerifyIdentity(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          memberNumber: '12345',
          ssn: '123-45-6789',
          dateOfBirth: '1990-01-15',
        } as never);
      }),
    ).rejects.toThrow('Network error');
  });
});

describe('useAcceptTerms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts terms successfully', async () => {
    vi.mocked(gateway.activation.acceptTerms).mockResolvedValue({
      accepted: true,
      documents: [
        { documentId: 'terms-1', version: '1.0', acceptedAt: '2026-03-14T10:00:00Z' },
      ],
    });

    const { result } = renderHook(() => useAcceptTerms(), { wrapper: createWrapper() });

    await act(async () => {
      const response = await result.current.mutateAsync({
        activationToken: 'tok_abc123',
        acceptances: [{ documentId: 'terms-1', version: '1.0' }],
      });
      expect(response.accepted).toBe(true);
    });
  });

  it('accepts multiple documents', async () => {
    vi.mocked(gateway.activation.acceptTerms).mockResolvedValue({
      accepted: true,
      documents: [
        { documentId: 'terms-1', version: '1.0', acceptedAt: '2026-03-14T10:00:00Z' },
        { documentId: 'privacy-1', version: '2.0', acceptedAt: '2026-03-14T10:00:00Z' },
      ],
    });

    const { result } = renderHook(() => useAcceptTerms(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        activationToken: 'tok_abc123',
        acceptances: [
          { documentId: 'terms-1', version: '1.0' },
          { documentId: 'privacy-1', version: '2.0' },
        ],
      });
    });

    expect(gateway.activation.acceptTerms).toHaveBeenCalledWith(
      expect.objectContaining({
        acceptances: expect.arrayContaining([
          { documentId: 'terms-1', version: '1.0' },
          { documentId: 'privacy-1', version: '2.0' },
        ]),
      }),
    );
  });
});

describe('useCreateCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates credentials successfully', async () => {
    vi.mocked(gateway.activation.createCredentials).mockResolvedValue({
      success: true,
      userId: 'user-123',
    } as never);

    const { result } = renderHook(() => useCreateCredentials(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        activationToken: 'tok_abc123',
        username: 'johndoe',
        password: 'SecureP@ss1!',
      } as never);
    });

    expect(gateway.activation.createCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'johndoe' }),
    );
  });

  it('handles weak password rejection', async () => {
    vi.mocked(gateway.activation.createCredentials).mockRejectedValue(
      new Error('Password does not meet complexity requirements'),
    );

    const { result } = renderHook(() => useCreateCredentials(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          activationToken: 'tok_abc123',
          username: 'johndoe',
          password: '123',
        } as never);
      }),
    ).rejects.toThrow('Password does not meet complexity requirements');
  });

  it('handles duplicate username', async () => {
    vi.mocked(gateway.activation.createCredentials).mockRejectedValue(
      new Error('Username already taken'),
    );

    const { result } = renderHook(() => useCreateCredentials(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          activationToken: 'tok_abc123',
          username: 'taken_user',
          password: 'SecureP@ss1!',
        } as never);
      }),
    ).rejects.toThrow('Username already taken');
  });
});

describe('useEnrollMFA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enrolls MFA with SMS', async () => {
    vi.mocked(gateway.activation.enrollMFA).mockResolvedValue({
      enrolled: true,
      method: 'sms',
      phoneNumberMasked: '***-***-4567',
    } as never);

    const { result } = renderHook(() => useEnrollMFA(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        activationToken: 'tok_abc123',
        method: 'sms',
      } as never);
    });

    expect(gateway.activation.enrollMFA).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'sms' }),
    );
  });

  it('enrolls MFA with TOTP', async () => {
    vi.mocked(gateway.activation.enrollMFA).mockResolvedValue({
      enrolled: true,
      method: 'totp',
      totpSecret: 'JBSWY3DPEHPK3PXP',
      totpUri: 'otpauth://totp/Bank:user@example.com?secret=JBSWY3DPEHPK3PXP',
    } as never);

    const { result } = renderHook(() => useEnrollMFA(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        activationToken: 'tok_abc123',
        method: 'totp',
      } as never);
    });

    expect(gateway.activation.enrollMFA).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'totp' }),
    );
  });
});

describe('useVerifyMFA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies MFA code', async () => {
    vi.mocked(gateway.activation.verifyMFA).mockResolvedValue({
      verified: true,
    } as never);

    const { result } = renderHook(() => useVerifyMFA(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        activationToken: 'tok_abc123',
        code: '123456',
      } as never);
    });

    expect(gateway.activation.verifyMFA).toHaveBeenCalledWith(
      expect.objectContaining({ code: '123456' }),
    );
  });

  it('handles invalid MFA code', async () => {
    vi.mocked(gateway.activation.verifyMFA).mockRejectedValue(new Error('Invalid code'));

    const { result } = renderHook(() => useVerifyMFA(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          activationToken: 'tok_abc123',
          code: '000000',
        } as never);
      }),
    ).rejects.toThrow('Invalid code');
  });
});

describe('useRegisterDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a device', async () => {
    vi.mocked(gateway.activation.registerDevice).mockResolvedValue({
      registered: true,
      deviceId: 'dev-123',
    } as never);

    const { result } = renderHook(() => useRegisterDevice(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        activationToken: 'tok_abc123',
        deviceFingerprint: 'fp_abc',
        deviceName: 'Chrome on MacOS',
      } as never);
    });

    expect(gateway.activation.registerDevice).toHaveBeenCalled();
  });
});

describe('useCompleteActivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes the activation flow', async () => {
    vi.mocked(gateway.activation.complete).mockResolvedValue({
      status: 'completed',
      message: 'Welcome to online banking!',
    });

    const { result } = renderHook(() => useCompleteActivation(), { wrapper: createWrapper() });

    await act(async () => {
      const response = await result.current.mutateAsync('tok_abc123');
      expect(response.status).toBe('completed');
    });

    expect(gateway.activation.complete).toHaveBeenCalledWith('tok_abc123');
  });

  it('handles completion failure', async () => {
    vi.mocked(gateway.activation.complete).mockRejectedValue(
      new Error('Activation already completed'),
    );

    const { result } = renderHook(() => useCompleteActivation(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync('tok_expired');
      }),
    ).rejects.toThrow('Activation already completed');
  });
});

describe('useTermsStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches terms status - up to date', async () => {
    vi.mocked(gateway.activation.checkTermsStatus).mockResolvedValue({
      upToDate: true,
      pendingDocuments: [],
    });

    const { result } = renderHook(() => useTermsStatus(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.upToDate).toBe(true);
    expect(result.current.data?.pendingDocuments).toHaveLength(0);
  });

  it('fetches terms status - has pending', async () => {
    vi.mocked(gateway.activation.checkTermsStatus).mockResolvedValue({
      upToDate: false,
      pendingDocuments: [
        { documentId: 'terms-2', type: 'terms', title: 'Updated Terms', version: '2.0', mandatory: true, content: '' },
      ],
    } as never);

    const { result } = renderHook(() => useTermsStatus(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.upToDate).toBe(false);
    expect(result.current.data?.pendingDocuments).toHaveLength(1);
  });
});

describe('useTermsDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches terms documents', async () => {
    vi.mocked(gateway.activation.getTerms).mockResolvedValue({
      documents: [
        { documentId: 'terms-1', type: 'terms', title: 'Terms of Service', version: '1.0', mandatory: true, content: '<p>Terms...</p>' },
      ],
    } as never);

    const { result } = renderHook(() => useTermsDocuments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.documents).toHaveLength(1);
  });

  it('fetches terms by type', async () => {
    vi.mocked(gateway.activation.getTerms).mockResolvedValue({ documents: [] } as never);

    const { result } = renderHook(() => useTermsDocuments('disclosure'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.activation.getTerms).toHaveBeenCalledWith({ type: 'disclosure' });
  });
});
